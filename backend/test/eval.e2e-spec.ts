import { execFile } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import {
  startTestServer,
  TEST_NAME_PREFIX,
  uniqueEmail,
  type TestServer,
} from "./helpers/test-server.js"

const run = promisify(execFile)
const MEDIA = "https://media.example.com"
const START_TIMEOUT_MS = 60_000
const CLI_TIMEOUT_MS = 240_000
const WAIT_MS = 30_000

async function eventually<T>(read: () => Promise<T | undefined>): Promise<T> {
  const deadline = Date.now() + WAIT_MS
  for (;;) {
    const value = await read()
    if (value !== undefined) return value
    if (Date.now() > deadline) throw new Error("Timed out waiting for the embeddings")
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
}

describe("npm run ai:eval (e2e)", () => {
  let server: TestServer
  let dir: string
  let rainId: string
  let gymId: string
  const queriesFile = () => path.join(dir, "queries.json")
  const outFile = () => path.join(dir, "results.md")

  const evaluate = (args: string[] = [], env: NodeJS.ProcessEnv = {}) =>
    run(
      process.execPath,
      ["dist/modules/search/eval/cli.js", "--queries", queriesFile(), "--out", outFile(), ...args],
      { env: { ...server.env, ...env }, timeout: CLI_TIMEOUT_MS },
    )
  const writeQueries = (queries: object[]) =>
    writeFile(queriesFile(), JSON.stringify({ version: 1, queries }), "utf8")

  beforeAll(async () => {
    server = await startTestServer({ EMBEDDING_PROVIDER: "fake" })
    dir = await mkdtemp(path.join(os.tmpdir(), "eval-e2e-"))

    const credentials = { email: uniqueEmail(), name: "Eval tester", password: "password123" }
    await request(server.url).post("/api/auth/register").send(credentials).expect(201)
    await server.db.run(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [credentials.email])
    const login = await request(server.url)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password })
      .expect(200)
    const auth = { Authorization: `Bearer ${(login.body as { accessToken: string }).accessToken}` }

    const artist = (
      await request(server.url)
        .post("/api/artists")
        .set(auth)
        .send({ name: `${TEST_NAME_PREFIX}Eval artist`, imageUrl: `${MEDIA}/a.jpg` })
        .expect(201)
    ).body as { id: string }
    const track = async (title: string, description: string) =>
      (
        (
          await request(server.url)
            .post("/api/tracks")
            .set(auth)
            .send({
              title,
              artistId: artist.id,
              coverUrl: `${MEDIA}/c.jpg`,
              youtubeVideoId: "Llw9Q6akRo4",
              durationSec: 200,
              description,
            })
            .expect(201)
        ).body as { id: string }
      ).id
    rainId = await track("Mưa Eval", "Nhạc buồn ngày mưa nhẹ nhàng, hợp nghe một mình.")
    gymId = await track("Gym Eval", "Nhạc tập gym sôi động, nhịp mạnh, nhiều năng lượng.")
    for (const id of [rainId, gymId]) {
      await eventually(async () =>
        (await server.db.rows(`SELECT 1 FROM "TrackEmbedding" WHERE "trackId" = $1`, [id])).length >
        0
          ? true
          : undefined,
      )
    }
  }, START_TIMEOUT_MS * 2)

  afterAll(async () => {
    await server.stop()
    await rm(dir, { recursive: true, force: true })
  })

  const rainQueries = () => [
    { id: "t", kind: "title", q: "mưa eval", relevant: [rainId] },
    { id: "m", kind: "mood", q: "nhạc buồn ngày mưa", relevant: [rainId] },
    { id: "g", kind: "occasion", q: "nhạc tập gym", relevant: [gymId] },
  ]

  it(
    "refuses to run without an embedding provider",
    async () => {
      await writeQueries(rainQueries())

      await expect(evaluate([], { EMBEDDING_PROVIDER: "" })).rejects.toMatchObject({
        stderr: expect.stringContaining("No embedding provider"),
      })
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "refuses the offline stand-in unless told to use it",
    async () => {
      await writeQueries(rainQueries())

      await expect(evaluate()).rejects.toMatchObject({
        stderr: expect.stringContaining("offline stand-in"),
      })
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "refuses a queries file that names tracks the database does not have",
    async () => {
      await writeQueries([{ id: "x", kind: "title", q: "x", relevant: ["no-such-track"] }])

      await expect(evaluate(["--allow-fake"])).rejects.toMatchObject({
        stderr: expect.stringContaining("no-such-track"),
      })
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "refuses a queries file with a mistake in it",
    async () => {
      await writeQueries([{ id: "x", kind: "title", q: "x", relevant: [] }])

      await expect(evaluate(["--allow-fake"])).rejects.toMatchObject({
        stderr: expect.stringContaining("relevant must list at least one track"),
      })
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "scores the three searches and writes the report",
    async () => {
      await writeQueries(rainQueries())

      const result = await evaluate(["--allow-fake"])

      for (const mode of ["keyword", "vector", "hybrid"]) {
        expect(result.stdout).toMatch(new RegExp(`${mode}\\s+Recall@10 [01]\\.\\d{3}\\s+MRR`))
      }
      const report = await readFile(outFile(), "utf8")
      expect(report).toContain("# Search evaluation")
      expect(report).toContain("`hashing-v1`")
      expect(report).toContain("mưa eval")
      expect(report).toContain("nhạc tập gym")
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "marks a report made with the offline stand-in as not to be quoted",
    async () => {
      await writeQueries(rainQueries())

      await evaluate(["--allow-fake"])

      expect(await readFile(outFile(), "utf8")).toContain(
        "> **Do not quote these numbers:** the vectors are made by the offline stand-in",
      )
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "finds a title by words and a mood by meaning",
    async () => {
      await writeQueries([{ id: "t", kind: "title", q: "mưa eval", relevant: [rainId] }])
      const title = await evaluate(["--allow-fake"])
      // Words find a title.
      expect(title.stdout).toMatch(/keyword\s+Recall@10 1\.000\s+MRR 1\.000/)
      expect(title.stdout).toMatch(/hybrid\s+Recall@10 1\.000\s+MRR 1\.000/)

      // The mood shares no word with the title: only the description of the track answers it.
      await writeQueries([{ id: "m", kind: "mood", q: "nhạc buồn ngày mưa", relevant: [rainId] }])
      const mood = await evaluate(["--allow-fake"])
      expect(mood.stdout).toMatch(/keyword\s+Recall@10 0\.000\s+MRR 0\.000/)
      expect(mood.stdout).toMatch(/vector\s+Recall@10 1\.000\s+MRR 1\.000/)
      expect(mood.stdout).toMatch(/hybrid\s+Recall@10 1\.000\s+MRR 1\.000/)
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "says what is missing when a flag has no value",
    async () => {
      await writeQueries(rainQueries())

      await expect(
        run(
          process.execPath,
          ["dist/modules/search/eval/cli.js", "--queries", queriesFile(), "--out", "--allow-fake"],
          { env: server.env, timeout: CLI_TIMEOUT_MS },
        ),
      ).rejects.toMatchObject({
        stderr: expect.stringContaining("--out needs a value"),
      })
    },
    CLI_TIMEOUT_MS,
  )

  it(
    "refuses to run when the vectors were made by another model",
    async () => {
      await writeQueries(rainQueries())
      await server.db.run(
        `UPDATE "TrackEmbedding" SET model = 'older-model' WHERE "trackId" = $1`,
        [rainId],
      )
      try {
        await expect(evaluate(["--allow-fake"])).rejects.toMatchObject({
          stderr: expect.stringContaining("have a vector made by hashing-v1"),
        })
        // With nothing at all made by this model, there is nothing to measure.
        await server.db.run(`UPDATE "TrackEmbedding" SET model = 'older-model'`)
        await expect(evaluate(["--allow-fake", "--allow-partial"])).rejects.toMatchObject({
          stderr: expect.stringContaining("No track has a vector made by hashing-v1"),
        })
      } finally {
        await server.db.run(`UPDATE "TrackEmbedding" SET model = 'hashing-v1'`)
      }
    },
    CLI_TIMEOUT_MS,
  )
})
