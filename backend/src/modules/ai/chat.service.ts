import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { LLM_CLIENT, type LlmClient, type LlmResponse } from "../../shared/llm/llm-client.js"
import { textOf } from "../../shared/llm/llm-client.js"
import { ANSWER_TIMEOUT_MS, HISTORY_MESSAGES, readAiConfig } from "./ai.config.js"
import { describeChatError, EMPTY_ANSWER, type ChatEvent } from "./chat-events.js"
import { ConversationsService } from "./conversations.service.js"
import { windowHistory } from "./history.js"
import { SYSTEM_PROMPT } from "./system-prompt.js"
import { UsageService, type UsageTicket } from "./usage.service.js"

/** A message that was accepted: its answer is produced by iterating `events`. */
export interface ChatRun {
  /**
   * The answer, event by event. Always iterate it to the end (or stop it with `return()`): its
   * `finally` frees the conversation and, if no answer was saved, takes the question back and
   * gives the message back to the daily limit. `signal` stops the model when the person leaves.
   */
  events(signal: AbortSignal): AsyncGenerator<ChatEvent, void>
  /**
   * Gives the message up without ever reading its events (something failed before the stream
   * began). Does nothing once the events were read to the end. Safe to call more than once.
   */
  cancel(): Promise<void>
}

/**
 * One message of a conversation: checks that it may be sent, keeps the question, asks the model
 * and streams the answer. Nothing here knows which provider the model is.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)
  private readonly dailyLimit: number
  private readonly maxTokens: number
  /** Conversations with an answer being written: a second message must wait for the first. */
  private readonly busy = new Set<string>()

  constructor(
    @Inject(LLM_CLIENT) private readonly llm: LlmClient | null,
    private readonly conversations: ConversationsService,
    private readonly usage: UsageService,
    config: ConfigService,
  ) {
    const settings = readAiConfig(config)
    this.dailyLimit = settings.dailyMessageLimit
    this.maxTokens = settings.maxTokens
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
   * is saved and counted at this point.
   */
  async start(userId: string, conversationId: string, text: string): Promise<ChatRun> {
    this.assertEnabled()
    await this.conversations.assertOwner(userId, conversationId)
    if (this.busy.has(conversationId)) {
      throw new ConflictException("Trợ lý đang trả lời tin nhắn trước, bạn đợi một chút nhé")
    }
    this.busy.add(conversationId)
    let ticket: UsageTicket | null = null
    try {
      ticket = await this.usage.consume(userId, this.dailyLimit)
      const questionId = await this.conversations.add(conversationId, "user", [
        { type: "text", text },
      ])
      // One way out for every ending: free the conversation and, if no answer was saved, take the
      // question back and give the message back. Running it twice does nothing the second time.
      const taken = ticket
      let closed = false
      const close = async (saved: boolean) => {
        if (closed) return
        closed = true
        this.busy.delete(conversationId)
        if (saved) return
        await this.conversations.discard(questionId).catch(() => undefined)
        await this.usage.release(taken).catch(() => undefined)
      }
      return {
        events: (signal) => this.answer(conversationId, text, signal, close),
        cancel: () => close(false),
      }
    } catch (error) {
      this.busy.delete(conversationId)
      if (ticket) await this.usage.release(ticket).catch(() => undefined)
      throw error
    }
  }

  private async *answer(
    conversationId: string,
    question: string,
    clientGone: AbortSignal,
    close: (saved: boolean) => Promise<void>,
  ): AsyncGenerator<ChatEvent, void> {
    const llm = this.llm
    if (!llm) return await close(false)
    const deadline = AbortSignal.timeout(ANSWER_TIMEOUT_MS)
    const signal = AbortSignal.any([clientGone, deadline])
    let saved = false
    try {
      const history = windowHistory(
        await this.conversations.history(conversationId),
        HISTORY_MESSAGES,
      )
      let response: LlmResponse | null = null
      for await (const event of llm.stream({
        system: SYSTEM_PROMPT,
        messages: history,
        maxOutputTokens: this.maxTokens,
        signal,
      })) {
        if (event.type === "text_delta") yield { type: "text_delta", text: event.text }
        else response = event.response
      }
      if (!response || !textOf(response.message).trim()) {
        yield EMPTY_ANSWER
        return
      }
      const messageId = await this.conversations.add(
        conversationId,
        "assistant",
        response.message.parts,
      )
      saved = true
      await this.conversations.nameIfEmpty(conversationId, question).catch(() => undefined)
      this.logger.log(
        `Answered a message with ${response.requests} request(s) to ${llm.provider}: ` +
          `${response.usage.inputTokens} in, ${response.usage.outputTokens} out, ` +
          `${response.usage.thoughtTokens} thinking`,
      )
      yield { type: "done", messageId, truncated: response.finish === "length" }
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
