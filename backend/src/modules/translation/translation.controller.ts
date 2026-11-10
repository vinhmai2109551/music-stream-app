import { Controller, Get } from "@nestjs/common"
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger"
import { Role } from "../../generated/prisma/enums.js"
import { Auth } from "../../shared/index.js"
import { TranslationUsageDto } from "./dto/translation-usage.dto.js"
import { TranslationService } from "./translation.service.js"

@ApiTags("translation")
@Controller("translation")
@Auth(Role.ADMIN)
export class TranslationController {
  constructor(private readonly translation: TranslationService) {}

  @Get("usage")
  @ApiOperation({
    summary: "How much of the DeepL monthly allowance is used (admin)",
    description:
      "Read from DeepL at the moment of the call (it does not count as translated characters). " +
      "A warning is also logged from 80% on.",
  })
  @ApiOkResponse({ type: TranslationUsageDto })
  @ApiServiceUnavailableResponse({ description: "DeepL could not be reached, or refused the key" })
  usage(): Promise<TranslationUsageDto> {
    return this.translation.usage()
  }
}
