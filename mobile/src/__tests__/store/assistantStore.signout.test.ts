import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import type { AssistantConversation, AssistantUsage } from "@/api/types"
import { useAssistantStore } from "@/store/assistantStore"
import { conversation, deferred, http, offline } from "../helpers/assistant"

jest.mock("@/store/toastStore", () => ({ showToast: jest.fn() }))
jest.mock("@/api/assistant", () => ({
  getAssistantUsage: jest.fn(),
  listConversations: jest.fn(),
  createConversation: jest.fn(),
  deleteConversation: jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const api = jest.mocked(require("@/api/assistant") as typeof import("@/api/assistant"))
/* eslint-enable @typescript-eslint/no-require-imports */

const state = () => useAssistantStore.getState()

beforeEach(() => {
  jest.clearAllMocks()
  state().reset()
})

describe("signing out while a request is on its way", () => {
  it("probe: an answer for the earlier account is dropped", async () => {
    const answer = deferred<AssistantUsage>()
    api.getAssistantUsage.mockReturnValue(answer.promise)
    const probing = state().probe()

    state().reset()
    answer.resolve({ used: 9, limit: 30 })
    await probing

    expect(state().availability).toBe("unknown")
    expect(state().usage).toBeNull()
  })

  it("probe: a 503 meant for the earlier account does not hide the feature for the next", async () => {
    const answer = deferred<AssistantUsage>()
    api.getAssistantUsage.mockReturnValue(answer.promise)
    const probing = state().probe()

    state().reset()
    answer.reject(http(503))
    await probing

    expect(state().availability).toBe("unknown")
  })

  it("the list of conversations of the earlier account never shows for the next", async () => {
    const answer = deferred<AssistantConversation[]>()
    api.listConversations.mockReturnValue(answer.promise)
    const loading = state().loadConversations()

    state().reset()
    answer.resolve([conversation("secret", "Chuyện riêng")])
    await loading

    expect(state().conversations).toEqual([])
    expect(state().status).toBe("idle")
  })

  it("a failure of the earlier account's request is not shown to the next", async () => {
    const answer = deferred<AssistantConversation[]>()
    api.listConversations.mockReturnValue(answer.promise)
    const loading = state().loadConversations()

    state().reset()
    answer.reject(offline())
    await loading

    expect(state().status).toBe("idle")
    expect(state().error).toBeNull()
  })

  it("a conversation made for the earlier account is not added to the next", async () => {
    const answer = deferred<AssistantConversation>()
    api.createConversation.mockReturnValue(answer.promise)
    const creating = state().createConversation()

    state().reset()
    answer.resolve(conversation("old"))

    expect(await creating).toBeNull()
    expect(state().conversations).toEqual([])
  })

  it("usage and deletion of the earlier account do not touch the next either", async () => {
    api.listConversations.mockResolvedValue([conversation("a")])
    await state().loadConversations()
    const usage = deferred<AssistantUsage>()
    api.getAssistantUsage.mockReturnValue(usage.promise)
    const refreshing = state().refreshUsage()
    const deletion = deferred<void>()
    api.deleteConversation.mockReturnValue(deletion.promise)
    const removing = state().removeConversation("a")

    state().reset()
    api.listConversations.mockResolvedValue([conversation("a")])
    await state().loadConversations()
    usage.resolve({ used: 9, limit: 30 })
    deletion.reject(offline())
    await refreshing

    expect(await removing).toBe(false)
    expect(state().usage).toBeNull()
    expect(state().conversations.map((item) => item.id)).toEqual(["a"])
  })
})
