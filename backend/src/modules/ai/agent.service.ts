import { Inject, Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import {
  LLM_CLIENT,
  LlmUnavailableError,
  textOf,
  toolCallsOf,
  type LlmClient,
  type LlmMessage,
  type LlmPart,
  type LlmResponse,
} from "../../shared/llm/llm-client.js"
import { MAX_TOOL_CALLS, readAiConfig } from "./ai.config.js"
import { ActionsService } from "./actions.service.js"
import { EMPTY_ANSWER, type ChatEvent } from "./chat-events.js"
import { ConversationsService } from "./conversations.service.js"
import { SYSTEM_PROMPT } from "./system-prompt.js"
import { ToolRegistry, failed } from "./tools/registry.js"
import type { Proposal } from "./tools/tool.js"
import { toolResultPart, type StoredToolResult } from "./tools/tool-message.js"

/** What one answer has written so far, so that it can be taken back if the answer is given up. */
export interface TurnRecord {
  messageIds: string[]
  actionIds: string[]
}

export interface AgentTurn {
  userId: string
  conversationId: string
  /** The conversation as the model sees it, ending with what the person said (or the last result). */
  history: LlmMessage[]
  signal: AbortSignal
  record: TurnRecord
}

/** Tracks of a played list that the card shows. */
const CARD_TRACKS = 10
const LIMIT_REACHED = "The tool limit for this message is reached. Answer with what you have."
const ONE_CHANGE =
  "Only one change can be proposed at a time. Wait for the user's answer, then propose the next."

/**
 * The model and its tools, in a loop: the model answers or asks for tools, the tools run, their
 * results go back, until the model has said its answer. At most `MAX_TOOL_CALLS` tools per message
 * (then the model is asked to answer without any). A tool that changes the user's data is not run:
 * it is proposed, the loop stops, and the person decides (see `ChatService.resolveAction`).
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name)
  private readonly maxTokens: number

  constructor(
    @Inject(LLM_CLIENT) private readonly llm: LlmClient | null,
    private readonly conversations: ConversationsService,
    private readonly actions: ActionsService,
    private readonly registry: ToolRegistry,
    config: ConfigService,
  ) {
    this.maxTokens = readAiConfig(config).maxTokens
  }

  /** The events of one answer. Throws what the model throws; the caller tells the person. */
  async *run(turn: AgentTurn): AsyncGenerator<ChatEvent, void> {
    const llm = this.llm
    if (!llm) return
    const context = { userId: turn.userId }
    const messages = [...turn.history]
    let budget = MAX_TOOL_CALLS
    let requests = 0

    for (let round = 0; round <= MAX_TOOL_CALLS; round += 1) {
      // Out of tools: the model is asked for its answer without being offered any.
      const tools = budget > 0 ? this.registry.declarations() : undefined
      let response: LlmResponse | null = null
      for await (const event of llm.stream({
        system: SYSTEM_PROMPT,
        messages,
        tools,
        maxOutputTokens: this.maxTokens,
        signal: turn.signal,
      })) {
        if (event.type === "text_delta") yield { type: "text_delta", text: event.text }
        else response = event.response
      }
      if (!response) throw new LlmUnavailableError("The model gave no answer")
      requests += response.requests

      const calls = tools ? toolCallsOf(response.message) : []
      if (calls.length === 0) {
        if (!textOf(response.message).trim()) return yield EMPTY_ANSWER
        const messageId = await this.save(turn, "assistant", response.message.parts)
        this.logger.log(
          `Answered with ${requests} request(s) to ${llm.provider} and ${MAX_TOOL_CALLS - budget} tool call(s): ` +
            `${response.usage.inputTokens} in, ${response.usage.outputTokens} out last round`,
        )
        return yield {
          type: "done",
          messageId,
          truncated: response.finish === "length",
          awaitingAction: false,
        }
      }

      const assistantId = await this.save(turn, "assistant", response.message.parts)
      messages.push(response.message)
      const results: StoredToolResult[] = []
      let proposed: { call: { id: string; name: string }; proposal: Proposal } | null = null

      for (const call of calls) {
        if (budget <= 0) {
          results.push(toolResultPart(call.id, call.name, failed(LIMIT_REACHED)))
          continue
        }
        budget -= 1
        yield { type: "tool_call", callId: call.id, name: call.name, args: call.args }
        const tool = this.registry.get(call.name)

        if (tool?.kind === "write") {
          if (proposed) {
            results.push(toolResultPart(call.id, call.name, failed(ONE_CHANGE)))
            yield { type: "tool_result", callId: call.id, name: call.name, ok: false }
            continue
          }
          const checked = await this.registry.propose(tool, context, call.args)
          if ("proposal" in checked) {
            proposed = { call, proposal: checked.proposal }
            continue
          }
          this.reportUnexpected(call.name, checked.unexpected)
          results.push(toolResultPart(call.id, call.name, checked.outcome))
          yield { type: "tool_result", callId: call.id, name: call.name, ok: false }
          continue
        }

        const { outcome, unexpected } = await this.registry.runImmediate(
          call.name,
          context,
          call.args,
        )
        this.reportUnexpected(call.name, unexpected)
        results.push(toolResultPart(call.id, call.name, outcome))
        let display = outcome.display
          ? await this.registry.hydrate(outcome.display, turn.userId)
          : undefined
        if (outcome.clientAction) {
          // The tracks are looked up once: they are for the app to play and, the first few, for the card.
          const { trackIds } = outcome.clientAction
          const tracks =
            (await this.registry.hydrate({ tracks: trackIds }, turn.userId))?.tracks ?? []
          display = tracks.length > 0 ? { tracks: tracks.slice(0, CARD_TRACKS) } : undefined
          yield { type: "client_action", action: "play_tracks", trackIds, tracks }
        }
        yield { type: "tool_result", callId: call.id, name: call.name, ok: outcome.ok, display }
      }

      if (proposed) {
        // The other results of this round wait with the change: the model needs them all in one
        // message, and the change is not answered yet.
        const action = await this.actions.create(turn.userId, turn.conversationId, {
          callId: proposed.call.id,
          tool: proposed.call.name,
          ...proposed.proposal,
          peers: results,
        })
        turn.record.actionIds.push(action.id)
        yield {
          type: "action_required",
          actionId: action.id,
          callId: proposed.call.id,
          tool: proposed.call.name,
          summary: action.summary,
          input: action.input,
          expiresAt: action.expiresAt.toISOString(),
        }
        return yield {
          type: "done",
          messageId: assistantId,
          truncated: false,
          awaitingAction: true,
        }
      }

      await this.save(turn, "user", results)
      messages.push({ role: "user", parts: results })
    }
    throw new LlmUnavailableError("The model kept asking for tools")
  }

  private async save(
    turn: AgentTurn,
    role: "user" | "assistant",
    parts: readonly LlmPart[],
  ): Promise<string> {
    const id = await this.conversations.add(turn.conversationId, role, parts)
    turn.record.messageIds.push(id)
    return id
  }

  private reportUnexpected(tool: string, error: unknown): void {
    if (error === undefined) return
    this.logger.error(`The tool ${tool} failed: ${error instanceof Error ? error.message : error}`)
  }
}
