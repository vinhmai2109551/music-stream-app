import { jest } from "@jest/globals"
import { HttpException, NotFoundException } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import type { JsonObject, LlmClient, LlmPart } from "../../../shared/llm/llm-client.js"
import { FakeLlmClient } from "../../../shared/llm/fake-llm-client.js"
import type {
  ActionStatus,
  ActionsService,
  ClaimResult,
  PendingActionView,
} from "../actions.service.js"
import { AgentService } from "../agent.service.js"
import { ChatService } from "../chat.service.js"
import type { ConversationsService, RawMessage } from "../conversations.service.js"
import type { StoredMessage } from "../history.js"
import { failed, ToolRegistry } from "../tools/registry.js"
import { NOT_ANSWERED, toolResultPart, type StoredToolResult } from "../tools/tool-message.js"
import type { UsageService } from "../usage.service.js"
import { fakeToolPorts } from "./fake-tool-ports.js"

export const USER = "u1"
export const CONVERSATION = "c1"

/** In-memory conversations: remembers what was added, discarded and named. */
export function fakeConversations(initial: StoredMessage[] = []) {
  const messages: (StoredMessage & { id: string })[] = initial.map((m, i) => ({
    ...m,
    id: `old${i}`,
  }))
  let next = 0
  const state = { named: [] as string[], owner: USER }
  const service = {
    assertOwner: jest.fn(async (userId: string, id: string) => {
      if (userId !== state.owner || id !== CONVERSATION) throw new NotFoundException()
      return { title: "" }
    }),
    history: jest.fn(async () => messages.map(({ role, parts }) => ({ role, parts }))),
    rawMessages: jest.fn(async (): Promise<RawMessage[]> =>
      messages.map((m) => ({ ...m, createdAt: new Date(0) })),
    ),
    add: jest.fn(async (_id: string, role: "user" | "assistant", parts: readonly LlmPart[]) => {
      next += 1
      messages.push({ id: `m${next}`, role, parts: [...parts] })
      return `m${next}`
    }),
    discard: jest.fn(async (ids: string | readonly string[]) => {
      for (const id of typeof ids === "string" ? [ids] : ids) {
        const index = messages.findIndex((m) => m.id === id)
        if (index !== -1) messages.splice(index, 1)
      }
    }),
    nameIfEmpty: jest.fn(async (_id: string, text: string) => void state.named.push(text)),
  }
  return { service: service as unknown as ConversationsService, messages, state, mocks: service }
}

/** A daily limit that counts. */
export function fakeUsage(limit = 30) {
  const state = { used: 0 }
  const service = {
    consume: jest.fn(async (_userId: string, _limit: number) => {
      if (state.used >= limit) throw new HttpException("limit", 429)
      state.used += 1
      return { userId: "u1", day: "2026-11-09" }
    }),
    release: jest.fn(async (_ticket: { userId: string; day: string }) => {
      state.used = Math.max(0, state.used - 1)
    }),
  }
  return { service: service as unknown as UsageService, state, mocks: service }
}

/** In-memory pending actions, with the same rules as the database ones. */
export function fakeActions(conversations: ReturnType<typeof fakeConversations>) {
  const rows = new Map<string, PendingActionView & { userId: string; result?: unknown }>()
  let next = 0
  const state = { rows }
  const expireOne = async (action: PendingActionView) => {
    const row = rows.get(action.id)
    if (row && row.status === "PENDING") row.status = "EXPIRED"
    await conversations.service.add(action.conversationId, "user", [
      ...action.peers,
      toolResultPart(action.callId, action.tool, failed(NOT_ANSWERED)),
    ])
  }
  const service = {
    create: jest.fn(
      async (
        userId: string,
        conversationId: string,
        proposal: {
          callId: string
          tool: string
          input: JsonObject
          summary: string
          peers: StoredToolResult[]
        },
      ) => {
        next += 1
        const row = {
          id: `a${next}`,
          userId,
          conversationId,
          ...proposal,
          status: "PENDING" as ActionStatus,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        }
        rows.set(row.id, row)
        return row
      },
    ),
    find: jest.fn(async (userId: string, id: string) => {
      const row = rows.get(id)
      return row && row.userId === userId ? row : null
    }),
    ofConversation: jest.fn(async () => new Map([...rows.values()].map((r) => [r.callId, r]))),
    claim: jest.fn(
      async (
        action: PendingActionView,
        decision: "CONFIRMED" | "REJECTED",
      ): Promise<ClaimResult> => {
        const row = rows.get(action.id)!
        if (row.status !== "PENDING") return "resolved"
        if (row.expiresAt.getTime() <= Date.now()) {
          await expireOne(row)
          return "expired"
        }
        row.status = decision
        return "claimed"
      },
    ),
    saveResult: jest.fn(async (action: PendingActionView, result: unknown) => {
      rows.get(action.id)!.result = result
    }),
    closeWaiting: jest.fn(async (conversationId: string) => {
      for (const row of [...rows.values()]) {
        if (row.conversationId === conversationId && row.status === "PENDING") await expireOne(row)
      }
    }),
    discard: jest.fn(async (ids: readonly string[]) => {
      for (const id of ids) rows.delete(id)
    }),
  }
  return { service: service as unknown as ActionsService, state, mocks: service }
}

export const fakeConfig = (settings: Record<string, string> = {}) =>
  ({ get: (key: string) => settings[key] }) as unknown as ConfigService

/** The whole chat, with a model of your choice and fakes for everything it stands on. */
export function buildChat(
  options: {
    llm?: LlmClient | null
    initial?: StoredMessage[]
    limit?: number
    settings?: Record<string, string>
    semantic?: boolean
  } = {},
) {
  const conversations = fakeConversations(options.initial)
  const usage = fakeUsage(options.limit)
  const actions = fakeActions(conversations)
  const tools = fakeToolPorts({ semantic: options.semantic })
  const registry = ToolRegistry.create(tools.ports)
  const llm = options.llm === undefined ? new FakeLlmClient() : options.llm
  const config = fakeConfig(options.settings)
  const agent = new AgentService(llm, conversations.service, actions.service, registry, config)
  const chat = new ChatService(
    llm,
    conversations.service,
    usage.service,
    actions.service,
    agent,
    registry,
    config,
  )
  return { chat, agent, llm, conversations, usage, actions, tools, registry }
}
