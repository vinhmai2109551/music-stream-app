import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { Logger, ServiceUnavailableException } from "@nestjs/common"
import type { EmbeddingProvider } from "./embedding-provider.js"
import { EMBED_BATCH_SIZE } from "./embedding-index.service.js"
import { contentHash } from "./embedding-text.js"
import { EmbeddingsService } from "./embeddings.service.js"
import { EmbeddingServiceError } from "./gemini-embedding.provider.js"
import { KnowledgeIndexService, knowledgeEmbeddingText } from "./knowledge-index.service.js"
import { KnowledgeService } from "./knowledge.service.js"
import type { KnowledgeFile, KnowledgeHit, KnowledgeRow, KnowledgeStore } from "./ports.js"

const MODEL = "test-model"

/** An in-memory store of chunks, by "source#position". */
function fakeStore() {
  const rows = new Map<string, KnowledgeRow>()
  const key = (source: string, position: number) => `${source}#${position}`
  const store: KnowledgeStore = {
    stored: async (source) =>
      new Map(
        [...rows.values()]
          .filter((row) => row.source === source)
          .map((row) => [row.position, { model: row.model, contentHash: row.contentHash }]),
      ),
    save: async (batch) => {
      for (const row of batch) rows.set(key(row.source, row.position), row)
    },
    deleteFrom: async (source, from) => {
      const doomed = [...rows.values()].filter((r) => r.source === source && r.position >= from)
      for (const row of doomed) rows.delete(key(row.source, row.position))
      return doomed.length
    },
    deleteSourcesNotIn: async (sources) => {
      const doomed = [...rows.values()].filter((r) => !sources.includes(r.source))
      for (const row of doomed) rows.delete(key(row.source, row.position))
      return doomed.length
    },
    nearest: async (vector, limit, model) =>
      [...rows.values()]
        .filter((row) => row.model === model)
        .map((row): KnowledgeHit => ({ ...row, distance: Math.abs(row.vector[0] - vector[0]) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit),
    count: async () => rows.size,
  }
  return { store, rows }
}

/** A provider whose vector is [text length]; it remembers every text it embedded. */
function fakeProvider(model = MODEL) {
  const embedded: string[] = []
  const embed = jest.fn<EmbeddingProvider["embed"]>(async (texts) => {
    embedded.push(...texts)
    return texts.map((text) => [text.length])
  })
  const provider: EmbeddingProvider = { model, dimensions: 1, embed }
  return { provider, embed, embedded }
}

const file = (name: string, text: string): KnowledgeFile => ({ name, text })

function setup(
  files: KnowledgeFile[],
  provider: EmbeddingProvider | null = fakeProvider().provider,
) {
  const state = { files }
  const { store, rows } = fakeStore()
  const embeddings = new EmbeddingsService(provider)
  const index = new KnowledgeIndexService(embeddings, store, async () => state.files)
  return { index, state, store, rows, embeddings }
}

const noSleep = async () => undefined

beforeEach(() => {
  jest.restoreAllMocks()
  jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
})

const PREMIUM = file("premium.md", "# Gói\n\nBa gói.\n\n# Huỷ\n\nChưa có cách huỷ.")
const PLAYBACK = file("playback.md", "# Nguồn\n\nYouTube hoặc tệp.")

describe("KnowledgeIndexService.sync", () => {
  it("embeds every chunk and stores it with its source, heading, position, model and hash", async () => {
    const { index, rows } = setup([PREMIUM])

    const stats = await index.sync()

    expect(stats).toEqual({ files: 1, chunks: 2, embedded: 2, unchanged: 0, removed: 0 })
    const text = knowledgeEmbeddingText({ heading: "Gói", content: "Ba gói." })
    expect(rows.get("premium.md#0")).toMatchObject({
      source: "premium.md",
      heading: "Gói",
      position: 0,
      content: "Ba gói.",
      model: MODEL,
      contentHash: contentHash(text, MODEL),
      vector: [text.length],
    })
    expect(rows.size).toBe(2)
  })

  it("puts the heading in the text that is embedded", async () => {
    const { provider, embedded } = fakeProvider()
    const { index } = setup([PREMIUM], provider)

    await index.sync()

    expect(embedded).toEqual(["Gói\nBa gói.", "Huỷ\nChưa có cách huỷ."])
  })

  it("makes nothing again when the files did not change", async () => {
    const { provider, embed } = fakeProvider()
    const { index } = setup([PREMIUM, PLAYBACK], provider)
    await index.sync()
    embed.mockClear()

    const stats = await index.sync()

    expect(stats).toEqual({ files: 2, chunks: 3, embedded: 0, unchanged: 3, removed: 0 })
    expect(embed).not.toHaveBeenCalled()
  })

  it("makes only the chunk whose text changed", async () => {
    const { provider, embedded } = fakeProvider()
    const { index, state } = setup([PREMIUM], provider)
    await index.sync()
    embedded.length = 0

    state.files = [file("premium.md", "# Gói\n\nBa gói.\n\n# Huỷ\n\nBây giờ có thể huỷ.")]
    const stats = await index.sync()

    expect(stats).toMatchObject({ embedded: 1, unchanged: 1 })
    expect(embedded).toEqual(["Huỷ\nBây giờ có thể huỷ."])
  })

  it("makes every chunk again with force", async () => {
    const { index } = setup([PREMIUM])
    await index.sync()

    expect(await index.sync({ force: true })).toMatchObject({ embedded: 2, unchanged: 0 })
  })

  it("makes every chunk again when the model changed", async () => {
    const { store, rows } = fakeStore()
    const first = new KnowledgeIndexService(
      new EmbeddingsService(fakeProvider("model-a").provider),
      store,
      async () => [PREMIUM],
    )
    await first.sync()
    const second = new KnowledgeIndexService(
      new EmbeddingsService(fakeProvider("model-b").provider),
      store,
      async () => [PREMIUM],
    )

    const stats = await second.sync()

    expect(stats.embedded).toBe(2)
    expect([...rows.values()].every((row) => row.model === "model-b")).toBe(true)
  })

  it("deletes the chunks a file no longer has when it gets shorter", async () => {
    const { index, state, rows } = setup([PREMIUM])
    await index.sync()

    state.files = [file("premium.md", "# Gói\n\nBa gói.")]
    const stats = await index.sync()

    expect(stats.removed).toBe(1)
    expect([...rows.keys()]).toEqual(["premium.md#0"])
  })

  it("deletes the chunks of a file that was deleted", async () => {
    const { index, state, rows } = setup([PREMIUM, PLAYBACK])
    await index.sync()

    state.files = [PREMIUM]
    const stats = await index.sync()

    expect(stats.removed).toBe(1)
    expect([...rows.values()].some((row) => row.source === "playback.md")).toBe(false)
  })

  it("refuses to run with no files and leaves what is stored alone", async () => {
    const { index, state, rows } = setup([PREMIUM])
    await index.sync()

    state.files = []

    await expect(index.sync()).rejects.toThrow(/No help files/)
    expect(rows.size).toBe(2)
  })

  it("answers 503 without an embedding provider", async () => {
    const { index } = setup([PREMIUM], null)

    await expect(index.sync()).rejects.toBeInstanceOf(ServiceUnavailableException)
  })

  it("waits and tries again when the embedding service is busy", async () => {
    const { provider, embed } = fakeProvider()
    embed.mockRejectedValueOnce(new EmbeddingServiceError("busy", 429))
    const { index } = setup([PREMIUM], provider)
    const delays: number[] = []

    const stats = await index.sync({
      sleep: noSleep,
      onRetry: (_attempt, delayMs) => delays.push(delayMs),
    })

    expect(stats.embedded).toBe(2)
    expect(delays).toEqual([1000])
  })

  it("sends the texts in batches", async () => {
    const many = file(
      "many.md",
      Array.from({ length: EMBED_BATCH_SIZE + 6 }, (_, i) => `# Mục ${i}\n\nNội dung ${i}.`).join(
        "\n\n",
      ),
    )
    const { provider, embed } = fakeProvider()
    const { index } = setup([many], provider)

    const stats = await index.sync()

    expect(stats.embedded).toBe(EMBED_BATCH_SIZE + 6)
    expect(embed.mock.calls.map((call) => call[0].length)).toEqual([EMBED_BATCH_SIZE, 6])
  })
})

describe("KnowledgeService.search", () => {
  it("finds the closest chunks and names their source and heading", async () => {
    const { index, store, embeddings } = setup([PREMIUM, PLAYBACK])
    await index.sync()
    const knowledge = new KnowledgeService(embeddings, store)

    const answers = await knowledge.search("Gói\nBa gói.", 2)

    expect(answers[0]).toMatchObject({ source: "premium.md", heading: "Gói", content: "Ba gói." })
    expect(answers[0].score).toBeCloseTo(1)
    expect(answers).toHaveLength(2)
    expect(answers[0].score).toBeGreaterThanOrEqual(answers[1].score)
  })

  it("keeps the number of answers between 1 and 10", async () => {
    const many = file(
      "many.md",
      Array.from({ length: 15 }, (_, i) => `# Mục ${i}\n\nNội dung ${i}.`).join("\n\n"),
    )
    const { index, store, embeddings } = setup([many])
    await index.sync()
    const knowledge = new KnowledgeService(embeddings, store)

    expect(await knowledge.search("x", 100)).toHaveLength(10)
    expect(await knowledge.search("x", 0)).toHaveLength(1)
    expect(await knowledge.search("x")).toHaveLength(4)
  })

  it("answers 503 without an embedding provider", async () => {
    const { store, embeddings } = setup([PREMIUM], null)

    await expect(new KnowledgeService(embeddings, store).search("gói")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
  })

  it("ignores a blank question and a limit that is not a number", async () => {
    const { index, store, embeddings } = setup([PREMIUM])
    await index.sync()
    const knowledge = new KnowledgeService(embeddings, store)

    expect(await knowledge.search("   ")).toEqual([])
    expect(await knowledge.search("Gói", Number.NaN)).toHaveLength(2)
  })

  it("looks only at chunks made by the model that embeds the question", async () => {
    const { store } = setup([PREMIUM])
    const old = new KnowledgeIndexService(
      new EmbeddingsService(fakeProvider("old-model").provider),
      store,
      async () => [PREMIUM],
    )
    await old.sync()
    const current = new EmbeddingsService(fakeProvider("new-model").provider)

    expect(await new KnowledgeService(current, store).search("Gói")).toEqual([])
  })

  it("never gives a negative score", async () => {
    const store: KnowledgeStore = {
      ...fakeStore().store,
      nearest: async () => [
        { source: "a.md", heading: "A", position: 0, content: "x", distance: 1.7 },
      ],
    }
    const embeddings = new EmbeddingsService(fakeProvider().provider)

    const [answer] = await new KnowledgeService(embeddings, store).search("x")

    expect(answer.score).toBe(0)
  })
})
