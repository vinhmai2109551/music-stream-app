import { Controller, Get, Header, Res } from "@nestjs/common"
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger"
import type { Response } from "express"
import { buildYouTubePlayerPage } from "./youtube-player.page.js"

/** Built once: the page never changes while the server runs. */
const PLAYER_PAGE = buildYouTubePlayerPage()
const ONE_HOUR_SECONDS = 3600

@ApiTags("embed")
@Controller("embed")
export class EmbedController {
  @Get("youtube-player")
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header("Cache-Control", `public, max-age=${ONE_HOUR_SECONDS}`)
  @Header("X-Content-Type-Options", "nosniff")
  // YouTube refuses an embed that is sent no referrer (error 153), so it must not be "no-referrer".
  @Header("Referrer-Policy", "strict-origin-when-cross-origin")
  @ApiOperation({
    summary: "Page that plays one YouTube video (loaded by the mobile app's WebView)",
    description:
      "The protocol of react-native-youtube-iframe: open it as ?data=<encodeURI(JSON)>. " +
      "Public and static; its Content-Security-Policy allows only youtube.com and ytimg.com.",
  })
  @ApiProduces("text/html")
  @ApiOkResponse({ description: "The HTML page", schema: { type: "string" } })
  youtubePlayer(@Res({ passthrough: true }) response: Response): string {
    response.setHeader("Content-Security-Policy", PLAYER_PAGE.contentSecurityPolicy)
    return PLAYER_PAGE.html
  }
}
