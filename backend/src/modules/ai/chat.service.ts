import {
  ConflictException,
  GoneException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { LLM_CLIENT, type LlmClient } from "../../shared/llm/llm-client.js"
import { ActionsService } from "./actions.service.js"
import { AgentService, type TurnRecord } from "./agent.service.js"
import { ANSWER_TIMEOUT_MS, HISTORY_MESSAGES, readAiConfig } from "./ai.config.js"
import { describeChatError, type ChatEvent } from "./chat-events.js"
import { ConversationsService } from "./conversations.service.js"
import { windowHistory } from "./history.js"
import { ToolRegistry, failed } from "./tools/registry.js"
import { REJECTED, toolResultPart } from "./tools/tool-message.js"
import { UsageService, type UsageTicket } from "./usage.service.js"

/** A message or an answer to a proposed change that was accepted: its events are the answer. */
export interface ChatRun {
  /**
   * The answer, event by event. Always iterate it to the end (or stop it with `return()`): its
   * `finally` frees the conversation and, if the answer was not completed, takes back what it wrote
   * and gives the message back to the daily limit. `signal` stops the model when the person leaves.
   */
  events(signal: AbortSignal): AsyncGenerator<ChatEvent, void>
  /**
   * Gives the message up without ever reading its events (something failed before the stream
   * began). Does nothing once the events were read to the end. Safe to call more than once.
   */
  cancel(): Promise<void>
}

/** What a turn is made of, to take it back if it is given up. */
interface Turn {
  userId: string
  conversationId: string
  /** The question of the person, when the turn began with one. */
  questionId: string | null
  /** The message taken from the daily limit, when the turn began with one. */
  ticket: UsageTicket | null
  record: TurnRecord
}

const LIMIT_NOTE = " Hôm nay bạn đã dùng hết lượt nhắn tin với trợ lý nên mình chưa nói thêm được."
const LIMIT_DONE = `Đã thực hiện xong.${LIMIT_NOTE}`
const LIMIT_REJECTED = `Mình đã bỏ qua đề xuất đó.${LIMIT_NOTE}`
const LIMIT_FAILED = `Chưa làm được việc này.${LIMIT_NOTE}`

const emptyRecord = (): TurnRecord => ({ messageIds: [], actionIds: [] })

/**
 * One message of a conversation, or the answer of the person to a proposed change: checks that it
 * may happen, keeps what was said, runs the agent and streams its events. Nothing here knows which
 * provider the model is.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)
  private readonly dailyLimit: number
  /** Conversations with an answer being written: a second message must wait for the first. */
  private readonly busy = new Set<string>()

  constructor(
    @Inject(LLM_CLIENT) private readonly llm: LlmClient | null,
    private readonly conversations: ConversationsService,
    private readonly usage: UsageService,
    private readonly actions: ActionsService,
    private readonly agent: AgentService,
    private readonly registry: ToolRegistry,
    config: ConfigService,
  ) {
    this.dailyLimit = readAiConfig(config).dailyMessageLimit
  }

  get enabled(): boolean {
    return this.llm !== null
  }

  get limit(): number {
    return this.dailyLimit
  }

  /** True while an answer is being written in the conversation. */
  isBusy(conversationId: string): boolean {
    return this.busy.has(conversationId)
  }

  /** 503 while there is no model: the whole assistant is off. */
  assertEnabled(): void {
    if (!this.llm) throw new ServiceUnavailableException("The assistant is not configured")
  }

  /**
   * Accepts a message, or throws before anything is sent: 404 (not your conversation), 409 (the
   * previous answer is still being written), 429 (the daily limit), 503 (no model). The question
   * is saved and counted at this point. A change still waiting for an answer is over now.
   */
  async start(userId: string, conversationId: string, text: string): Promise<ChatRun> {
    this.assertEnabled()
    await this.conversations.assertOwner(userId, conversationId)
    this.lock(conversationId)
    let ticket: UsageTicket | null = null
    try {
      ticket = await this.usage.consume(userId, this.dailyLimit)
      await this.actions.closeWaiting(conversationId)
      const questionId = await this.conversations.add(conversationId, "user", [
        { type: "text", text },
      ])
      const turn: Turn = { userId, conversationId, questionId, ticket, record: emptyRecord() }
      return this.run(turn, [], text)
    } catch (error) {
      this.busy.delete(conversationId)
      if (ticket) await this.usage.release(ticket).catch(() => undefined)
      throw error
    }
  }

  /**
   * The person says yes or no to a change the assistant proposed. A yes carries it out; either
   * way the model is told what happened and goes on with its answer, which counts as a message of
   * the daily limit. At the limit the change still stands and is reported, and the assistant says
   * nothing more. 404 (not yours), 409 (already answered, or an answer is being written), 410 (the
   * 10 minutes are over).
   */
  async resolveAction(
    userId: string,
    actionId: string,
    decision: "confirm" | "reject",
  ): Promise<ChatRun> {
    this.assertEnabled()
    const action = await this.actions.find(userId, actionId)
    if (!action) throw new NotFoundException("Action not found")
    this.lock(action.conversationId)
    try {
      const claimed = await this.actions.claim(
        action,
        decision === "confirm" ? "CONFIRMED" : "REJECTED",
      )
      if (claimed === "expired") throw new GoneException("Yêu cầu này đã hết hạn (quá 10 phút)")
      if (claimed === "resolved") throw new ConflictException("Yêu cầu này đã được xử lý rồi")

      const { outcome, unexpected } =
        decision === "confirm"
          ? await this.registry.executeApproved(action.tool, { userId }, action.input)
          : { outcome: failed(REJECTED), unexpected: undefined }
      if (unexpected !== undefined) {
        this.logger.error(`The change ${action.tool} failed: ${String(unexpected)}`)
      }
      await this.actions.saveResult(action, outcome.result)
      // All the results of the round go to the model together, in one message.
      await this.conversations.add(action.conversationId, "user", [
        ...action.peers,
        toolResultPart(action.callId, action.tool, outcome),
      ])
      const result: ChatEvent = {
        type: "tool_result",
        callId: action.callId,
        name: action.tool,
        ok: decision === "confirm" && outcome.ok,
        display: await this.registry.hydrate(outcome.display, userId),
        action: { id: action.id, status: decision === "confirm" ? "CONFIRMED" : "REJECTED" },
      }
      const turn: Turn = {
        userId,
        conversationId: action.conversationId,
        questionId: null,
        ticket: null,
        record: emptyRecord(),
      }
      try {
        turn.ticket = await this.usage.consume(userId, this.dailyLimit)
      } catch (error) {
        if (!(error instanceof HttpException) || error.getStatus() !== 429) throw error
        const done = decision === "confirm" && outcome.ok
        return this.run(
          turn,
          [result],
          null,
          done ? LIMIT_DONE : decision === "reject" ? LIMIT_REJECTED : LIMIT_FAILED,
        )
      }
      return this.run(turn, [result], null)
    } catch (error) {
      this.busy.delete(action.conversationId)
      throw error
    }
  }

  private lock(conversationId: string): void {
    if (this.busy.has(conversationId)) {
      throw new ConflictException("Trợ lý đang trả lời tin nhắn trước, bạn đợi một chút nhé")
    }
    this.busy.add(conversationId)
  }

  private run(
    turn: Turn,
    leading: ChatEvent[],
    question: string | null,
    closing?: string,
  ): ChatRun {
    // One way out for every ending: free the conversation and, if the answer was not completed,
    // take back what this turn wrote and give the message back. A second call does nothing.
    let closed = false
    const close = async (saved: boolean) => {
      if (closed) return
      closed = true
      this.busy.delete(turn.conversationId)
      if (saved) return
      await this.conversations
        .discard([...(turn.questionId ? [turn.questionId] : []), ...turn.record.messageIds])
        .catch(() => undefined)
      await this.actions.discard(turn.record.actionIds).catch(() => undefined)
      if (turn.ticket) await this.usage.release(turn.ticket).catch(() => undefined)
    }
    return {
      events: (signal) => this.respond(turn, leading, question, signal, close, closing),
      cancel: () => close(false),
    }
  }

  private async *respond(
    turn: Turn,
    leading: ChatEvent[],
    question: string | null,
    clientGone: AbortSignal,
    close: (saved: boolean) => Promise<void>,
    closing?: string,
  ): AsyncGenerator<ChatEvent, void> {
    const deadline = AbortSignal.timeout(ANSWER_TIMEOUT_MS)
    const signal = AbortSignal.any([clientGone, deadline])
    let saved = false
    try {
      yield* leading
      if (closing !== undefined) {
        // No model call: the answer is a fixed sentence.
        const messageId = await this.conversations.add(turn.conversationId, "assistant", [
          { type: "text", text: closing },
        ])
        saved = true
        yield { type: "text_delta", text: closing }
        yield { type: "done", messageId, truncated: false, awaitingAction: false }
        return
      }
      const history = windowHistory(
        await this.conversations.history(turn.conversationId),
        HISTORY_MESSAGES,
      )
      for await (const event of this.agent.run({
        userId: turn.userId,
        conversationId: turn.conversationId,
        history,
        signal,
        record: turn.record,
      })) {
        if (event.type === "done") {
          saved = true
          if (question) {
            await this.conversations
              .nameIfEmpty(turn.conversationId, question)
              .catch(() => undefined)
          }
        }
        yield event
      }
    } catch (error) {
      // The person left: nobody to tell. Anything else is told to them as a friendly line.
      if (clientGone.aborted) return
      if (!(error instanceof Error && error.name.startsWith("Llm"))) {
        this.logger.error(`The answer failed: ${error instanceof Error ? error.message : error}`)
      } else {
        this.logger.warn(`The answer failed: ${error.message}`)
      }
      yield describeChatError(error, deadline.aborted)
    } finally {
      await close(saved)
    }
  }
}
