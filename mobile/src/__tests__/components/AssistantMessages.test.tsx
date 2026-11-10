import { t } from "@/i18n"
import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { render, screen, userEvent } from "@testing-library/react-native"
import { router } from "expo-router"
import type { ApiPlaylist } from "@/api/types"
import { ActionCard } from "@/components/media/assistant/ActionCard"
import { AssistantBubble, UserBubble } from "@/components/media/assistant/Bubbles"
import { ChatItemView } from "@/components/media/assistant/ChatItemView"
import { ResultCards } from "@/components/media/assistant/ResultCards"
import { ToolStep } from "@/components/media/assistant/ToolStep"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import type { ChatItem } from "@/utils/chatState"
import { makeTrack } from "../helpers/playback"

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }))

const mockRouter = jest.mocked(router)

type ActionItem = Extract<ChatItem, { kind: "action" }>
const action = (extra: Partial<ActionItem> = {}): ActionItem => ({
  kind: "action",
  id: "x1",
  actionId: "a1",
  callId: "w1",
  tool: "create_playlist",
  summary: "Tạo playlist “Chạy bộ” với 12 bài",
  expiresAt: "2099-01-01T00:00:00Z",
  status: "PENDING",
  ...extra,
})

beforeEach(() => {
  jest.clearAllMocks()
  usePlayerStore.getState().reset()
  useLibraryStore.getState().reset()
})

describe("the person's message", () => {
  it("shows what they said, readable by a screen reader as theirs", async () => {
    await render(<UserBubble text="Gợi ý nhạc buồn" failed={false} onResend={jest.fn()} />)

    expect(screen.getByText("Gợi ý nhạc buồn")).toBeOnTheScreen()
    expect(screen.getByLabelText(`${t("assistant.youSaid")}: Gợi ý nhạc buồn`)).toBeOnTheScreen()
    expect(screen.queryByText(t("assistant.notSent"))).not.toBeOnTheScreen()
  })

  it("a message that was not sent says so, and offers to send it again", async () => {
    const onResend = jest.fn()
    const user = userEvent.setup()
    await render(<UserBubble text="Chào" failed onResend={onResend} />)

    expect(screen.getByText(t("assistant.notSent"))).toBeOnTheScreen()
    await user.press(screen.getByRole("button", { name: t("assistant.resend") }))

    expect(onResend).toHaveBeenCalledWith("Chào")
  })
})

describe("the assistant's message", () => {
  it("shows paragraphs, lists and bold words", async () => {
    await render(
      <AssistantBubble
        text={"Thử nghe:\n\n1. **Lo-fi** nhẹ nhàng\n2. Piano\n\n- Jazz"}
        streaming={false}
        truncated={false}
      />,
    )

    expect(screen.getByText("Thử nghe:")).toBeOnTheScreen()
    expect(screen.getByText("Lo-fi")).toBeOnTheScreen()
    expect(screen.getByText("1.")).toBeOnTheScreen()
    expect(screen.getByText("2.")).toBeOnTheScreen()
    expect(screen.getByText("•")).toBeOnTheScreen()
    expect(screen.getByText("Jazz")).toBeOnTheScreen()
    expect(screen.queryByText(/\*\*/)).not.toBeOnTheScreen()
  })

  it("while it has written nothing yet, shows that it is answering", async () => {
    await render(<AssistantBubble text="" streaming truncated={false} />)

    expect(screen.getByLabelText(t("assistant.replying"))).toBeOnTheScreen()
  })

  it("says when the answer was cut short", async () => {
    await render(<AssistantBubble text="Dài quá" streaming={false} truncated />)

    expect(screen.getByText(t("assistant.truncated"))).toBeOnTheScreen()
  })
})

