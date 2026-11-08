import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { Logger, ServiceUnavailableException } from "@nestjs/common"
import { contentHash } from "./embedding-text.js"
import { EMBED_BATCH_SIZE, EmbeddingIndexService } from "./embedding-index.service.js"
import type { EmbeddingProvider } from "./embedding-provider.js"
import { EmbeddingsService } from "./embeddings.service.js"
import { EmbeddingServiceError } from "./gemini-embedding.provider.js"
import type {
  CatalogSources,
  EmbeddedKind,
  EmbeddingRow,
  EmbeddingStore,
  StoredEmbedding,
} from "./ports.js"

const MODEL = "test-model"

/** The catalog: ids in order, each with its text. */
function fakeSources(texts: Record<EmbeddedKind, Record<string, string>>) {
  const sources: CatalogSources = {
    texts: async (kind, ids) =>
      new Map(ids.flatMap((id) => (id in texts[kind] ? [[id, texts[kind][id]] as const] : []))),
    ids: async (kind, after, limit) =>
      Object.keys(texts[kind])
        .sort()
        .filter((id) => after === null || id > after)
        .slice(0, limit),
    idsOfArtist: async (artistId) =>
      Object.keys(texts.track).filter((id) => id.startsWith(`${artistId}-`)),
    count: async (kind) => Object.keys(texts[kind]).length,
  }
  return sources
}

/** An in-memory store that remembers every save. */
function fakeStore() {
  const rows: Record<EmbeddedKind, Map<string, StoredEmbedding & { vector: readonly number[] }>> = {
    track: new Map(),
    artist: new Map(),
  }
  const saves: { kind: EmbeddedKind; ids: string[] }[] = []
  const store: EmbeddingStore = {
    stored: async (kind, ids) =>
      new Map(
        ids.flatMap((id) => {
          const row = rows[kind].get(id)
          return row ? [[id, { model: row.model, contentHash: row.contentHash }] as const] : []
        }),
      ),
    save: async (kind, batch: readonly EmbeddingRow[]) => {
      saves.push({ kind, ids: batch.map((row) => row.id) })
      for (const row of batch) rows[kind].set(row.id, row)
    },
    count: async (kind) => rows[kind].size,
    nearest: async () => [],
  }
  return { store, rows, saves }
}

/** A provider whose vector is [text length]; it counts the texts it was asked to embed. */
function fakeProvider(model = MODEL) {
  const embedded: string[] = []
  const embed = jest.fn<EmbeddingProvider["embed"]>(async (texts) => {
    embedded.push(...texts)
    return texts.map((text) => [text.length])
  })
  const provider: EmbeddingProvider = { model, dimensions: 1, embed }
  return { provider, embed, embedded }
}

function setup(
  texts: Record<EmbeddedKind, Record<string, string>>,
  provider: EmbeddingProvider | null = fakeProvider().provider,
) {
  const sources = fakeSources(texts)
  const stores = fakeStore()
  const service = new EmbeddingIndexService(new EmbeddingsService(provider), stores.store, sources)
  return { service, ...stores }
}

beforeEach(() => {
  jest.restoreAllMocks()
  jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
})

