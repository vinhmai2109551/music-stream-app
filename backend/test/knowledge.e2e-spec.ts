import { execFile } from "node:child_process"
import { mkdtemp, rm, unlink, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import { startTestServer, type TestServer } from "./helpers/test-server.js"

const run = promisify(execFile)
const MODEL = "hashing-v1"
const START_TIMEOUT_MS = 60_000
const CLI_TIMEOUT_MS = 240_000

interface Chunk {
  id: string
  source: string
  heading: string
  position: number
  content: string
  model: string
  dims: number
}

const PREMIUM =
  "# Gói\n\nCó ba gói Premium: Premium, Duo và Family.\n\n# Huỷ\n\nChưa có cách huỷ gói."
const PLAYBACK = "# Nguồn phát\n\nBài hát phát từ YouTube hoặc từ tệp âm thanh."

describe("Help texts for the assistant (e2e)", () => {
  let server: TestServer
  let dir: string

  const embed = (env: NodeJS.ProcessEnv = {}, args: string[] = []) =>
    run(process.execPath, ["dist/modules/embeddings/cli.js", ...args], {
      env: { ...server.env, KNOWLEDGE_DIR: dir, ...env },
      timeout: CLI_TIMEOUT_MS,
    })
  const chunks = () =>
    server.db.rows<Chunk>(
      `SELECT id, source, heading, position, content, model, vector_dims(embedding) AS dims
       FROM "KnowledgeChunk" WHERE source LIKE 'e2e-%' ORDER BY source, position`,
    )
  const write = (name: string, text: string) => writeFile(path.join(dir, name), text, "utf8")

  beforeAll(async () => {
    server = await startTestServer({ EMBEDDING_PROVIDER: "fake" })
    dir = await mkdtemp(path.join(os.tmpdir(), "knowledge-e2e-"))
    await write("e2e-premium.md", PREMIUM)
    await write("e2e-playback.md", PLAYBACK)
  }, START_TIMEOUT_MS)

  afterAll(async () => {
    await server.db.run(`DELETE FROM "KnowledgeChunk" WHERE source LIKE 'e2e-%'`)
    await server.stop()
    await rm(dir, { recursive: true, force: true })
  })

  it("has the table, with a vector column of 768 numbers and an HNSW cosine index", async () => {
    const index = await server.db.rows<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'KnowledgeChunk_embedding_hnsw'`,
    )

    expect(index).toHaveLength(1)
    expect(index[0].indexdef).toContain("USING hnsw")
    expect(index[0].indexdef).toContain("vector_cosine_ops")
  })

  it(
    "npm run ai:embed turns the files into chunks with vectors",
    async () => {
      const result = await embed()

      expect(result.stdout).toMatch(/Help texts: 3 of 3 chunks made \(2 files\)/)
      expect(await chunks()).toEqual([
        expect.objectContaining({
          id: "e2e-playback.md#0",
          source: "e2e-playback.md",
          heading: "Nguồn phát",
          position: 0,
          content: "Bài hát phát từ YouTube hoặc từ tệp âm thanh.",
          model: MODEL,
          dims: 768,
        }),
        expect.objectContaining({ source: "e2e-premium.md", heading: "Gói", position: 0 }),
        expect.objectContaining({ source: "e2e-premium.md", heading: "Huỷ", position: 1 }),
      ])
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "has nothing to do the second time",
    async () => {
      const result = await embed()

      expect(result.stdout).toMatch(
        /Help texts: 0 of 3 chunks made \(2 files\), 3 up to date, 0 removed/,
      )
      expect(await chunks()).toHaveLength(3)
    },
    CLI_TIMEOUT_MS,
  )

  it("finds the chunk about a question first (nearest vector)", async () => {
    // The question is the text of the chunk about cancelling: its own vector is the nearest.
    const rows = await server.db.rows<{ source: string; heading: string; distance: number }>(
      `SELECT c.source, c.heading, c.embedding <=> q.embedding AS distance
       FROM "KnowledgeChunk" c, "KnowledgeChunk" q
       WHERE q.id = 'e2e-premium.md#1' AND c.source LIKE 'e2e-%'
       ORDER BY c.embedding <=> q.embedding LIMIT 3`,
    )

    expect(rows[0]).toMatchObject({ source: "e2e-premium.md", heading: "Huỷ" })
    expect(rows[0].distance).toBeCloseTo(0)
    expect(rows[1].distance).toBeGreaterThan(0)
  })

  it(
    "makes again only the chunk of a section that was edited",
    async () => {
      await write("e2e-premium.md", PREMIUM.replace("Chưa có cách huỷ gói.", "Đã có cách huỷ gói."))

      const result = await embed()

      expect(result.stdout).toMatch(/1 of 3 chunks made \(2 files\), 2 up to date/)
      expect((await chunks()).find((c) => c.heading === "Huỷ")?.content).toBe("Đã có cách huỷ gói.")
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "deletes the chunks a file lost when it got shorter",
    async () => {
      await write("e2e-premium.md", "# Gói\n\nCó ba gói Premium: Premium, Duo và Family.")

      const result = await embed()

      expect(result.stdout).toMatch(/1 removed/)
      expect((await chunks()).filter((c) => c.source === "e2e-premium.md")).toHaveLength(1)
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "deletes the chunks of a file that was deleted",
    async () => {
      await unlink(path.join(dir, "e2e-playback.md"))

      await embed()

      expect((await chunks()).map((c) => c.source)).toEqual(["e2e-premium.md"])
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "makes every chunk again with --force",
    async () => {
      const result = await embed({}, ["--force"])

      expect(result.stdout).toMatch(/Help texts: 1 of 1 chunks made/)
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "refuses to run on a folder with no help files and keeps what is stored",
    async () => {
      const empty = await mkdtemp(path.join(os.tmpdir(), "knowledge-empty-"))
      try {
        await expect(embed({ KNOWLEDGE_DIR: empty })).rejects.toMatchObject({
          stderr: expect.stringContaining("No help files"),
        })
        expect(await chunks()).toHaveLength(1)
      } finally {
        await rm(empty, { recursive: true, force: true })
      }
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "indexes the real help files of the assistant",
    async () => {
      const result = await embed({ KNOWLEDGE_DIR: path.join("src", "modules", "ai", "knowledge") })

      expect(result.stdout).toMatch(/Help texts: \d+ of \d+ chunks made \(\d+ files\)/)
      const real = await server.db.rows<{ source: string; heading: string; length: number }>(
        `SELECT source, heading, length(content) AS length FROM "KnowledgeChunk"
       WHERE source NOT LIKE 'e2e-%'`,
      )
      expect(real.length).toBeGreaterThan(10)
      expect(real.every((row) => row.heading !== "" && row.length <= 500)).toBe(true)
      expect(new Set(real.map((row) => row.source))).toContain("premium.md")
      // Leave the table as it was: the other specs expect the e2e ones only.
      await server.db.run(`DELETE FROM "KnowledgeChunk" WHERE source NOT LIKE 'e2e-%'`)
    },
    CLI_TIMEOUT_MS,
  )
})