describe("a step of the assistant", () => {
  const tool = (extra: Partial<Extract<ChatItem, { kind: "tool" }>> = {}) => ({
    kind: "tool" as const,
    id: "t1",
    callId: "c1",
    name: "search_catalog",
    status: "running" as const,
    ...extra,
  })

  it("while it works, says what it is doing", async () => {
    await render(<ToolStep item={tool()} />)
    expect(screen.getByText(t("assistant.tools.search_catalog"))).toBeOnTheScreen()
  })

  it("a tool the app has no words for gets a general line", async () => {
    await render(<ToolStep item={tool({ name: "something_new" })} />)
    expect(screen.getByText(t("assistant.tools.fallback"))).toBeOnTheScreen()
  })

  it("says when a step did not work", async () => {
    await render(<ToolStep item={tool({ status: "failed" })} />)
    expect(screen.getByText(t("assistant.tools.failed"))).toBeOnTheScreen()
  })

  it("when it is done, shows what it found", async () => {
    await render(
      <ToolStep item={tool({ status: "done", display: { tracks: [makeTrack("a")] } })} />,
    )
    expect(screen.getByText("Title a")).toBeOnTheScreen()
    expect(screen.queryByText(t("assistant.tools.search_catalog"))).not.toBeOnTheScreen()
  })

  it("shows nothing for a step that found nothing", async () => {
    await render(<ToolStep item={tool({ status: "done", display: { tracks: [] } })} />)
    expect(screen.queryByText("Title a")).not.toBeOnTheScreen()
  })
})

describe("the cards of what was found", () => {
  const tracks = Array.from({ length: 8 }, (_, index) => makeTrack(String(index)))

  it("playing a track plays the list it came with, as coming from the assistant", async () => {
    const user = userEvent.setup()
    await render(<ResultCards display={{ tracks }} />)

    await user.press(
      screen.getByRole("button", {
        name: t("track.playNamed", { title: "Title 2", artist: "Artist" }),
      }),
    )

    const player = usePlayerStore.getState()
    expect(player.currentTrack?.id).toBe("2")
    expect(player.queue).toHaveLength(8)
    expect(player.queueSource).toBe(t("assistant.playSource"))
  })

  it("shows the first five tracks, and the rest on request", async () => {
    const user = userEvent.setup()
    await render(<ResultCards display={{ tracks }} />)

    expect(screen.getByText("Title 4")).toBeOnTheScreen()
    expect(screen.queryByText("Title 5")).not.toBeOnTheScreen()

    await user.press(screen.getByRole("button", { name: "Xem thêm 3 bài" }))
    expect(screen.getByText("Title 7")).toBeOnTheScreen()

    await user.press(screen.getByRole("button", { name: t("assistant.fewerTracks") }))
    expect(screen.queryByText("Title 7")).not.toBeOnTheScreen()
  })

  it("five tracks or fewer have nothing to expand", async () => {
    await render(<ResultCards display={{ tracks: tracks.slice(0, 5) }} />)
    expect(screen.queryByRole("button", { name: /Xem thêm/ })).not.toBeOnTheScreen()
  })

  it("opens a playlist it found", async () => {
    const user = userEvent.setup()
    const playlist = {
      id: "p1",
      name: "Chạy bộ",
      owner: "Bạn",
      cover: null,
      trackIds: ["a", "b"],
    } as unknown as ApiPlaylist
    await render(<ResultCards display={{ playlists: [playlist] }} />)

    await user.press(screen.getByRole("button", { name: t("playlist.named", { name: "Chạy bộ" }) }))

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/playlist/[id]",
      params: { id: "p1" },
    })
  })

  it("names where a help answer came from", async () => {
    await render(
      <ResultCards display={{ sources: [{ source: "premium", heading: "Quyền lợi Premium" }] }} />,
    )

    expect(screen.getByText(t("assistant.sources"))).toBeOnTheScreen()
    expect(screen.getByText(/Quyền lợi Premium/)).toBeOnTheScreen()
  })

  it("shows nothing without cards", async () => {
    await render(<ResultCards display={undefined} />)
    await render(<ResultCards display={{}} />)
    expect(screen.queryByText(t("assistant.sources"))).not.toBeOnTheScreen()
  })
})