describe("EmbeddingIndexService.syncTracks", () => {
  const catalog = {
    artist: {},
    track: { "a-1": "Bài: Một.", "a-2": "Bài: Hai.", "b-1": "Bài: Ba." },
  }

  it("makes and stores a vector, with the model and the hash, for tracks that have none", async () => {
    const { service, rows } = setup(catalog)

    const stats = await service.syncTracks(["a-1", "a-2"])

    expect(stats).toEqual({ embedded: 2, unchanged: 0, gone: 0 })
    expect(rows.track.get("a-1")).toMatchObject({
      vector: ["Bài: Một.".length],
      model: MODEL,
      contentHash: contentHash("Bài: Một.", MODEL),
    })
    expect(rows.track.size).toBe(2)
  })

  it("makes nothing again when the text and model are the same", async () => {
    const { provider, embed } = fakeProvider()
    const { service } = setup(catalog, provider)
    await service.syncTracks(["a-1", "a-2"])
    embed.mockClear()

    const stats = await service.syncTracks(["a-1", "a-2"])

    expect(stats).toEqual({ embedded: 0, unchanged: 2, gone: 0 })
    expect(embed).not.toHaveBeenCalled()
  })

  it("makes a new vector only for the track whose text changed", async () => {
    const texts = { artist: {}, track: { ...catalog.track } }
    const { provider, embedded } = fakeProvider()
    const { service } = setup(texts, provider)
    await service.syncTracks(["a-1", "a-2"])
    embedded.length = 0

    texts.track["a-2"] = "Bài: Hai. Tâm trạng: buồn."
    const stats = await service.syncTracks(["a-1", "a-2"])

    expect(stats).toEqual({ embedded: 1, unchanged: 1, gone: 0 })
    expect(embedded).toEqual(["Bài: Hai. Tâm trạng: buồn."])
  })

  it("makes the vectors again when the model changed", async () => {
    const first = setup(catalog, fakeProvider("model-1").provider)
    await first.service.syncTracks(["a-1"])
    // Same store, other model.
    const second = new EmbeddingIndexService(
      new EmbeddingsService(fakeProvider("model-2").provider),
      first.store,
      fakeSources(catalog),
    )

    const stats = await second.syncTracks(["a-1"])

    expect(stats.embedded).toBe(1)
    expect(first.rows.track.get("a-1")?.model).toBe("model-2")
  })

  it("makes every vector again with force", async () => {
    const { service } = setup(catalog)
    await service.syncTracks(["a-1", "a-2"])

    expect((await service.syncTracks(["a-1", "a-2"], { force: true })).embedded).toBe(2)
  })

  it("counts ids that no longer exist and skips them", async () => {
    const { service, rows } = setup(catalog)

    const stats = await service.syncTracks(["a-1", "deleted"])

    expect(stats).toEqual({ embedded: 1, unchanged: 0, gone: 1 })
    expect(rows.track.has("deleted")).toBe(false)
  })

  it("looks at an id once however many times it is given", async () => {
    const { provider, embedded } = fakeProvider()
    const { service } = setup(catalog, provider)

    await service.syncTracks(["a-1", "a-1", "a-1"])

    expect(embedded).toHaveLength(1)
  })

  it("does nothing, and asks nobody, for an empty list", async () => {
    const { provider, embed } = fakeProvider()
    const { service, saves } = setup(catalog, provider)

    expect(await service.syncTracks([])).toEqual({ embedded: 0, unchanged: 0, gone: 0 })
    expect(embed).not.toHaveBeenCalled()
    expect(saves).toEqual([])
  })

  it("embeds in batches of 64", async () => {
    const many = Object.fromEntries(
      Array.from({ length: EMBED_BATCH_SIZE * 2 + 5 }, (_, index) => [
        `t-${String(index).padStart(3, "0")}`,
        `Bài ${index}.`,
      ]),
    )
    const { provider, embed } = fakeProvider()
    const { service, saves } = setup({ artist: {}, track: many }, provider)

    await service.syncTracks(Object.keys(many))

    expect(embed.mock.calls.map((call) => call[0].length)).toEqual([64, 64, 5])
    expect(saves.map((save) => save.ids.length)).toEqual([64, 64, 5])
  })

  it("answers 503 when no provider is set", async () => {
    const { service } = setup(catalog, null)

    await expect(service.syncTracks(["a-1"])).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})

describe("EmbeddingIndexService artists", () => {
  const catalog = {
    artist: { a: "Nghệ sĩ: A.", b: "Nghệ sĩ: B." },
    track: { "a-1": "Bài: Một.", "a-2": "Bài: Hai.", "b-1": "Bài: Ba." },
  }

  it("syncArtists stores artist vectors apart from track vectors", async () => {
    const { service, rows } = setup(catalog)

    await service.syncArtists(["a", "b"])

    expect([...rows.artist.keys()]).toEqual(["a", "b"])
    expect(rows.track.size).toBe(0)
  })

  it("syncTracksOfArtist handles exactly the tracks of that artist", async () => {
    const { service, rows } = setup(catalog)

    const stats = await service.syncTracksOfArtist("a")

    expect(stats.embedded).toBe(2)
    expect([...rows.track.keys()].sort()).toEqual(["a-1", "a-2"])
  })
})

describe("EmbeddingIndexService.backfill", () => {
  const ids = Array.from({ length: 150 }, (_, index) => `t-${String(index).padStart(3, "0")}`)
  const catalog = {
    artist: { a: "Nghệ sĩ: A.", b: "Nghệ sĩ: B." },
    track: Object.fromEntries(ids.map((id) => [id, `Bài ${id}.`])),
  }

  it("brings every artist and track up to date and reports progress", async () => {
    const { service, rows } = setup(catalog)
    const progress: string[] = []

    const report = await service.backfill({
      onProgress: ({ kind, done, total }) => progress.push(`${kind} ${done}/${total}`),
    })

    expect(report.artists).toEqual({ embedded: 2, unchanged: 0, gone: 0 })
    expect(report.tracks.embedded).toBe(150)
    expect(rows.track.size).toBe(150)
    expect(progress).toEqual(["artist 2/2", "track 64/150", "track 128/150", "track 150/150"])
  })

  it("does only the work that is left when run again", async () => {
    const { service } = setup(catalog)
    await service.backfill()

    const second = await service.backfill()

    expect(second.tracks).toEqual({ embedded: 0, unchanged: 150, gone: 0 })
    expect(second.artists).toEqual({ embedded: 0, unchanged: 2, gone: 0 })
  })

  it("waits out a busy embedding service and goes on", async () => {
    const { provider, embed } = fakeProvider()
    embed
      .mockRejectedValueOnce(new EmbeddingServiceError("busy", 429))
      .mockRejectedValueOnce(new EmbeddingServiceError("busy", 503))
    const { service, rows } = setup(catalog, provider)
    const waits: number[] = []

    await service.backfill({ sleep: async (ms) => void waits.push(ms), onRetry: () => undefined })

    expect(waits).toEqual([1000, 2000])
    expect(rows.track.size).toBe(150)
    expect(rows.artist.size).toBe(2)
  })

  it("gives up with an error when the service stays down", async () => {
    const { provider, embed } = fakeProvider()
    embed.mockRejectedValue(new EmbeddingServiceError("down", 500))
    const { service } = setup(catalog, provider)

    await expect(service.backfill({ sleep: async () => undefined })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
    expect(embed).toHaveBeenCalledTimes(5)
  })

  it("refuses to start without a provider", async () => {
    const { service } = setup(catalog, null)

    await expect(service.backfill()).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
