import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "@jest/globals"

const MIGRATIONS = path.join(process.cwd(), "prisma", "migrations")

/** The SQL of every migration, without comment lines, by migration name. */
function migrations(): Map<string, string> {
  return new Map(
    readdirSync(MIGRATIONS, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const sql = readFileSync(path.join(MIGRATIONS, entry.name, "migration.sql"), "utf8")
        return [entry.name, sql.replace(/^\s*--.*$/gm, "")] as const
      }),
  )
}

describe("the migrations", () => {
  it("never drop an HNSW index: Prisma cannot express them, so it proposes to drop them", () => {
    const dropping = [...migrations()]
      .filter(([, sql]) => /DROP\s+INDEX[^;]*_hnsw/i.test(sql))
      .map(([name]) => name)

    expect(dropping).toEqual([])
  })

  it("create an HNSW cosine index for the vectors of tracks and of artists", () => {
    const all = [...migrations().values()].join("\n")

    expect(all).toMatch(
      /CREATE INDEX "TrackEmbedding_embedding_hnsw" ON "TrackEmbedding" USING hnsw \("embedding" vector_cosine_ops\)/,
    )
    expect(all).toMatch(
      /CREATE INDEX "ArtistEmbedding_embedding_hnsw" ON "ArtistEmbedding" USING hnsw \("embedding" vector_cosine_ops\)/,
    )
  })

  it("create an HNSW cosine index for the vectors of the help texts", () => {
    const all = [...migrations().values()].join("\n")

    expect(all).toMatch(
      /CREATE INDEX "KnowledgeChunk_embedding_hnsw" ON "KnowledgeChunk" USING hnsw \("embedding" vector_cosine_ops\)/,
    )
  })

  it("enable the vector extension before anything uses it", () => {
    const names = [...migrations().keys()].sort()
    const extension = names.find((name) =>
      migrations().get(name)?.includes("CREATE EXTENSION IF NOT EXISTS vector"),
    )
    const firstUse = names.find((name) => /vector\(\d+\)/.test(migrations().get(name) ?? ""))

    expect(extension).toBeDefined()
    expect(firstUse).toBeDefined()
    expect(extension! < firstUse!).toBe(true)
  })

  it("are all folders with a migration.sql, in a lock file that names PostgreSQL", () => {
    expect(readFileSync(path.join(MIGRATIONS, "migration_lock.toml"), "utf8")).toMatch(
      /provider = "postgresql"/,
    )
    expect(migrations().size).toBeGreaterThan(0)
  })
})
