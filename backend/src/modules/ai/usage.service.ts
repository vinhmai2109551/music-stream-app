import { HttpException, HttpStatus, Injectable } from "@nestjs/common"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import { QUOTA_TIME_ZONE } from "./ai.config.js"

/** One message taken from the daily limit, to be given back on the day it was taken. */
export interface UsageTicket {
  userId: string
  /** The day it was counted on (YYYY-MM-DD, in the time zone of the limit). */
  day: string
}

export interface AiUsageView {
  /** Messages sent today. */
  used: number
  /** Messages allowed per day. */
  limit: number
}

/**
 * The daily limit of messages per user. The count lives in its own table, not in the messages, so
 * deleting a conversation does not give messages back. The day is the day of `QUOTA_TIME_ZONE`.
 */
@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Counts one message, or answers 429 when `limit` are used up. One statement does both, so two
   * messages sent at the same moment cannot both take the last place.
   */
  async consume(userId: string, limit: number): Promise<UsageTicket> {
    const rows = await this.prisma.$queryRaw<{ day: string }[]>`
      INSERT INTO "AiUsage" ("userId", day, messages)
      VALUES (${userId}, (now() AT TIME ZONE ${QUOTA_TIME_ZONE})::date, 1)
      ON CONFLICT ("userId", day) DO UPDATE SET messages = "AiUsage".messages + 1
        WHERE "AiUsage".messages < ${limit}
      RETURNING day::text AS day`
    if (rows.length === 0) {
      throw new HttpException(
        `Bạn đã dùng hết ${limit} tin nhắn hôm nay. Hãy quay lại vào ngày mai nhé.`,
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
    return { userId, day: rows[0].day }
  }

  /**
   * Gives back the message of an answer that never came (the model failed, the person left), on
   * the day it was taken: an answer that fails after midnight does not change the new day.
   */
  async release(ticket: UsageTicket): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "AiUsage" SET messages = GREATEST(messages - 1, 0)
      WHERE "userId" = ${ticket.userId} AND day = ${ticket.day}::date`
  }

  async today(userId: string, limit: number): Promise<AiUsageView> {
    const rows = await this.prisma.$queryRaw<{ messages: number }[]>`
      SELECT messages FROM "AiUsage"
      WHERE "userId" = ${userId} AND day = (now() AT TIME ZONE ${QUOTA_TIME_ZONE})::date`
    return { used: rows[0]?.messages ?? 0, limit }
  }
}
