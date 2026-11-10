import { Injectable } from "@nestjs/common"
import type { AiPendingAction, Prisma } from "../../generated/prisma/client.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import type { JsonObject, LlmPart } from "../../shared/llm/llm-client.js"
import { ACTION_TTL_MS } from "./ai.config.js"
import { ConversationsService } from "./conversations.service.js"
import { failed } from "./tools/registry.js"
import {
  NOT_ANSWERED,
  NOT_RECORDED,
  REJECTED,
  toolResultPart,
  type StoredToolResult,
} from "./tools/tool-message.js"

export type ActionStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "EXPIRED"

/** A change the assistant proposed and the person has to approve. */
export interface PendingActionView {
  id: string
  conversationId: string
  callId: string
  tool: string
  input: JsonObject
  /** One sentence that says what will happen. */
  summary: string
  /** `EXPIRED` also when 10 minutes passed and nobody has looked at it yet. */
  status: ActionStatus
  expiresAt: Date
  /**
   * The results of the other tool calls of the same round. They are kept here, not in the
   * conversation, until the change is answered: the model needs all the results of a round
   * together, in one message.
   */
  peers: StoredToolResult[]
}

export type ClaimResult =
  /** Taken: the caller now carries it out (or turns it down). */
  | "claimed"
  /** Already answered. */
  | "resolved"
  /** The time to answer is over (it is now marked expired). */
  | "expired"

/** What `AiPendingAction.result` holds: the peers while it waits, the outcome once it is answered. */
interface StoredResult {
  peers?: StoredToolResult[]
  outcome?: unknown
}

function toView(row: AiPendingAction, now = new Date()): PendingActionView {
  const lapsed = row.status === "PENDING" && row.expiresAt <= now
  const stored = (row.result ?? {}) as StoredResult
  return {
    id: row.id,
    conversationId: row.conversationId,
    callId: row.callId,
    tool: row.tool,
    input: row.input as unknown as JsonObject,
    summary: row.summary,
    status: lapsed ? "EXPIRED" : row.status,
    expiresAt: row.expiresAt,
    peers: stored.peers ?? [],
  }
}

/** The changes the assistant proposed: a person has to say yes to each one, within 10 minutes. */
@Injectable()
export class ActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
  ) {}

  async create(
    userId: string,
    conversationId: string,
    proposal: {
      callId: string
      tool: string
      input: JsonObject
      summary: string
      peers: StoredToolResult[]
    },
  ): Promise<PendingActionView> {
    const row = await this.prisma.aiPendingAction.create({
      data: {
        userId,
        conversationId,
        callId: proposal.callId,
        tool: proposal.tool,
        input: proposal.input as Prisma.InputJsonValue,
        summary: proposal.summary,
        expiresAt: new Date(Date.now() + ACTION_TTL_MS),
        result: { peers: proposal.peers } as unknown as Prisma.InputJsonValue,
      },
    })
    return toView(row)
  }

  /** Only the user's own: another user's action does not exist for them. */
  async find(userId: string, id: string): Promise<PendingActionView | null> {
    const row = await this.prisma.aiPendingAction.findFirst({ where: { id, userId } })
    return row ? toView(row) : null
  }

  /** Every action of a conversation, by the id of the tool call that proposed it. */
  async ofConversation(conversationId: string): Promise<Map<string, PendingActionView>> {
    const rows = await this.prisma.aiPendingAction.findMany({ where: { conversationId } })
    const now = new Date()
    return new Map(rows.map((row) => [row.callId, toView(row, now)]))
  }

  /**
   * Takes the action to answer it: one statement, so two answers at the same moment cannot both
   * win. An action whose time is over is marked expired instead, and the model is told.
   */
  async claim(action: PendingActionView, decision: "CONFIRMED" | "REJECTED"): Promise<ClaimResult> {
    const taken = await this.prisma.aiPendingAction.updateMany({
      where: { id: action.id, status: "PENDING", expiresAt: { gt: new Date() } },
      data: { status: decision, resolvedAt: new Date() },
    })
    if (taken.count === 1) return "claimed"
    const current = await this.prisma.aiPendingAction.findUnique({ where: { id: action.id } })
    if (current?.status === "PENDING") {
      await this.expire([action])
      return "expired"
    }
    return "resolved"
  }

  /** Keeps what the action gave back (or why it did not run), with the peers it was waiting with. */
  async saveResult(action: PendingActionView, outcome: unknown): Promise<void> {
    const stored: StoredResult = { peers: action.peers, outcome }
    await this.prisma.aiPendingAction.update({
      where: { id: action.id },
      data: { result: stored as unknown as Prisma.InputJsonValue },
    })
  }

  /**
   * Marks actions as not answered, and tells the model so with the results that waited for it, in
   * one message, so that all the calls of the round have their result.
   */
  async expire(actions: readonly PendingActionView[]): Promise<void> {
    for (const action of actions) {
      await this.prisma.aiPendingAction.updateMany({
        where: { id: action.id, status: "PENDING" },
        data: { status: "EXPIRED", resolvedAt: new Date() },
      })
      await this.conversations.add(action.conversationId, "user", [
        ...action.peers,
        toolResultPart(action.callId, action.tool, failed(NOT_ANSWERED)),
      ])
    }
  }

  /**
   * Before a new message the conversation is made valid again: a change still waiting for an answer
   * is over (the person wrote something else), and any tool call that has no result - because a
   * failure came between the call and its result - gets one. A model may not be given a call
   * without a result.
   */
  async closeWaiting(conversationId: string): Promise<void> {
    const waiting = await this.prisma.aiPendingAction.findMany({
      where: { conversationId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
    })
    await this.expire(waiting.map((row) => toView(row)))
    await this.repair(conversationId)
  }

  private async repair(conversationId: string): Promise<void> {
    const history = await this.conversations.history(conversationId)
    const answered = new Set<string>()
    const asked: { id: string; name: string }[] = []
    for (const message of history) {
      for (const part of message.parts) {
        if (part.type === "tool_call") asked.push({ id: part.id, name: part.name })
        if (part.type === "tool_result") answered.add(part.callId)
      }
    }
    const missing = asked.filter((call) => !answered.has(call.id))
    if (missing.length === 0) return
    const actions = await this.ofConversation(conversationId)
    const parts: LlmPart[] = missing.map((call) => {
      const status = actions.get(call.id)?.status
      const note =
        status === "CONFIRMED" ? NOT_RECORDED : status === "REJECTED" ? REJECTED : NOT_ANSWERED
      return toolResultPart(call.id, call.name, failed(note))
    })
    await this.conversations.add(conversationId, "user", parts)
  }

  /** Forgets actions proposed in an answer that was given up. */
  async discard(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return
    await this.prisma.aiPendingAction.deleteMany({ where: { id: { in: [...ids] } } })
  }
}
