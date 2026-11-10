import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { renderHook, waitFor } from "@testing-library/react-native"
import { ApiError } from "@/api/client"
import type { ApiTrack } from "@/api/types"
import {
  useBecauseYouListened,
  useForYou,
  useSimilarTracks,
  useTracksByMeaning,
} from "@/hooks/useRecommendations"
import { makeTrack } from "../helpers/playback"

jest.mock("@/api/recommendations", () => ({
  getForYou: jest.fn(),
  getBecauseYouListened: jest.fn(),
  getSimilarTracks: jest.fn(),
  searchTracksByMeaning: jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const api = jest.mocked(require("@/api/recommendations") as typeof import("@/api/recommendations"))
/* eslint-enable @typescript-eslint/no-require-imports */

const track = (id: string): ApiTrack => makeTrack(id)
const unavailable = () =>
  new ApiError({ status: 503, kind: "http", message: "Semantic features are not configured" })

beforeEach(() => {
  jest.clearAllMocks()
})

describe("useForYou", () => {
  it("shows tracks made from the taste of the user", async () => {
    api.getForYou.mockResolvedValue({ strategy: "taste", items: [track("a")] })
    const { result } = await renderHook(() => useForYou(null))

    await waitFor(() => expect(result.current.status).toBe("ready"))
    expect(result.current).toEqual({ status: "ready", items: [track("a")] })
    expect(api.getForYou).toHaveBeenCalledWith(null, 10)
  })

  it("hides the popular tracks of a new user: Home already shows those", async () => {
    api.getForYou.mockResolvedValue({ strategy: "popular", items: [track("a")] })
    const { result } = await renderHook(() => useForYou("KOREA"))

    await waitFor(() => expect(result.current.status).toBe("hidden"))
    expect(api.getForYou).toHaveBeenCalledWith("KOREA", 10)
  })

  it("hides itself when the request fails", async () => {
    api.getForYou.mockRejectedValue(unavailable())
    const { result } = await renderHook(() => useForYou(null))

    await waitFor(() => expect(result.current.status).toBe("hidden"))
  })
})

describe("useBecauseYouListened", () => {
  it("gives the track it is based on with the tracks like it", async () => {
    api.getBecauseYouListened.mockResolvedValue({
      basedOn: track("seed"),
      items: [track("a"), track("b")],
    })
    const { result } = await renderHook(() => useBecauseYouListened(null))

    await waitFor(() => expect(result.current.status).toBe("ready"))
    expect(result.current).toEqual({
      status: "ready",
      items: [{ basedOn: track("seed"), tracks: [track("a"), track("b")] }],
    })
  })

  it.each([
    ["nothing was played", { basedOn: null, items: [] }],
    ["nothing is like it", { basedOn: track("seed"), items: [] }],
  ])("hides itself when %s", async (_name, answer) => {
    api.getBecauseYouListened.mockResolvedValue(answer)
    const { result } = await renderHook(() => useBecauseYouListened(null))

    await waitFor(() => expect(result.current.status).toBe("hidden"))
  })

  it("hides itself on a 503", async () => {
    api.getBecauseYouListened.mockRejectedValue(unavailable())
    const { result } = await renderHook(() => useBecauseYouListened(null))

    await waitFor(() => expect(result.current.status).toBe("hidden"))
  })
})

describe("useSimilarTracks", () => {
  it("asks for the track that plays, and loads again when it changes", async () => {
    api.getSimilarTracks.mockResolvedValue({ items: [track("a")] })
    const { result, rerender } = await renderHook(
      (props: { id: string }) => useSimilarTracks(props.id),
      {
        initialProps: { id: "x" },
      },
    )
    await waitFor(() => expect(result.current.status).toBe("ready"))

    api.getSimilarTracks.mockResolvedValue({ items: [] })
    await rerender({ id: "y" })

    await waitFor(() => expect(result.current.status).toBe("hidden"))
    expect(api.getSimilarTracks).toHaveBeenNthCalledWith(1, "x", 15)
    expect(api.getSimilarTracks).toHaveBeenNthCalledWith(2, "y", 15)
  })

  it("hides itself on a 503", async () => {
    api.getSimilarTracks.mockRejectedValue(unavailable())
    const { result } = await renderHook(() => useSimilarTracks("x"))

    await waitFor(() => expect(result.current.status).toBe("hidden"))
  })
})

describe("useTracksByMeaning", () => {
  const hit = (id: string) => ({ score: 1, sources: ["vector" as const], track: track(id) })

  it("leaves out the tracks the search by words already found", async () => {
    api.searchTracksByMeaning.mockResolvedValue({
      query: "mưa",
      degraded: false,
      items: [hit("a"), hit("b"), hit("c")],
    })
    const { result } = await renderHook(() => useTracksByMeaning("mưa", [track("a")]))

    await waitFor(() => expect(result.current.status).toBe("ready"))
    expect(result.current).toEqual({ status: "ready", items: [track("b"), track("c")] })
  })

  it("hides itself when everything was already found", async () => {
    api.searchTracksByMeaning.mockResolvedValue({
      query: "mưa",
      degraded: false,
      items: [hit("a")],
    })
    const { result } = await renderHook(() => useTracksByMeaning("mưa", [track("a")]))

    await waitFor(() => expect(result.current.status).toBe("hidden"))
  })

  it("hides itself for a degraded answer: it is the search by words again", async () => {
    api.searchTracksByMeaning.mockResolvedValue({
      query: "mưa",
      degraded: true,
      items: [hit("z")],
    })
    const { result } = await renderHook(() => useTracksByMeaning("mưa", []))

    await waitFor(() => expect(result.current.status).toBe("hidden"))
  })

  it("hides itself on a 503 and on a network error", async () => {
    api.searchTracksByMeaning.mockRejectedValue(unavailable())
    const first = await renderHook(() => useTracksByMeaning("mưa", []))
    await waitFor(() => expect(first.result.current.status).toBe("hidden"))

    api.searchTracksByMeaning.mockRejectedValue(
      new ApiError({ status: 0, kind: "network", message: "offline" }),
    )
    const second = await renderHook(() => useTracksByMeaning("khác", []))
    await waitFor(() => expect(second.result.current.status).toBe("hidden"))
  })
})
