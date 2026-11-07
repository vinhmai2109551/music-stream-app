import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import { EMBEDDING_DIMENSIONS } from "../src/modules/embeddings/embedding-provider.js"
import { startTestServer, type TestServer } from "./helpers/test-server.js"
import { toVectorParam } from "../src/modules/embeddings/vector-math.js"

/** A vector of the right size with a single 1 at `at` - orthogonal to a vector with its 1 elsewhere. */
const unit = (at: number) =>
  Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) => (index === at ? 1 : 0))

/** Starting the API takes a few seconds, and more on a busy machine. */
const SERVER_START_TIMEOUT_MS = 60_000

describe("pgvector (e2e)", () => {
  let server: TestServer

  beforeAll(async () => {
    server = await startTestServer({ EMBEDDING_PROVIDER: "fake" })
  }, SERVER_START_TIMEOUT_MS)

  afterAll(async () => {
    await server.stop()
  })

  it("is installed by the migrations", async () => {
    const rows = await server.db.rows<{ extname: string }>(
      "SELECT extname FROM pg_extension WHERE extname = 'vector'",
    )

    expect(rows).toEqual([{ extname: "vector" }])
  })

  it("compares vectors passed as query parameters by cosine distance", async () => {
    const rows = await server.db.rows<{ same: number; orthogonal: number; opposite: number }>(
      `SELECT ($1::vector <=> $1::vector) AS same,
              ($1::vector <=> $2::vector) AS orthogonal,
              ($1::vector <=> $3::vector) AS opposite`,
      [
        toVectorParam(unit(0), EMBEDDING_DIMENSIONS),
        toVectorParam(unit(1), EMBEDDING_DIMENSIONS),
        toVectorParam(
          unit(0).map((value) => -value),
          EMBEDDING_DIMENSIONS,
        ),
      ],
    )

    expect(rows[0].same).toBeCloseTo(0)
    expect(rows[0].orthogonal).toBeCloseTo(1)
    expect(rows[0].opposite).toBeCloseTo(2)
  })

  it("keeps a vector column of the project's size and builds an HNSW cosine index on it", async () => {
    await server.db.run("CREATE TEMP TABLE probe (id int PRIMARY KEY, embedding vector(768))")
    await server.db.run(
      "CREATE INDEX probe_embedding ON probe USING hnsw (embedding vector_cosine_ops)",
    )
    await server.db.run("INSERT INTO probe VALUES (1, $1::vector), (2, $2::vector)", [
      toVectorParam(unit(0), EMBEDDING_DIMENSIONS),
      toVectorParam(unit(5), EMBEDDING_DIMENSIONS),
    ])

    const nearest = await server.db.rows<{ id: number }>(
      "SELECT id FROM probe ORDER BY embedding <=> $1::vector LIMIT 1",
      [toVectorParam(unit(5), EMBEDDING_DIMENSIONS)],
    )

    expect(nearest).toEqual([{ id: 2 }])
  })

  it("refuses a vector of the wrong size", async () => {
    await expect(
      server.db.rows("SELECT $1::vector(768)", [toVectorParam([1, 2, 3], 3)]),
    ).rejects.toThrow(/expected 768 dimensions/)
  })

  it(
    "starts the API with the fake provider, with a key-less Gemini setting, and without any",
    async () => {
      // The server above already started with the fake provider; the other two must start as well.
      const withoutKey = await startTestServer({ EMBEDDING_PROVIDER: "gemini" })
      const withNothing = await startTestServer()
      await withoutKey.stop()
      await withNothing.stop()
    },
    SERVER_START_TIMEOUT_MS * 2,
  )
})
