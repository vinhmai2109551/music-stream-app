import { Module } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { createTranslator } from "./create-translator.js"
import { TranslationController } from "./translation.controller.js"
import { TranslationService } from "./translation.service.js"
import { TRANSLATOR } from "./translator.port.js"

/**
 * Translation of texts through DeepL: the one place that talks to it, so that the monthly
 * allowance, the errors and the logs are handled once. It owns no tables and needs no other module.
 */
@Module({
  controllers: [TranslationController],
  providers: [
    { provide: TRANSLATOR, inject: [ConfigService], useFactory: createTranslator },
    TranslationService,
  ],
  exports: [TranslationService],
})
export class TranslationModule {}
