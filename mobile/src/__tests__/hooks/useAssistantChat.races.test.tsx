import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { act, renderHook, waitFor } from "@testing-library/react-native"
import type { AssistantConversation } from "@/api/types"
import { useAssistantChat } from "@/hooks/useAssistantChat"
import { useAssistantStore } from "@/store/assistantStore"
import {
  conversation,
  deferred,
  delta,
  done,
  http,
  line,
  offline,
  openStream,
  streams,
} from "../helpers/assistant"

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

const kinds = (items: { kind: string }[]) => items.map((item) => item.kind)

beforeEach(() => {
  jest.clearAllMocks()
  useAssistantStore.getState().reset()
  api.getAssistantUsage.mockResolvedValue({ used: 1, limit: 30 })
  api.createConversation.mockResolvedValue(conversation("c1"))
  api.listAssistantMessages.mockResolvedValue([])
})

describe("quick or repeated taps", () => {
  it("two sends before the screen updates make one conversation and one answer", async () => {
    const open = openStream()
    api.sendAssistantMessage.mockImplementation(open.run)
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => {
      void result.current.send("một")
      void result.current.send("hai")
    })

    expect(api.createConversation).toHaveBeenCalledTimes(1)
    expect(api.sendAssistantMessage).toHaveBeenCalledTimes(1)
    expect(kinds(result.current.items)).toEqual(["user"])
    await act(async () => open.end())
  })

  it("opening the conversation that is already open changes nothing", async () => {
    api.listAssistantMessages.mockResolvedValue([line({ id: "1", role: "user", text: "hỏi" })])
    const { result } = await renderHook(() => useAssistantChat())
    await act(async () => result.current.open("c9"))
    await waitFor(() => expect(result.current.history.status).toBe("ready"))

    await act(async () => result.current.open("c9"))

    expect(result.current.history.status).toBe("ready")
    expect(result.current.items).toHaveLength(1)
    expect(api.listAssistantMessages).toHaveBeenCalledTimes(1)
  })

  it("a message can be sent again right after Stop", async () => {
    const open = openStream()
    api.sendAssistantMessage.mockImplementation(open.run)
    const { result } = await renderHook(() => useAssistantChat())
    await act(async () => void result.current.send("một"))
    await waitFor(() => expect(open.signal()).toBeDefined())
    await act(async () => void result.current.stop())

    api.sendAssistantMessage.mockImplementation(streams([delta("Đây"), done()]))
    await act(async () => {
      await result.current.send("hai")
    })

    expect(result.current.items[result.current.items.length - 1]).toMatchObject({ text: "Đây" })
  })
})

describe("a conversation made for nothing", () => {
  it("is deleted again when Stop was pressed before the first message could be sent", async () => {
    const made = deferred<AssistantConversation>()
    api.createConversation.mockReturnValue(made.promise)
    api.deleteConversation.mockResolvedValue(undefined)
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => void result.current.send("chào"))
    await act(async () => void result.current.stop())
    await act(async () => made.resolve(conversation("c1")))

    expect(api.deleteConversation).toHaveBeenCalledWith("c1")
    expect(useAssistantStore.getState().conversations).toEqual([])
  })
})

describe("an answer to a proposal that does not get through", () => {
  const propose = streams([
    {
      type: "action_required",
      actionId: "a1",
      callId: "w1",
      tool: "create_playlist",
      summary: "Tạo playlist",
      expiresAt: "2099-01-01T00:00:00Z",
    },
    done({ awaitingAction: true }),
  ])

  async function withProposal() {
    api.sendAssistantMessage.mockImplementation(propose)
    const hook = await renderHook(() => useAssistantChat())
    await act(async () => {
      await hook.result.current.send("tạo")
    })
    return hook
  }

  it("offline: the card goes back to waiting, so the person can try again", async () => {
    api.answerAssistantAction.mockRejectedValue(offline())
    api.listAssistantMessages.mockRejectedValue(offline())
    const { result } = await withProposal()

    await act(async () => {
      await result.current.confirm("a1")
    })

    expect(result.current.items[1]).toMatchObject({ kind: "action", status: "PENDING" })
    expect(result.current.error?.kind).toBe("offline")
    expect(result.current.streaming).toBe(false)

    api.answerAssistantAction.mockImplementation(
      streams([
        {
          type: "tool_result",
          callId: "w1",
          name: "create_playlist",
          ok: true,
          action: { id: "a1", status: "CONFIRMED" },
        },
        done(),
      ]),
    )
    await act(async () => {
      await result.current.confirm("a1")
    })
    expect(result.current.items[1]).toMatchObject({ status: "CONFIRMED" })
  })

  it("expired (410): the card shows it, even if the server cannot be asked again", async () => {
    api.answerAssistantAction.mockRejectedValue(http(410))
    api.listAssistantMessages.mockRejectedValue(http(500))
    const { result } = await withProposal()

    await act(async () => {
      await result.current.confirm("a1")
    })

    expect(result.current.items[1]).toMatchObject({ status: "EXPIRED" })
    expect(result.current.error?.kind).toBe("expired")
  })

  it("Stop while it is being answered does not leave the card stuck on 'busy'", async () => {
    const open = openStream()
    api.answerAssistantAction.mockImplementation(open.run)
    api.listAssistantMessages.mockRejectedValue(http(500))
    const { result } = await withProposal()
    await act(async () => void result.current.confirm("a1"))
    await waitFor(() => expect(open.signal()).toBeDefined())
    expect(result.current.items[1]).toMatchObject({ status: "BUSY" })

    await act(async () => void result.current.stop())

    expect(result.current.items[1]).toMatchObject({ status: "PENDING" })
  })
})
