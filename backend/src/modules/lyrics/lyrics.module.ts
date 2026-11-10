import { Module } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { TracksModule } from "../tracks/index.js"
import { APP_LANGUAGES, TranslationModule } from "../translation/index.js"
import { LyricsTranslationService } from "./lyrics-translation.service.js"
import { LyricsController } from "./lyrics.controller.js"
import { readLyricsConfig } from "./lyrics.config.js"
import { LyricsService } from "./lyrics.service.js"
import {
  LYRICS_LANGUAGES,
  LYRICS_SETTINGS,
  LYRICS_SOURCE,
  LYRICS_STORE,
  LYRICS_TRANSLATOR,
  NullLyricsSource,
  TRACK_DIRECTORY,
} from "./ports.js"
import { PrismaLyricsStore } from "./prisma-lyrics.store.js"
import { TracksDirectory } from "./tracks-directory.js"
import { TranslationGateway } from "./translation-gateway.js"

/**
 * Lyrics of tracks and their translations. It owns the TrackLyrics and TrackLyricsTranslation
 * tables. Translating goes through the translation module; the tracks module says whether a track
 * exists. No lyrics source is connected yet (see `LyricsSource`): lyrics are written by an
 * administrator.
 */
@Module({
  imports: [TracksModule, TranslationModule],
  controllers: [LyricsController],
  providers: [
    { provide: LYRICS_STORE, useClass: PrismaLyricsStore },
    { provide: LYRICS_SOURCE, useClass: NullLyricsSource },
    { provide: TRACK_DIRECTORY, useClass: TracksDirectory },
    { provide: LYRICS_TRANSLATOR, useClass: TranslationGateway },
    { provide: LYRICS_LANGUAGES, useValue: APP_LANGUAGES },
    {
      provide: LYRICS_SETTINGS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stopAtPercent: readLyricsConfig(config).stopAtPercent,
      }),
    },
    LyricsService,
    LyricsTranslationService,
  ],
  exports: [LyricsService],
})
export class LyricsModule {}
