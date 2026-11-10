import { Controller, Param, Post, Res } from "@nestjs/common"
import {
  ApiConflictResponse,
  ApiGoneResponse,
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
import { AI_CHAT_THROTTLE } from "./ai.throttle.js"
import { ChatService } from "./chat.service.js"
import { streamRun } from "./sse-stream.js"

const ANSWER_DESCRIPTION =
  "Streams the rest of the answer as Server-Sent Events, like a message does: first `tool_result` " +
  "(what became of the change), then `text_delta` pieces and `done` (or `error`). The assistant " +
  "may propose another change, which ends the stream with `action_required` and `done`."

@ApiTags("ai")
@Controller("ai/actions")
@Auth()
@ApiServiceUnavailableResponse({ description: "The assistant is not configured (no API key)" })
export class ActionsController {
  constructor(private readonly chat: ChatService) {}

  // ThrottleGroup is a guard and the limit is per user, so it sits above @Auth() in effect.
  @Post(":id/confirm")
  @ThrottleGroup(AI_CHAT_THROTTLE)
  @ApiOperation({
    summary: "Approve a change the assistant proposed, carry it out, and stream the rest",
    description: ANSWER_DESCRIPTION,
  })
  @ApiProduces("text/event-stream")
  @ApiOkResponse({ description: "A stream of events" })
  @ApiNotFoundResponse({ description: "No such action of this user" })
  @ApiConflictResponse({ description: "Already answered, or an answer is being written" })
  @ApiGoneResponse({ description: "The 10 minutes to answer are over" })
  @ApiTooManyRequestsResponse({ description: "Too many messages in a row" })
  async confirm(
    @CurrentUser() user: AuthUser | null,
    @Param("id") id: string,
    @Res() response: Response,
  ): Promise<void> {
    await streamRun(response, await this.chat.resolveAction(user!.id, id, "confirm"))
  }

  @Post(":id/reject")
  @ThrottleGroup(AI_CHAT_THROTTLE)
  @ApiOperation({
    summary: "Turn down a change the assistant proposed, and stream the rest",
    description: ANSWER_DESCRIPTION,
  })
  @ApiProduces("text/event-stream")
  @ApiOkResponse({ description: "A stream of events" })
  @ApiNotFoundResponse({ description: "No such action of this user" })
  @ApiConflictResponse({ description: "Already answered, or an answer is being written" })
  @ApiGoneResponse({ description: "The 10 minutes to answer are over" })
  @ApiTooManyRequestsResponse({ description: "Too many messages in a row" })
  async reject(
    @CurrentUser() user: AuthUser | null,
    @Param("id") id: string,
    @Res() response: Response,
  ): Promise<void> {
    await streamRun(response, await this.chat.resolveAction(user!.id, id, "reject"))
  }
}
