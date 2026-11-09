import { Module } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { FakeLlmClient } from "../../shared/llm/fake-llm-client.js"
import { GeminiInteractionsClient } from "../../shared/llm/gemini-interactions.client.js"
import { LLM_CLIENT, type LlmClient } from "../../shared/llm/llm-client.js"
import { readAiConfig } from "./ai.config.js"
import { AiController } from "./ai.controller.js"
import { ChatService } from "./chat.service.js"
import { ConversationsService } from "./conversations.service.js"
import { UsageService } from "./usage.service.js"

/**
 * The model behind the assistant: Gemini when there is a key, otherwise none (null), which
 * switches the assistant off - its endpoints answer 503 and the rest of the API is unaffected.
 */
export function createLlmClient(config: ConfigService): LlmClient | null {
  const settings = readAiConfig(config)
  if (config.get<string>("AI_PROVIDER")?.trim().toLowerCase() === "fake") return new FakeLlmClient()
  if (!settings.apiKey) return null
  return new GeminiInteractionsClient({
    apiKey: settings.apiKey,
    model: settings.model,
    thinkingLevel: settings.thinkingLevel,
  })
}

/** The AI assistant: conversations, the daily limit, and the streamed answers. */
@Module({
  controllers: [AiController],
  providers: [
    { provide: LLM_CLIENT, inject: [ConfigService], useFactory: createLlmClient },
    ConversationsService,
    UsageService,
    ChatService,
  ],
})
export class AiModule {}
