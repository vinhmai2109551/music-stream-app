import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { ApiError } from "@/api/client"
import type { AssistantConversation } from "@/api/types"
import { copy } from "@/constants/copy"
import { useAssistantStore } from "@/store/assistantStore"
import { useToastStore } from "@/store/toastStore"

jest.mock("@/api/assistant", () => ({
  getAssistantUsage: jest.fn(),
  listConversations: jest.fn(),
  createConversation: jest.fn(),
  deleteConversation: jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const api = jest.mocked(require("@/api/assistant") as typeof import("@/api/assistant"))
/* eslint-enable @typescript-eslint/no-require-imports */

const conversation = (id: string, extra: Partial<AssistantConversation> = {}) => ({
  id,
  title: `Chat ${id}`,
  createdAt: "2026-11-09T10:00:00Z",
  updatedAt: "2026-11-09T10:00:00Z",
  ...extra,
})
const http = (status: number) => new ApiError({ status, kind: "http", message: "x" })
const offline = () => new ApiError({ status: 0, kind: "network", message: "x" })

const state = () => useAssistantStore.getState()

beforeEach(() => {
  jest.useFakeTimers() // a toast keeps a timer for a couple of seconds
  jest.clearAllMocks()
  useAssistantStore.getState().reset()
  useToastStore.setState({ message: null })
})

describe("probe", () => {
  it("learns that the assistant is on and how many messages are left", async () => {
    api.getAssistantUsage.mockResolvedValue({ used: 3, limit: 30 })
    await state().probe()

    expect(state().availability).toBe("available")
    expect(state().usage).toEqual({ used: 3, limit: 30 })
  })

  it("503 means it is off: the feature goes away", async () => {
    api.getAssistantUsage.mockRejectedValue(http(503))
    await state().probe()

    expect(state().availability).toBe("unavailable")
    expect(state().usage).toBeNull()
  })

  it.each([
    ["no network", offline()],
    ["a server error", http(500)],
    ["a rejected token", http(401)],
  ])("%s does not hide the feature", async (_name, error) => {
    api.getAssistantUsage.mockRejectedValue(error)
    await state().probe()

    expect(state().availability).toBe("unknown")
  })
})

describe("conversations", () => {
  it("loads the list", async () => {
    api.listConversations.mockResolvedValue([conversation("a"), conversation("b")])
    const loading = state().loadConversations()
    expect(state().status).toBe("loading")
    await loading

    expect(state().status).toBe("ready")
    expect(state().conversations.map((item) => item.id)).toEqual(["a", "b"])
    expect(state().availability).toBe("available")
  })

  it("keeps the list it has while a new one loads, and when loading fails", async () => {
    api.listConversations.mockResolvedValueOnce([conversation("a")])
    await state().loadConversations()
    api.listConversations.mockRejectedValueOnce(offline())
    await state().loadConversations()

    expect(state().status).toBe("error")
    expect(state().conversations.map((item) => item.id)).toEqual(["a"])
    expect(state().error).toBeInstanceOf(ApiError)
  })

  it("503 while loading the list switches the feature off", async () => {
    api.listConversations.mockRejectedValue(http(503))
    await state().loadConversations()

    expect(state().availability).toBe("unavailable")
    expect(state().status).toBe("idle")
  })

  it("creates a conversation at the top of the list", async () => {
    api.listConversations.mockResolvedValue([conversation("a")])
    await state().loadConversations()
    api.createConversation.mockResolvedValue(conversation("n"))

    const created = await state().createConversation()

    expect(created?.id).toBe("n")
    expect(state().conversations.map((item) => item.id)).toEqual(["n", "a"])
  })

  it("does not list a conversation twice (the server gives back the empty one it has)", async () => {
    api.listConversations.mockResolvedValue([conversation("a")])
    await state().loadConversations()
    api.createConversation.mockResolvedValue(conversation("a"))

    await state().createConversation()

    expect(state().conversations).toHaveLength(1)
  })

  it("tells the person when a conversation cannot be created", async () => {
    api.createConversation.mockRejectedValue(offline())

    expect(await state().createConversation()).toBeNull()
    expect(useToastStore.getState().message).toBe(copy.assistant.history.createFailed)
  })

  it("503 when creating switches the feature off, without a toast", async () => {
    api.createConversation.mockRejectedValue(http(503))

    expect(await state().createConversation()).toBeNull()
    expect(state().availability).toBe("unavailable")
    expect(useToastStore.getState().message).toBeNull()
  })
})

describe("deleting", () => {
  beforeEach(async () => {
    api.listConversations.mockResolvedValue([
      conversation("a"),
      conversation("b"),
      conversation("c"),
    ])
    await state().loadConversations()
  })

  it("removes the conversation at once and keeps it removed once the server agrees", async () => {
    let finish: () => void = () => undefined
    api.deleteConversation.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)))

    const deleting = state().removeConversation("b")
    expect(state().conversations.map((item) => item.id)).toEqual(["a", "c"])
    finish()

    expect(await deleting).toBe(true)
    expect(state().conversations.map((item) => item.id)).toEqual(["a", "c"])
  })

  it("puts it back where it was, and says so, when the server could not delete it", async () => {
    api.deleteConversation.mockRejectedValue(offline())

    expect(await state().removeConversation("b")).toBe(false)
    expect(state().conversations.map((item) => item.id)).toEqual(["a", "b", "c"])
    expect(useToastStore.getState().message).toBe(copy.assistant.history.deleteFailed)
  })

  it("a conversation that is already gone (404) is deleted as far as the person cares", async () => {
    api.deleteConversation.mockRejectedValue(http(404))

    expect(await state().removeConversation("b")).toBe(true)
    expect(state().conversations.map((item) => item.id)).toEqual(["a", "c"])
  })

  it("a conversation that is not in the list is not asked for", async () => {
    expect(await state().removeConversation("zzz")).toBe(false)
    expect(api.deleteConversation).not.toHaveBeenCalled()
  })
})

describe("usage, touch, reset", () => {
  it("refreshUsage reads the numbers again, and 503 switches the feature off", async () => {
    api.getAssistantUsage.mockResolvedValueOnce({ used: 1, limit: 30 })
    await state().refreshUsage()
    expect(state().usage).toEqual({ used: 1, limit: 30 })

    api.getAssistantUsage.mockRejectedValueOnce(offline())
    await state().refreshUsage()
    expect(state().usage).toEqual({ used: 1, limit: 30 })

    api.getAssistantUsage.mockRejectedValueOnce(http(503))
    await state().refreshUsage()
    expect(state().availability).toBe("unavailable")
  })

  it("touch moves a conversation to the top and dates it now", async () => {
    api.listConversations.mockResolvedValue([conversation("a"), conversation("b")])
    await state().loadConversations()

    state().touch("b")

    expect(state().conversations.map((item) => item.id)).toEqual(["b", "a"])
    expect(state().conversations[0].updatedAt).not.toBe("2026-11-09T10:00:00Z")
  })

  it("touch of a conversation that is not listed changes nothing", async () => {
    api.listConversations.mockResolvedValue([conversation("a")])
    await state().loadConversations()
    const before = state().conversations

    state().touch("zzz")

    expect(state().conversations).toBe(before)
  })

  it("reset forgets everything (sign-out)", async () => {
    api.listConversations.mockResolvedValue([conversation("a")])
    await state().loadConversations()
    state().markUnavailable()

    state().reset()

    expect(state().availability).toBe("unknown")
    expect(state().conversations).toEqual([])
    expect(state().status).toBe("idle")
  })
})
