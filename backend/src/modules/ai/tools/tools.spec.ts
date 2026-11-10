import { describe, expect, it } from "@jest/globals"
import { Region } from "../../../generated/prisma/enums.js"
import { TRACK_IDS } from "../testing/fake-tool-ports.js"
import { ME, setup } from "../testing/tool-setup.js"
import { REGIONS } from "./ports.js"

describe("the tools of the assistant", () => {
  it("have unique names, a description and an object schema", () => {
    const { registry } = setup()
    const names = registry.tools.map((tool) => tool.name)

    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual(
      expect.arrayContaining([
        "search_catalog",
        "get_track",
        "get_artist",
        "get_album",
        "get_playlist",
        "get_my_library",
        "recommend_tracks",
        "similar_tracks",
        "search_help",
        "play_tracks",
        "create_playlist",
        "add_tracks_to_playlist",
        "like_tracks",
        "follow_artist",
      ]),
    )
    for (const tool of registry.tools) {
      expect(tool.description.length).toBeGreaterThan(20)
      expect(tool.parameters["type"]).toBe("object")
    }
  })

  it("only let the model PROPOSE changes of the user's data", () => {
    const { registry } = setup()
    const kinds = Object.fromEntries(registry.tools.map((tool) => [tool.name, tool.kind]))

    expect(kinds).toMatchObject({
      create_playlist: "write",
      add_tracks_to_playlist: "write",
      like_tracks: "write",
      follow_artist: "write",
      play_tracks: "client",
      search_catalog: "read",
    })
  })

  it("list the same regions as the catalog", () => {
    expect([...REGIONS].sort()).toEqual(Object.values(Region).sort())
  })

  it("tell the model about every tool, with nothing else in the declaration", () => {
    const { registry } = setup()
    const declared = registry.declarations()

    expect(declared).toHaveLength(registry.tools.length)
    expect(Object.keys(declared[0]).sort()).toEqual(["description", "name", "parameters"])
  })

  it("never take the user from their arguments", () => {
    const { registry } = setup()
    for (const tool of registry.tools) {
      expect(JSON.stringify(tool.parameters)).not.toMatch(/userId/i)
    }
  })
})

describe("ToolRegistry", () => {
  it("tells the model a tool failed without saying why when the failure is not the tool's own", async () => {
    const { registry, mocks } = setup()
    mocks.searchTracks.mockRejectedValueOnce(
      new Error("connection to db:5432 refused, password=hunter2"),
    )

    const { outcome, unexpected } = await registry.runImmediate("search_catalog", ME, {
      query: "x",
    })

    expect(outcome.ok).toBe(false)
    expect(JSON.stringify(outcome.result)).not.toMatch(/hunter2|5432|db/)
    expect((unexpected as Error).message).toContain("hunter2")
  })

  it("puts the cards of a result together, looked up fresh, and leaves out what is gone", async () => {
    const { registry } = setup()

    const display = await registry.hydrate(
      {
        tracks: ["t1", "ghost"],
        artists: ["artist-t1"],
        sources: [{ source: "a.md", heading: "A" }],
      },
      "u1",
    )

    expect(display?.tracks?.map((t) => t.id)).toEqual(["t1"])
    expect(display?.artists?.map((a) => a.id)).toEqual(["artist-t1"])
    expect(display?.sources).toEqual([{ source: "a.md", heading: "A" }])
    expect(display?.albums).toBeUndefined()
  })

  it("gives nothing for no references or references to nothing", async () => {
    const { registry } = setup()

    expect(await registry.hydrate(undefined, "u1")).toBeUndefined()
    expect(await registry.hydrate({ tracks: ["ghost"] }, "u1")).toBeUndefined()
    expect(await registry.hydrate({}, "u1")).toBeUndefined()
    expect(TRACK_IDS).toHaveLength(5)
  })
})
