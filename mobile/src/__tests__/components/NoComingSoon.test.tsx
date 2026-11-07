import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { render, screen, userEvent } from "@testing-library/react-native"
import { Share } from "react-native"
import type { ApiFeedPost, ApiTrack } from "@/api/types"
import { FeedPostCard } from "@/components/media/FeedPostCard"
import { HomeHeader } from "@/components/media/HomeHeader"
import PlayerScreen from "@/app/player"
import { copy } from "@/constants/copy"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import { useToastStore } from "@/store/toastStore"
import { trackShareMessage } from "@/utils/shareTrack"
import { r2Track, ytTrack } from "../helpers/playback"

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn(), navigate: jest.fn() },
  useFocusEffect: jest.fn(),
}))
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }))
// The player's heavy parts (gestures, blur, video, seek bar) are not what is tested here.
jest.mock("@/components/ui/SwipeToDismiss", () => ({
  SwipeToDismiss: ({ children }: { children: unknown }) => children,
}))
jest.mock("@/components/media/BlurredBackdrop", () => ({ BlurredBackdrop: () => null }))
jest.mock("@/components/media/YouTubeSlot", () => ({ YouTubeSlot: () => null }))
jest.mock("@/components/media/YouTubeLabel", () => ({ YouTubeLabel: () => null }))
jest.mock("@/components/media/SeekBar", () => ({ SeekBar: () => null }))
jest.mock("@/api/feed", () => ({ likeFeedPost: jest.fn(), unlikeFeedPost: jest.fn() }))

const toast = () => useToastStore.getState().message

beforeEach(() => {
  jest.restoreAllMocks()
  usePlayerStore.getState().reset()
  useLibraryStore.getState().reset()
  useToastStore.setState({ message: null })
})

describe("the Home header", () => {
  it("has no notifications button, and still opens the account", async () => {
    const onAccount = jest.fn()
    const user = userEvent.setup()
    await render(<HomeHeader name="Vinh" avatarUrl={null} onAccount={onAccount} />)

    expect(screen.queryByRole("button", { name: "Notifications" })).not.toBeOnTheScreen()
    await user.press(screen.getByRole("button", { name: copy.account.title }))

    expect(onAccount).toHaveBeenCalledTimes(1)
    expect(toast()).toBeNull()
  })
})

describe("a feed post", () => {
  const post = (): ApiFeedPost => ({
    id: "post1",
    artist: null,
    track: r2Track("a") as unknown as ApiTrack,
    artwork: "",
    caption: "A caption",
    createdAt: new Date().toISOString(),
    likesCount: 3,
    commentsCount: 2,
    liked: false,
  })

  it("keeps like, comments and play, and has no Repost or More buttons", async () => {
    await render(<FeedPostCard post={post()} onOpenComments={jest.fn()} commentsCount={2} />)

    expect(screen.getByRole("button", { name: "Like post" })).toBeOnTheScreen()
    expect(screen.getByRole("button", { name: "Comments" })).toBeOnTheScreen()
    expect(screen.getByRole("button", { name: "Play Title a by Artist" })).toBeOnTheScreen()
    expect(screen.queryByRole("button", { name: "Repost" })).not.toBeOnTheScreen()
    expect(screen.queryByRole("button", { name: "More options" })).not.toBeOnTheScreen()
  })
})

describe("the player screen", () => {
  const play = (track = r2Track("a")) => {
    usePlayerStore.getState().playFromList([track], 0)
    return track
  }

  it("Share opens the share sheet with the track and its video link", async () => {
    const track = play(ytTrack("a"))
    const share = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: Share.sharedAction, activityType: undefined })
    const user = userEvent.setup()
    await render(<PlayerScreen />)

    await user.press(screen.getByRole("button", { name: "Share" }))

    expect(share).toHaveBeenCalledWith({ message: trackShareMessage(track), title: track.title })
    expect(toast()).toBeNull()
  })

  it("says something when the share sheet cannot be opened", async () => {
    play()
    jest.spyOn(Share, "share").mockRejectedValue(new Error("no share target"))
    const user = userEvent.setup()
    await render(<PlayerScreen />)

    await user.press(screen.getByRole("button", { name: "Share" }))

    await screen.findByRole("button", { name: "Share" })
    expect(toast()).toBe(copy.errors.unknown)
  })

  it("More opens the menu of the track that is playing", async () => {
    play()
    const user = userEvent.setup()
    await render(<PlayerScreen />)
    expect(screen.queryByText("Add to liked songs")).not.toBeOnTheScreen()

    await user.press(screen.getByRole("button", { name: "More options" }))

    expect(await screen.findByText("Add to liked songs")).toBeOnTheScreen()
    expect(screen.getByText(copy.library.addToPlaylist)).toBeOnTheScreen()
    expect(toast()).toBeNull()
  })
})
