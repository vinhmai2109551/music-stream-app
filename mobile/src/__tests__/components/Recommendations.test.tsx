import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { render, screen, userEvent } from "@testing-library/react-native"
import { RecommendationSections } from "@/components/media/RecommendationSections"
import { SimilarTracks } from "@/components/media/SimilarTracks"
import type { OptionalSection } from "@/utils/optionalSection"
import { usePlayerStore } from "@/store/playerStore"
import type { Track } from "@/types"
import { r2Track } from "../helpers/playback"

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }))
jest.mock("@/api/likes", () => ({ setLiked: jest.fn(async () => undefined) }))
jest.mock("@/hooks/useRecommendations", () => ({
  useForYou: jest.fn(),
  useBecauseYouListened: jest.fn(),
  useSimilarTracks: jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const hooks = jest.mocked(
  require("@/hooks/useRecommendations") as typeof import("@/hooks/useRecommendations"),
)
const { router } = jest.mocked(require("expo-router") as typeof import("expo-router"))
/* eslint-enable @typescript-eslint/no-require-imports */

const hidden = { status: "hidden" } as const
const loading = { status: "loading" } as const
const ready = <T,>(...items: T[]): OptionalSection<T> => ({ status: "ready", items })
const tracks: Track[] = [r2Track("a"), r2Track("b")]

beforeEach(() => {
  jest.clearAllMocks()
  usePlayerStore.getState().reset()
  hooks.useForYou.mockReturnValue(hidden)
  hooks.useBecauseYouListened.mockReturnValue(hidden)
  hooks.useSimilarTracks.mockReturnValue(hidden)
})

describe("RecommendationSections (Home)", () => {
  it.each([
    ["is loading", loading],
    ["has nothing or is off", hidden],
  ])("shows nothing while a section %s", async (_name, state) => {
    hooks.useForYou.mockReturnValue(state)
    hooks.useBecauseYouListened.mockReturnValue(state)

    await render(<RecommendationSections region={null} />)

    expect(screen.queryByText("Dành cho bạn")).toBeNull()
    expect(screen.queryByText(/Vì bạn đã nghe/)).toBeNull()
  })

  it("shows 'Dành cho bạn' with the tracks, and plays one from that list", async () => {
    hooks.useForYou.mockReturnValue(ready(...tracks))
    const user = userEvent.setup()
    await render(<RecommendationSections region={null} />)

    expect(screen.getByText("Dành cho bạn")).toBeOnTheScreen()
    await user.press(screen.getByRole("button", { name: "Title b by Artist" }))

    const player = usePlayerStore.getState()
    expect(player.currentTrack?.id).toBe("b")
    expect(player.queue.map((track) => track.id)).toEqual(["a", "b"])
    expect(player.queueSource).toBe("Dành cho bạn")
    expect(router.push).toHaveBeenCalledWith("/player")
  })

  it("names the track 'Vì bạn đã nghe …' is based on", async () => {
    hooks.useBecauseYouListened.mockReturnValue(
      ready({ basedOn: r2Track("seed"), tracks: [r2Track("a")] }),
    )

    await render(<RecommendationSections region={null} />)

    expect(screen.getByText("Vì bạn đã nghe Title seed")).toBeOnTheScreen()
  })

  it("passes the region to both sections", async () => {
    await render(<RecommendationSections region="KOREA" />)

    expect(hooks.useForYou).toHaveBeenCalledWith("KOREA")
    expect(hooks.useBecauseYouListened).toHaveBeenCalledWith("KOREA")
  })
})

describe("SimilarTracks (Player)", () => {
  it.each([
    ["loading", loading],
    ["empty or off", hidden],
  ])("has no button while it is %s", async (_name, state) => {
    hooks.useSimilarTracks.mockReturnValue(state)

    await render(<SimilarTracks trackId="x" />)

    expect(screen.queryByRole("button", { name: "Xem bài tương tự" })).toBeNull()
  })

  it("asks for the similar tracks of the track that is playing", async () => {
    await render(<SimilarTracks trackId="x" />)

    expect(hooks.useSimilarTracks).toHaveBeenCalledWith("x")
  })

  it("opens a list of similar tracks from the button", async () => {
    hooks.useSimilarTracks.mockReturnValue(ready(...tracks))
    const user = userEvent.setup()
    await render(<SimilarTracks trackId="x" />)
    expect(screen.queryByText("Bài tương tự")).toBeNull()

    await user.press(screen.getByRole("button", { name: "Xem bài tương tự" }))

    expect(screen.getByText("Bài tương tự")).toBeOnTheScreen()
    expect(screen.getByText("Title a")).toBeOnTheScreen()
    expect(screen.getByText("Title b")).toBeOnTheScreen()
  })

  it("plays a similar track from the list with the right source", async () => {
    hooks.useSimilarTracks.mockReturnValue(ready(...tracks))
    const user = userEvent.setup()
    await render(<SimilarTracks trackId="x" />)
    await user.press(screen.getByRole("button", { name: "Xem bài tương tự" }))

    await user.press(screen.getByRole("button", { name: "Play Title b by Artist" }))

    expect(usePlayerStore.getState().currentTrack?.id).toBe("b")
    expect(usePlayerStore.getState().queueSource).toBe("Bài tương tự")
  })

  it("closes the list when the track changes", async () => {
    hooks.useSimilarTracks.mockReturnValue(ready(...tracks))
    const user = userEvent.setup()
    const view = await render(<SimilarTracks trackId="x" />)
    await user.press(screen.getByRole("button", { name: "Xem bài tương tự" }))
    expect(screen.getByText("Bài tương tự")).toBeOnTheScreen()

    await view.rerender(<SimilarTracks trackId="y" />)

    expect(screen.queryByText("Bài tương tự")).toBeNull()
  })
})
