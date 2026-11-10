import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import { Logger } from "@nestjs/common"
import { CatalogEvents } from "../../shared/events/catalog-events.js"
import { CatalogSyncListener, SYNC_DEBOUNCE_MS } from "./catalog-sync.listener.js"
import type { EmbeddingIndexService } from "./embedding-index.service.js"
import type { EmbeddingsService } from "./embeddings.service.js"

function setup(enabled = true) {
  const calls: string[] = []
  const index = {
    syncTracks: jest.fn(
      async (ids: readonly string[]) => void calls.push(`tracks ${ids.join(",")}`),
    ),
    syncArtists: jest.fn(
      async (ids: readonly string[]) => void calls.push(`artists ${ids.join(",")}`),
    ),
    syncTracksOfArtist: jest.fn(async (id: string) => void calls.push(`tracks of ${id}`)),
  }
  const events = new CatalogEvents()
  const listener = new CatalogSyncListener(
    events,
    index as unknown as EmbeddingIndexService,
    { enabled } as EmbeddingsService,
  )
  return { events, listener, index, calls }
}

describe("CatalogSyncListener.handle", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("syncs the tracks that changed, once each", async () => {
    const { listener, calls } = setup()

    await listener.handle([
      { kind: "track", id: "t1" },
      { kind: "track", id: "t2" },
      { kind: "track", id: "t1" },
    ])

    expect(calls).toEqual(["tracks t1,t2"])
  })

  it("syncs a changed artist, and then their tracks, whose text includes the artist", async () => {
    const { listener, calls } = setup()

    await listener.handle([
      { kind: "artist", id: "a1" },
      { kind: "track", id: "t9" },
    ])

    expect(calls).toEqual(["artists a1", "tracks of a1", "tracks t9"])
  })

  it("does nothing for an empty batch", async () => {
    const { listener, calls } = setup()

    await listener.handle([])

    expect(calls).toEqual([])
  })

  it("only writes a warning when the embedding service fails, and never throws", async () => {
    const { listener, index } = setup()
    index.syncTracks.mockRejectedValue(new Error("down"))
    const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)

    await expect(listener.handle([{ kind: "track", id: "t1" }])).resolves.toBeUndefined()

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("down"))
  })
})

describe("CatalogSyncListener in the background", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  })
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it("collects changes that come close together and handles them as one batch", async () => {
    const { events, listener, calls } = setup()
    listener.onModuleInit()

    events.changed({ kind: "track", id: "t1" })
    events.changed({ kind: "track", id: "t2" })
    expect(calls).toEqual([])
    await jest.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10)

    expect(calls).toEqual(["tracks t1,t2"])
    listener.onModuleDestroy()
  })

  it("handles a later change as another batch", async () => {
    const { events, listener, calls } = setup()
    listener.onModuleInit()

    events.changed({ kind: "track", id: "t1" })
    await jest.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10)
    events.changed({ kind: "track", id: "t2" })
    await jest.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10)

    expect(calls).toEqual(["tracks t1", "tracks t2"])
    listener.onModuleDestroy()
  })

  it("stays silent when no provider is set", async () => {
    const { events, listener, calls } = setup(false)
    listener.onModuleInit()

    events.changed({ kind: "track", id: "t1" })
    await jest.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS * 2)

    expect(calls).toEqual([])
  })

  it("stops listening when the module is destroyed", async () => {
    const { events, listener, calls } = setup()
    listener.onModuleInit()
    listener.onModuleDestroy()

    events.changed({ kind: "track", id: "t1" })
    await jest.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS * 2)

    expect(calls).toEqual([])
  })
})
