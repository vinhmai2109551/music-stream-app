import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import type { Prisma } from "../../generated/prisma/client.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import { textOf, type LlmPart } from "../../shared/llm/llm-client.js"
import {
  HISTORY_MESSAGES,
  MAX_CONVERSATIONS,
  MAX_MESSAGES_SHOWN,
  MAX_TITLE_CHARS,
} from "./ai.config.js"
import type { StoredMessage } from "./history.js"

export interface ConversationView {
  id: string
  /** The start of the first message; empty until there is one. */
  title: string
  createdAt: Date
  updatedAt: Date
}

/** A message as the app shows it: only what was said, never the tool traffic. */
export interface AiMessageView {
  id: string
  role: "user" | "assistant"
  text: string
  createdAt: Date
}

/** Rows read to find the last `HISTORY_MESSAGES` that make sense (tool traffic is skipped over). */
const HISTORY_ROWS = HISTORY_MESSAGES * 3

const roleOf = (role: "USER" | "ASSISTANT") => (role === "USER" ? "user" : "assistant")

/** The first line of a message, cut to `MAX_TITLE_CHARS` with "…". */
export function titleOf(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim()
  return flat.length <= MAX_TITLE_CHARS ? flat : `${flat.slice(0, MAX_TITLE_CHARS - 1).trimEnd()}…`
}

/** Owns the conversations and their messages. Every method is limited to one user's data. */
@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A new, empty conversation. If the user already has one with nothing said in it, that one is
   * given again (tapping "new chat" twice makes one chat, not two). At `MAX_CONVERSATIONS` the
   * list could not show another, so it is refused with 409.
   */
  async create(userId: string): Promise<ConversationView> {
    const select = { id: true, title: true, createdAt: true, updatedAt: true } as const
    const empty = await this.prisma.aiConversation.findFirst({
      where: { userId, messages: { none: {} } },
      orderBy: { createdAt: "desc" },
      select,
    })
    if (empty) return empty
    if ((await this.prisma.aiConversation.count({ where: { userId } })) >= MAX_CONVERSATIONS) {
      throw new ConflictException(
        `Bạn đã có ${MAX_CONVERSATIONS} cuộc trò chuyện. Hãy xoá bớt cuộc cũ rồi tạo mới nhé.`,
      )
    }
    return this.prisma.aiConversation.create({ data: { userId, title: "" }, select })
  }

  /** The most recently used first. */
  list(userId: string): Promise<ConversationView[]> {
    return this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: MAX_CONVERSATIONS,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })
  }

  /** 404 for a conversation that does not exist or belongs to someone else (no difference shown). */
  async assertOwner(userId: string, conversationId: string): Promise<{ title: string }> {
    const found = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
      select: { title: true },
    })
    if (!found) throw new NotFoundException("Conversation not found")
    return found
  }

  async messages(userId: string, conversationId: string): Promise<AiMessageView[]> {
    await this.assertOwner(userId, conversationId)
    // The latest MAX_MESSAGES_SHOWN rows, oldest first.
    const newest = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MAX_MESSAGES_SHOWN,
    })
    const rows = newest.reverse()
    return rows.flatMap((row) => {
      const text = textOf({ role: "assistant", parts: row.content as unknown as LlmPart[] })
      return text ? [{ id: row.id, role: roleOf(row.role), text, createdAt: row.createdAt }] : []
    })
  }

  async remove(userId: string, conversationId: string): Promise<void> {
    await this.assertOwner(userId, conversationId)
    await this.prisma.aiConversation.delete({ where: { id: conversationId } })
  }

  /** The newest messages of the conversation, oldest first, with their parts as stored. */
  async history(conversationId: string): Promise<StoredMessage[]> {
    const rows = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: HISTORY_ROWS,
    })
    return rows.reverse().map((row) => ({
      role: roleOf(row.role),
      parts: row.content as unknown as LlmPart[],
    }))
  }

  /** Stores a message and marks the conversation as used now. Returns the id of the message. */
  async add(
    conversationId: string,
    role: "user" | "assistant",
    parts: readonly LlmPart[],
  ): Promise<string> {
    const [message] = await this.prisma.$transaction([
      this.prisma.aiMessage.create({
        data: {
          conversationId,
          role: role === "user" ? "USER" : "ASSISTANT",
          content: parts as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      }),
      this.prisma.aiConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ])
    return message.id
  }

  /** Takes a message back (the answer to it failed), so that no question is left unanswered. */
  async discard(messageId: string): Promise<void> {
    await this.prisma.aiMessage.deleteMany({ where: { id: messageId } })
  }

  /** Names a conversation after its first message; one that already has a name keeps it. */
  async nameIfEmpty(conversationId: string, text: string): Promise<void> {
    await this.prisma.aiConversation.updateMany({
      where: { id: conversationId, title: "" },
      data: { title: titleOf(text) },
    })
  }
}