describe("a change the assistant wants to make", () => {
  const setup = async (item: ActionItem, locked = false) => {
    const onConfirm = jest.fn()
    const onReject = jest.fn()
    const user = userEvent.setup()
    await render(
      <ActionCard item={item} locked={locked} onConfirm={onConfirm} onReject={onReject} />,
    )
    return { onConfirm, onReject, user }
  }

  it("says what it wants to do, and asks", async () => {
    await setup(action())

    expect(screen.getByText(t("assistant.action.heading"))).toBeOnTheScreen()
    expect(screen.getByText("Tạo playlist “Chạy bộ” với 12 bài")).toBeOnTheScreen()
    expect(screen.getByText(t("assistant.action.waiting"))).toBeOnTheScreen()
  })

  it("Đồng ý and Huỷ answer for that proposal", async () => {
    const { onConfirm, onReject, user } = await setup(action())

    await user.press(screen.getByRole("button", { name: t("assistant.action.confirm") }))
    expect(onConfirm).toHaveBeenCalledWith("a1")
    expect(onReject).not.toHaveBeenCalled()

    await user.press(screen.getByRole("button", { name: t("assistant.action.reject") }))
    expect(onReject).toHaveBeenCalledWith("a1")
  })

  it("cannot be answered while another answer is being written", async () => {
    const { onConfirm, user } = await setup(action(), true)

    await user.press(screen.getByRole("button", { name: t("assistant.action.confirm") }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: t("assistant.action.confirm") })).toBeDisabled()
  })

  it("while the answer is on its way, there are no buttons", async () => {
    await setup(action({ status: "BUSY" }))

    expect(screen.getByText(t("assistant.action.busy"))).toBeOnTheScreen()
    expect(
      screen.queryByRole("button", { name: t("assistant.action.confirm") }),
    ).not.toBeOnTheScreen()
  })

  it.each([
    ["CONFIRMED", t("assistant.action.confirmed")],
    ["REJECTED", t("assistant.action.rejected")],
    ["EXPIRED", t("assistant.action.expired")],
    ["FAILED", t("assistant.action.failed")],
  ] as const)("a proposal that is %s says so and has no buttons", async (status, label) => {
    await setup(action({ status }))

    expect(screen.getByText(label)).toBeOnTheScreen()
    expect(
      screen.queryByRole("button", { name: t("assistant.action.confirm") }),
    ).not.toBeOnTheScreen()
    expect(
      screen.queryByRole("button", { name: t("assistant.action.reject") }),
    ).not.toBeOnTheScreen()
  })

  it("shows what a change made, once it was made", async () => {
    await setup(action({ status: "CONFIRMED", display: { tracks: [makeTrack("a")] } }))
    expect(screen.getByText("Title a")).toBeOnTheScreen()
  })

  it("does not show the result of a change that was refused", async () => {
    await setup(action({ status: "REJECTED", display: { tracks: [makeTrack("a")] } }))
    expect(screen.queryByText("Title a")).not.toBeOnTheScreen()
  })
})

describe("one line of the conversation", () => {
  const props = { locked: false, onResend: jest.fn(), onConfirm: jest.fn(), onReject: jest.fn() }
  const lines: ChatItem[] = [
    { kind: "user", id: "1", text: "Tôi hỏi", failed: false },
    { kind: "assistant", id: "2", text: "Tôi đáp", streaming: false, truncated: false },
    { kind: "tool", id: "3", callId: "c", name: "get_track", status: "running" },
    action({ id: "4", summary: "Thích 1 bài" }),
  ]

  it.each([
    [0, "Tôi hỏi"],
    [1, "Tôi đáp"],
    [2, t("assistant.tools.get_track")],
    [3, "Thích 1 bài"],
  ])("line %d shows %s", async (index, expected) => {
    await render(<ChatItemView item={lines[index]} {...props} />)
    expect(screen.getByText(expected)).toBeOnTheScreen()
  })
})
