import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { render, screen, userEvent, waitFor } from "@testing-library/react-native"
import { router } from "expo-router"
import { ApiError } from "@/api/client"
import type { AssistantConversation, AssistantEvent, AssistantMessageLine } from "@/api/types"
import AssistantScreen from "@/app/assistant"
import { copy } from "@/constants/copy"
import { useAssistantStore } from "@/store/assistantStore"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import { makeTrack } from "../helpers/playback"

jest.mock("expo-router", () => ({ router: { back: jest.fn(), push: jest.fn() } }))
jest.mock("@/store/toastStore", () => ({ showToast: jest.fn() }))
jest.mock("@/api/assistant", () => ({
  getAssistantUsage: jest.fn(),
  listConversations: jest.fn(),
  createConversation: jest.fn(),
  deleteConversation: jest.fn(),
  listAssistantMessages: jest.fn(),
  sendAssistantMessage: jest.fn(),
  answerAssistantAction: jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const api = jest.mocked(require("@/api/assistant") as typeof import("@/api/assistant"))
/* eslint-enable @typescript-eslint/no-require-imports */

const text = copy.assistant
const mockRouter = jest.mocked(router)

type Emit = (event: AssistantEvent) => void
const done = (extra: { awaitingAction?: boolean } = {}): AssistantEvent => ({
  type: "done",
  messageId: "m",
  truncated: false,
  awaitingAction: false,
  ...extra,
})
const streams =
  (events: AssistantEvent[]) =>
  async (...args: unknown[]) => {
    events.forEach(args[args.length - 2] as Emit)
  }
const conversation = (id: string, title = ""): AssistantConversation => ({
  id,
  title,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})
const http = (status: number, message = "x") => new ApiError({ status, kind: "http", message })

async function openScreen() {
  const user = userEvent.setup()
  await render(<AssistantScreen />)
  return user
}
const write = async (user: ReturnType<typeof userEvent.setup>, message: string) => {
  await user.type(screen.getByLabelText(text.composerLabel), message)
  await user.press(screen.getByRole("button", { name: text.send }))
}

beforeEach(() => {
  jest.clearAllMocks()
  useAssistantStore.getState().reset()
  useAssistantStore.setState({ availability: "available", usage: { used: 4, limit: 30 } })
  usePlayerStore.getState().reset()
  useLibraryStore.setState({ load: jest.fn(async () => undefined) })
  api.getAssistantUsage.mockResolvedValue({ used: 5, limit: 30 })
  api.listConversations.mockResolvedValue([])
  api.createConversation.mockResolvedValue(conversation("c1"))
  api.listAssistantMessages.mockResolvedValue([])
})

describe("a new chat", () => {
  it("welcomes the person and offers the four starters", async () => {
    await openScreen()

    expect(screen.getByText(text.welcomeTitle)).toBeOnTheScreen()
    expect(screen.getByText(text.welcomeBody)).toBeOnTheScreen()
    for (const starter of text.starters) {
      expect(screen.getByRole("button", { name: starter })).toBeOnTheScreen()
    }
    expect(screen.getByText(text.title)).toBeOnTheScreen()
  })

  it("says how many messages are left today", async () => {
    await openScreen()
    expect(screen.getByText("Còn 26 tin nhắn hôm nay")).toBeOnTheScreen()
  })

  it("does not offer 'new chat' when the chat is already new", async () => {
    await openScreen()
    expect(screen.getByRole("button", { name: text.history.newChat })).toBeDisabled()
  })

  it("closing goes back", async () => {
    const user = await openScreen()
    await user.press(screen.getByRole("button", { name: text.close }))
    expect(mockRouter.back).toHaveBeenCalledTimes(1)
  })

  it("a starter is sent as if it was typed, and the answer streams in", async () => {
    api.sendAssistantMessage.mockImplementation(
      streams([
        { type: "text_delta", text: "Mình gợi ý " },
        { type: "text_delta", text: "**Lạc Trôi**." },
        done(),
      ]),
    )
    const user = await openScreen()

    await user.press(screen.getByRole("button", { name: text.starters[0] }))

    expect(await screen.findByText("Lạc Trôi")).toBeOnTheScreen()
    expect(screen.getByLabelText(`${text.youSaid}: ${text.starters[0]}`)).toBeOnTheScreen()
    expect(api.sendAssistantMessage).toHaveBeenCalledWith(
      "c1",
      text.starters[0],
      expect.any(Function),
      expect.any(AbortSignal),
    )
    // The welcome gives way to the conversation.
    expect(screen.queryByText(text.welcomeTitle)).not.toBeOnTheScreen()
  })

  it("a typed message is sent and the box is emptied", async () => {
    api.sendAssistantMessage.mockImplementation(
      streams([{ type: "text_delta", text: "Chào!" }, done()]),
    )
    const user = await openScreen()

    await write(user, "xin chào")

    expect(await screen.findByText("Chào!")).toBeOnTheScreen()
    expect(screen.getByLabelText(text.composerLabel).props.value).toBe("")
  })

  it("shows the tracks the assistant found, and plays one when it is tapped", async () => {
    api.sendAssistantMessage.mockImplementation(
      streams([
        { type: "tool_call", callId: "c", name: "search_catalog" },
        {
          type: "tool_result",
          callId: "c",
          name: "search_catalog",
          ok: true,
          display: { tracks: [makeTrack("a"), makeTrack("b")] },
        },
        { type: "text_delta", text: "Đây là hai bài." },
        done(),
      ]),
    )
    const user = await openScreen()
    await write(user, "nhạc buồn")

    await user.press(await screen.findByRole("button", { name: "Play Title b by Artist" }))

    expect(usePlayerStore.getState().currentTrack?.id).toBe("b")
    expect(usePlayerStore.getState().queueSource).toBe(text.playSource)
  })

  it("asks before it changes the library, and does it on 'Đồng ý'", async () => {
    api.sendAssistantMessage.mockImplementation(
      streams([
        { type: "tool_call", callId: "w1", name: "create_playlist" },
        {
          type: "action_required",
          actionId: "a1",
          callId: "w1",
          tool: "create_playlist",
          summary: "Tạo playlist “Chạy bộ”",
          expiresAt: "2099-01-01T00:00:00Z",
        },
        done({ awaitingAction: true }),
      ]),
    )
    api.answerAssistantAction.mockImplementation(
      streams([
        {
          type: "tool_result",
          callId: "w1",
          name: "create_playlist",
          ok: true,
          action: { id: "a1", status: "CONFIRMED" },
        },
        { type: "text_delta", text: "Xong rồi nhé." },
        done(),
      ]),
    )
    const user = await openScreen()
    await write(user, "tạo playlist chạy bộ")

    expect(await screen.findByText("Tạo playlist “Chạy bộ”")).toBeOnTheScreen()
    expect(api.answerAssistantAction).not.toHaveBeenCalled()

    await user.press(screen.getByRole("button", { name: text.action.confirm }))

    expect(await screen.findByText(text.action.confirmed)).toBeOnTheScreen()
    expect(screen.getByText("Xong rồi nhé.")).toBeOnTheScreen()
    expect(useLibraryStore.getState().load).toHaveBeenCalledTimes(1)
  })

  it("the Stop button shows while it answers", async () => {
    api.sendAssistantMessage.mockImplementation(
      () => new Promise<void>(() => undefined), // never ends
    )
    const user = await openScreen()

    await write(user, "kể chuyện")

    expect(await screen.findByRole("button", { name: text.stop })).toBeOnTheScreen()
    expect(screen.queryByRole("button", { name: text.send })).not.toBeOnTheScreen()
  })

  it("pressing Stop takes the turn back and puts the question in the box", async () => {
    api.sendAssistantMessage.mockImplementation(
      (...args: unknown[]) =>
        new Promise<void>((resolve) => {
          ;(args[args.length - 1] as AbortSignal).addEventListener("abort", () => resolve())
        }),
    )
    const user = await openScreen()
    await write(user, "kể chuyện")

    await user.press(await screen.findByRole("button", { name: text.stop }))

    await waitFor(() =>
      expect(screen.getByLabelText(text.composerLabel).props.value).toBe("kể chuyện"),
    )
    expect(screen.queryByLabelText(`${text.youSaid}: kể chuyện`)).not.toBeOnTheScreen()
    expect(screen.getByRole("button", { name: text.send })).toBeOnTheScreen()
  })
})

describe("when it goes wrong", () => {
  it("offline: says so, keeps the question, and sends it again on request", async () => {
    api.sendAssistantMessage.mockRejectedValueOnce(
      new ApiError({ status: 0, kind: "network", message: "x" }),
    )
    const user = await openScreen()
    await write(user, "chào")

    expect(await screen.findByText(text.errors.offline)).toBeOnTheScreen()
    expect(screen.getByText(text.notSent)).toBeOnTheScreen()

    api.sendAssistantMessage.mockImplementation(
      streams([{ type: "text_delta", text: "Xin chào!" }, done()]),
    )
    await user.press(screen.getByRole("button", { name: text.resend }))

    expect(await screen.findByText("Xin chào!")).toBeOnTheScreen()
    expect(screen.queryByText(text.notSent)).not.toBeOnTheScreen()
    expect(screen.queryByText(text.errors.offline)).not.toBeOnTheScreen()
  })

  it("the message can be dismissed", async () => {
    api.sendAssistantMessage.mockRejectedValue(http(500))
    const user = await openScreen()
    await write(user, "chào")
    await screen.findByText(text.errors.generic)

    await user.press(screen.getByRole("button", { name: text.dismiss }))

    expect(screen.queryByText(text.errors.generic)).not.toBeOnTheScreen()
  })

  it("the day is used up: says so with the server's words and locks the box", async () => {
    api.sendAssistantMessage.mockRejectedValue(http(429, "Bạn đã dùng hết 30 tin nhắn hôm nay"))
    const user = await openScreen()
    await write(user, "chào")

    expect(await screen.findByText("Bạn đã dùng hết 30 tin nhắn hôm nay")).toBeOnTheScreen()
    expect(screen.getByLabelText(text.composerLabel).props.editable).toBe(false)
  })

  it("starts with the box locked when the day's messages are already used", async () => {
    useAssistantStore.setState({ usage: { used: 30, limit: 30 } })
    await openScreen()

    expect(screen.getByLabelText(text.composerLabel).props.editable).toBe(false)
    expect(screen.getByRole("button", { name: text.starters[0] })).toBeDisabled()
    expect(screen.getByText("Còn 0 tin nhắn hôm nay")).toBeOnTheScreen()
  })

  it("503: the whole screen gives way to a short notice, and the person can leave", async () => {
    api.sendAssistantMessage.mockRejectedValue(http(503))
    const user = await openScreen()
    await write(user, "chào")

    expect(await screen.findByText(text.unavailable.title)).toBeOnTheScreen()
    expect(useAssistantStore.getState().availability).toBe("unavailable")

    await user.press(screen.getByRole("button", { name: text.unavailable.close }))
    expect(mockRouter.back).toHaveBeenCalled()
  })

  it("already known to be off: shows the notice at once", async () => {
    useAssistantStore.setState({ availability: "unavailable" })
    await openScreen()

    expect(screen.getByText(text.unavailable.title)).toBeOnTheScreen()
    expect(screen.getByText(text.unavailable.description)).toBeOnTheScreen()
    expect(screen.queryByLabelText(text.composerLabel)).not.toBeOnTheScreen()
  })
})

describe("conversations", () => {
  const history: AssistantMessageLine[] = [
    { id: "1", role: "user", text: "Câu hỏi cũ", createdAt: "2026-11-09T10:00:00Z" },
    { id: "2", role: "assistant", text: "Câu trả lời cũ", createdAt: "2026-11-09T10:00:01Z" },
  ]

  it("opens one from the list and shows what was said", async () => {
    api.listConversations.mockResolvedValue([conversation("old", "Nhạc cũ")])
    api.listAssistantMessages.mockResolvedValue(history)
    const user = await openScreen()

    await user.press(screen.getByRole("button", { name: text.history.open }))
    await user.press(await screen.findByRole("button", { name: /^Nhạc cũ/ }))

    expect(await screen.findByText("Câu trả lời cũ")).toBeOnTheScreen()
    expect(api.listAssistantMessages).toHaveBeenCalledWith("old")
    expect(screen.queryByText(text.welcomeTitle)).not.toBeOnTheScreen()
    expect(screen.getByRole("button", { name: text.history.newChat })).toBeEnabled()
  })

  it("says it could not open the conversation, and tries again", async () => {
    api.listConversations.mockResolvedValue([conversation("old", "Nhạc cũ")])
    api.listAssistantMessages.mockRejectedValueOnce(http(500))
    const user = await openScreen()
    await user.press(screen.getByRole("button", { name: text.history.open }))
    await user.press(await screen.findByRole("button", { name: /^Nhạc cũ/ }))
    await screen.findByText(copy.errors.loadFailedTitle)

    api.listAssistantMessages.mockResolvedValue(history)
    await user.press(screen.getByRole("button", { name: copy.common.retry }))

    expect(await screen.findByText("Câu hỏi cũ")).toBeOnTheScreen()
  })

  it("'new chat' goes back to the welcome", async () => {
    api.listConversations.mockResolvedValue([conversation("old", "Nhạc cũ")])
    api.listAssistantMessages.mockResolvedValue(history)
    const user = await openScreen()
    await user.press(screen.getByRole("button", { name: text.history.open }))
    await user.press(await screen.findByRole("button", { name: /^Nhạc cũ/ }))
    await screen.findByText("Câu hỏi cũ")

    await user.press(screen.getByRole("button", { name: text.history.newChat }))

    expect(await screen.findByText(text.welcomeTitle)).toBeOnTheScreen()
    expect(screen.queryByText("Câu hỏi cũ")).not.toBeOnTheScreen()
  })

  it("deleting the open conversation leaves it for a new chat", async () => {
    api.listConversations.mockResolvedValue([conversation("old", "Nhạc cũ")])
    api.listAssistantMessages.mockResolvedValue(history)
    api.deleteConversation.mockResolvedValue(undefined)
    const user = await openScreen()
    await user.press(screen.getByRole("button", { name: text.history.open }))
    await user.press(await screen.findByRole("button", { name: /^Nhạc cũ/ }))
    await screen.findByText("Câu hỏi cũ")

    await user.press(screen.getByRole("button", { name: text.history.open }))
    await user.press(await screen.findByRole("button", { name: `${text.history.delete}: Nhạc cũ` }))
    await user.press(screen.getByRole("button", { name: text.history.confirmDelete }))

    await waitFor(() => expect(screen.getByText(text.welcomeTitle)).toBeOnTheScreen())
    expect(api.deleteConversation).toHaveBeenCalledWith("old")
  })
})
