import { describe, expect, it } from "@jest/globals"
import type { ApiAlbum, ApiArtist, ApiComment, ApiCommentThread, ApiPlaylist } from "@/api/types"
import { colors } from "@/theme"
import { buildThread, mergeReplies, uniqueById } from "@/utils/commentThreads"
import { toChartItem, toSuggestion } from "@/utils/homeMappers"
import { buildSuggestions } from "@/utils/searchSuggestions"
import { ytTrack } from "../helpers/playback"

const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString()

function comment(id: string, minute: number, parentId: string | null = null): ApiComment {
  return {
    id,
    user: null,
    text: id,
    createdAt: at(minute),
    likesCount: 0,
    liked: false,
    parentId,
    trackId: "t",
    postId: null,
  }
}

const thread = (replies: ApiComment[], repliesCount = replies.length): ApiCommentThread => ({
  ...comment("root", 0),
  replies,
  repliesCount,
})

describe("uniqueById", () => {
  it("keeps the first of every id and the order", () => {
    const items = [
      { id: "a", n: 1 },
      { id: "b", n: 2 },
      { id: "a", n: 3 },
    ]

    expect(uniqueById(items)).toEqual([
      { id: "a", n: 1 },
      { id: "b", n: 2 },
    ])
  })
})

describe("mergeReplies", () => {
  it("joins lists, drops duplicates and puts the oldest first", () => {
    const merged = mergeReplies(
      [comment("r3", 3), comment("r4", 4)],
      [comment("r1", 1), comment("r3", 3)],
    )

    expect(merged.map((reply) => reply.id)).toEqual(["r1", "r3", "r4"])
  })

  it("orders replies written in the same minute by id", () => {
    const merged = mergeReplies([comment("b", 5), comment("a", 5)])

    expect(merged.map((reply) => reply.id)).toEqual(["a", "b"])
  })

  it("does not change the lists it is given", () => {
    const list = [comment("r2", 2), comment("r1", 1)]
    mergeReplies(list)

    expect(list.map((reply) => reply.id)).toEqual(["r2", "r1"])
  })
})

describe("buildThread", () => {
  const preview = [comment("r3", 3, "root"), comment("r4", 4, "root"), comment("r5", 5, "root")]

  it("shows the replies that came with the comment and how many are hidden", () => {
    const built = buildThread(thread(preview, 5), [], 0, false)

    expect(built.replies.map((reply) => reply.id)).toEqual(["r3", "r4", "r5"])
    expect(built.hiddenReplies).toBe(2)
  })

  it("takes the replies out of the comment itself", () => {
    const built = buildThread(thread(preview, 5), [], 0, false)

    expect("replies" in built.comment).toBe(false)
    expect("repliesCount" in built.comment).toBe(false)
    expect(built.comment.id).toBe("root")
  })

  it("adds loaded older replies in order and hides fewer", () => {
    const built = buildThread(thread(preview, 5), [comment("r2", 2, "root")], 0, false)

    expect(built.replies.map((reply) => reply.id)).toEqual(["r2", "r3", "r4", "r5"])
    expect(built.hiddenReplies).toBe(1)
  })

  it("counts replies written on this screen on top of the server's count", () => {
    const mine = comment("mine", 9, "root")
    const built = buildThread(thread(preview, 5), [mine], 1, false)

    expect(built.replies.map((reply) => reply.id)).toEqual(["r3", "r4", "r5", "mine"])
    expect(built.hiddenReplies).toBe(2) // 6 in all, 4 shown
  })

  it("hides nothing once the server has no older replies left", () => {
    const built = buildThread(thread(preview, 9), [], 0, true)

    expect(built.hiddenReplies).toBe(0)
  })

  it("never reports a negative number", () => {
    expect(buildThread(thread(preview, 1), [], 0, false).hiddenReplies).toBe(0)
  })
})

describe("buildSuggestions", () => {
  const artists = [{ name: "Sơn Tùng M-TP" }, { name: "Jack" }] as Pick<ApiArtist, "name">[]
  const tracks = [{ title: "Jackpot" }, { title: "Chạy ngay đi" }, { title: "Jack" }] as {
    title: string
  }[]
  const albums = [{ title: "Jack Hits" }] as Pick<ApiAlbum, "title">[]

  it("offers artists first, then songs, then albums, without repeats", () => {
    expect(buildSuggestions("jack", artists, tracks, albums)).toEqual([
      "Jack",
      "Jackpot",
      "Jack Hits",
    ])
  })

  it("ignores case and surrounding spaces", () => {
    expect(buildSuggestions("  SƠN ", artists, tracks, albums)).toEqual(["Sơn Tùng M-TP"])
  })

  it("offers nothing for an empty query or no match", () => {
    expect(buildSuggestions("   ", artists, tracks, albums)).toEqual([])
    expect(buildSuggestions("zzz", artists, tracks, albums)).toEqual([])
  })

  it("stops at the limit", () => {
    expect(buildSuggestions("jack", artists, tracks, albums, 2)).toEqual(["Jack", "Jackpot"])
  })
})

describe("home mappers", () => {
  const playlist = (name: string): ApiPlaylist =>
    ({ id: "p1", name, description: "Daily hits" }) as ApiPlaylist

  it("splits a chart name into its title and its place", () => {
    expect(toChartItem(playlist("Top 50 – Canada"), 0)).toMatchObject({
      id: "p1",
      title: "Top 50",
      country: "Canada",
      description: "Daily hits",
    })
    expect(toChartItem(playlist("Top 50 - Vietnam"), 0)).toMatchObject({
      title: "Top 50",
      country: "Vietnam",
    })
  })

  it("keeps a name without a place whole", () => {
    expect(toChartItem(playlist("Chill"), 0)).toMatchObject({ title: "Chill", country: "" })
  })

  it("repeats the gradients in order", () => {
    const gradients = Object.values(colors.chartGradients)

    expect(toChartItem(playlist("A"), 0).gradient).toBe(gradients[0])
    expect(toChartItem(playlist("A"), gradients.length).gradient).toBe(gradients[0])
    expect(toChartItem(playlist("A"), 1).gradient).toBe(gradients[1 % gradients.length])
  })

  it("turns a track into a suggestion card", () => {
    const track = ytTrack("a")

    expect(toSuggestion(track)).toEqual({
      id: "a",
      title: "Title a",
      subtitle: "Artist",
      image: "cover.jpg",
      trackId: "a",
      youtubeVideoId: "vid-a",
    })
  })
})
