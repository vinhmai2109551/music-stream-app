import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { render, screen, userEvent, waitFor } from "@testing-library/react-native"
import { ApiError } from "@/api/client"
import type { AssistantConversation } from "@/api/types"
import { ConversationsSheet } from "@/components/media/assistant/ConversationsSheet"
import { useAssistantStore } from "@/store/assistantStore"
import { useToastStore } from "@/store/toastStore"
import { t } from "@/i18n"

jest.mock("@/api/assistant", () => ({
  getAssistantUsage: jest.fn(),
  listConversations: jest.fn(),
  createConversation: jest.fn(),
  deleteConversation: jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const api = jest.mocked(require("@/api/assistant") as typeof import("@/api/assistant"))
/* eslint-enable @typescript-eslint/no-require-imports */

const conversation = (id: string, title: string): AssistantConversation => ({
  id,
  title,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

async function open(props: Partial<React.ComponentProps<typeof ConversationsSheet>> = {}) {
  const handlers = {
    onClose: jest.fn(),
    onOpen: jest.fn(),
    onNewChat: jest.fn(),
    onDeleted: jest.fn(),
  }
  const user = userEvent.setup()
  await render(<ConversationsSheet visible currentId={null} {...handlers} {...props} />)
  return { ...handlers, user }
}

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["setImmediate", "nextTick", "queueMicrotask"] })
  jest.clearAllMocks()
  useAssistantStore.getState().reset()
  useToastStore.setState({ message: null })
  api.listConversations.mockResolvedValue([
    conversation("a", "Nhạc buồn Việt Nam"),
    conversation("b", ""),
  ])
})

describe("the list", () => {
  it("shows the conversations with when they were used", async () => {
    await open()

    expect(await screen.findByText("Nhạc buồn Việt Nam")).toBeOnTheScreen()
    expect(screen.getByText(t("assistant.history.untitled"), { exact: true })).toBeOnTheScreen()
    expect(screen.getAllByText("Vừa xong")).toHaveLength(2)
  })

  it("asks the server each time it is opened", async () => {
    await open()
    await screen.findByText("Nhạc buồn Việt Nam")

    expect(api.listConversations).toHaveBeenCalledTimes(1)
  })

  it("says there is nothing yet, and how to begin", async () => {
    api.listConversations.mockResolvedValue([])
    await open()

    expect(await screen.findByText(t("assistant.history.emptyTitle"))).toBeOnTheScreen()
    expect(screen.getByText(t("assistant.history.emptyDescription"))).toBeOnTheScreen()
  })

  it("does not say it is empty while it is still loading", async () => {
    api.listConversations.mockReturnValue(new Promise(() => undefined))
    await open()

    expect(screen.queryByText(t("assistant.history.emptyTitle"))).not.toBeOnTheScreen()
  })

  it("says it could not load, and loads again on request", async () => {
    api.listConversations.mockRejectedValueOnce(
      new ApiError({ status: 0, kind: "network", message: "x" }),
    )
    const { user } = await open()
    await screen.findByText(t("errors.loadFailedTitle"))

    await user.press(screen.getByRole("button", { name: t("common.retry") }))

    expect(await screen.findByText("Nhạc buồn Việt Nam")).toBeOnTheScreen()
  })

  it("marks the conversation that is open", async () => {
    await open({ currentId: "a" })
    await screen.findByText("Nhạc buồn Việt Nam")

    expect(screen.getByRole("button", { selected: true })).toHaveAccessibleName(
      /Nhạc buồn Việt Nam/,
    )
  })
})

describe("choosing", () => {
  it("opening a conversation closes the sheet and tells the screen which", async () => {
    const { user, onOpen, onClose } = await open()
    await user.press(await screen.findByRole("button", { name: "Nhạc buồn Việt Nam, Vừa xong" }))

    expect(onOpen).toHaveBeenCalledWith("a")
    expect(onClose).toHaveBeenCalled()
  })

  it("a new chat closes the sheet and starts one", async () => {
    const { user, onNewChat, onClose } = await open()
    await user.press(screen.getByRole("button", { name: t("assistant.history.newChat") }))

    expect(onNewChat).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalled()
  })
})

describe("deleting", () => {
  async function askToDelete() {
    const opened = await open({ currentId: "a" })
    await screen.findByText("Nhạc buồn Việt Nam")
    await opened.user.press(
      screen.getByRole("button", { name: `${t("assistant.history.delete")}: Nhạc buồn Việt Nam` }),
    )
    return opened
  }

  it("asks first, in the same sheet, and what it says is true", async () => {
    await askToDelete()

    expect(screen.getByText(t("assistant.history.deleteTitle"))).toBeOnTheScreen()
    expect(screen.getByText(t("assistant.history.deleteMessage"))).toBeOnTheScreen()
    expect(api.deleteConversation).not.toHaveBeenCalled()
  })

  it("'Giữ lại' goes back to the list and deletes nothing", async () => {
    const { user } = await askToDelete()

    await user.press(screen.getByRole("button", { name: t("assistant.history.keep") }))

    expect(screen.getByText("Nhạc buồn Việt Nam")).toBeOnTheScreen()
    expect(api.deleteConversation).not.toHaveBeenCalled()
  })

  it("'Xoá' deletes it, says so, and tells the screen (it may be the open one)", async () => {
    api.deleteConversation.mockResolvedValue(undefined)
    const { user, onDeleted } = await askToDelete()

    await user.press(screen.getByRole("button", { name: t("assistant.history.confirmDelete") }))

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith("a"))
    expect(api.deleteConversation).toHaveBeenCalledWith("a")
    expect(useToastStore.getState().message).toBe(t("assistant.history.deleted"))
    expect(screen.queryByText("Nhạc buồn Việt Nam")).not.toBeOnTheScreen()
  })

  it("when the server cannot delete it, it stays in the list and the person is told", async () => {
    api.deleteConversation.mockRejectedValue(
      new ApiError({ status: 0, kind: "network", message: "x" }),
    )
    const { user, onDeleted } = await askToDelete()

    await user.press(screen.getByRole("button", { name: t("assistant.history.confirmDelete") }))

    await waitFor(() =>
      expect(useToastStore.getState().message).toBe(t("assistant.history.deleteFailed")),
    )
    expect(onDeleted).not.toHaveBeenCalled()
    expect(screen.getByText(t("assistant.history.deleteTitle"))).toBeOnTheScreen() // still asking
    expect(
      useAssistantStore.getState().conversations.map((conversation) => conversation.id),
    ).toContain("a")
  })
})
