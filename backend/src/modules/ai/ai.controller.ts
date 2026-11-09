import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
} from "@nestjs/common"
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from "@nestjs/swagger"
import type { Response } from "express"
import { Auth, CurrentUser, ThrottleGroup, type AuthUser } from "../../shared/index.js"
import { HEARTBEAT_MS } from "./ai.config.js"
import { AI_CHAT_THROTTLE } from "./ai.throttle.js"
import { toSse } from "./chat-events.js"
import { ChatService } from "./chat.service.js"
import {
  ConversationsService,
  type AiMessageView,
  type ConversationView,
} from "./conversations.service.js"
import { SendMessageDto } from "./dto/send-message.dto.js"
import { UsageService, type AiUsageView } from "./usage.service.js"

@ApiTags("ai")
@Controller("ai")
@Auth()
@ApiServiceUnavailableResponse({ description: "The assistant is not configured (no API key)" })
export class AiController {
  constructor(
    private readonly chat: ChatService,
    private readonly conversations: ConversationsService,
    private readonly usage: UsageService,
  ) {}

  @Get("usage")
  @ApiOperation({ summary: "Messages sent today and the daily limit" })
  @ApiOkResponse({ description: "{ used, limit }" })
  today(@CurrentUser() user: AuthUser | null): Promise<AiUsageView> {
    this.chat.assertEnabled()
    return this.usage.today(user!.id, this.chat.limit)
  }

  @Post("conversations")
  @ApiOperation({ summary: "Start a conversation" })
  @ApiCreatedResponse({ description: "The new, empty conversation" })
  create(@CurrentUser() user: AuthUser | null): Promise<ConversationView> {
    this.chat.assertEnabled()
    return this.conversations.create(user!.id)
  }

  @Get("conversations")
  @ApiOperation({ summary: "The user's conversations, most recently used first (at most 50)" })
  list(@CurrentUser() user: AuthUser | null): Promise<ConversationView[]> {
    this.chat.assertEnabled()
    return this.conversations.list(user!.id)
  }

  @Get("conversations/:id/messages")
  @ApiOperation({ summary: "What was said in a conversation, oldest first" })
  @ApiNotFoundResponse({ description: "No such conversation of this user" })
  messages(
    @CurrentUser() user: AuthUser | null,
    @Param("id") id: string,
  ): Promise<AiMessageView[]> {
    this.chat.assertEnabled()
    return this.conversations.messages(user!.id, id)
  }

  @Delete("conversations/:id")
  @HttpCode(204)
  @ApiOperation({
    summary: "Delete a conversation",
    description: "Its messages go too. The messages already sent today still count for the limit.",
  })
  @ApiNoContentResponse({ description: "Deleted" })
  @ApiNotFoundResponse({ description: "No such conversation of this user" })
  async remove(@CurrentUser() user: AuthUser | null, @Param("id") id: string): Promise<void> {
    this.chat.assertEnabled()
    await this.conversations.assertOwner(user!.id, id)
    // An answer being written would be lost, and its message given back, if its chat vanished.
    if (this.chat.isBusy(id)) {
      throw new ConflictException("Trợ lý đang trả lời, bạn đợi một chút rồi xoá nhé")
    }
    await this.conversations.remove(user!.id, id)
  }

  // Listed above @Auth() in effect: ThrottleGroup is a guard and the limit is per user.
  @Post("conversations/:id/messages")
  @ThrottleGroup(AI_CHAT_THROTTLE)
  @ApiOperation({
    summary: "Send a message and receive the answer as a stream of events",
    description:
      "The answer is a Server-Sent Events stream (`text/event-stream`). Events: `text_delta` " +
      "`{ text }` (a piece of the answer), then `done` `{ messageId, truncated }` or `error` " +
      "`{ code, message }`. Errors found before the stream starts are ordinary JSON responses. " +
      "Closing the connection stops the model; the unanswered message is then not kept or counted.",
  })
  @ApiProduces("text/event-stream")
  @ApiOkResponse({ description: "A stream of events" })
  @ApiBadRequestResponse({ description: "The text is empty or longer than 2000 characters" })
  @ApiNotFoundResponse({ description: "No such conversation of this user" })
  @ApiConflictResponse({ description: "The previous answer is still being written" })
  @ApiTooManyRequestsResponse({ description: "Too many messages in a row, or the daily limit" })
  async send(
    @CurrentUser() user: AuthUser | null,
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
    @Res() response: Response,
  ): Promise<void> {
    // Everything that can be refused is refused here, while an ordinary error response is possible.
    const run = await this.chat.start(user!.id, id, dto.text)

    const gone = new AbortController()
    response.on("close", () => {
      if (!response.writableFinished) gone.abort()
    })
    let heartbeat: NodeJS.Timeout | undefined
    try {
      response.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        // Tells nginx-style proxies not to hold the events back.
        "X-Accel-Buffering": "no",
      })
      response.flushHeaders()
      heartbeat = setInterval(() => response.write(": ping\n\n"), HEARTBEAT_MS)
      for await (const event of run.events(gone.signal)) {
        if (gone.signal.aborted) break
        response.write(toSse(event))
      }
    } finally {
      clearInterval(heartbeat)
      // If the events were never read (something failed before), the message is given up here.
      await run.cancel()
      response.end()
    }
  }
}
