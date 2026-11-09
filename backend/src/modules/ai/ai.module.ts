import { Module } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { FakeLlmClient } from "../../shared/llm/fake-llm-client.js"
import { GeminiInteractionsClient } from "../../shared/llm/gemini-interactions.client.js"
import { LLM_CLIENT, type LlmClient } from "../../shared/llm/llm-client.js"
import { AlbumsModule } from "../albums/index.js"
import { ArtistsModule } from "../artists/index.js"
import { EmbeddingsModule } from "../embeddings/index.js"
import { FollowsModule } from "../follows/index.js"
import { LikesModule } from "../likes/index.js"
import { PlaylistsModule } from "../playlists/index.js"
import { RecommendationsModule } from "../recommendations/index.js"
import { SearchModule } from "../search/index.js"
import { TracksModule } from "../tracks/index.js"
import { ActionsController } from "./actions.controller.js"
import { ActionsService } from "./actions.service.js"
import { AgentService } from "./agent.service.js"
import { readAiConfig } from "./ai.config.js"
import { AiController } from "./ai.controller.js"
import { ChatService } from "./chat.service.js"
import { ConversationsService } from "./conversations.service.js"
import { MessagesViewService } from "./messages-view.service.js"
import { ServiceToolPorts } from "./tools/service-tool-ports.js"
import { ToolRegistry } from "./tools/registry.js"
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

/**
 * The AI assistant: conversations, the daily limit, the tools it can use on the catalog and the
 * library of the user, and the streamed answers. It only reads and changes other modules' data
 * through their services; it owns the tables of the conversations.
 */
@Module({
  imports: [
    AlbumsModule,
    ArtistsModule,
    EmbeddingsModule,
    FollowsModule,
    LikesModule,
    PlaylistsModule,
    RecommendationsModule,
    SearchModule,
    TracksModule,
  ],
  controllers: [AiController, ActionsController],
  providers: [
    { provide: LLM_CLIENT, inject: [ConfigService], useFactory: createLlmClient },
    ServiceToolPorts,
    {
      provide: ToolRegistry,
      inject: [ServiceToolPorts],
      useFactory: (ports: ServiceToolPorts) => ToolRegistry.create(ports),
    },
    ConversationsService,
    UsageService,
    ActionsService,
    AgentService,
    ChatService,
    MessagesViewService,
  ],
})
export class AiModule {}
