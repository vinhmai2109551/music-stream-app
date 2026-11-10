import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  type HttpException,
} from "@nestjs/common"

/**
 * Codes the app can tell apart. The message is written for the person; the code is for the app,
 * which can word it in the language of the person.
 */
export type LyricsErrorCode =
  | "LYRICS_NOT_FOUND"
  | "LYRICS_LANGUAGE_NOT_SUPPORTED"
  | "LYRICS_INVALID"
  | "LYRICS_TRANSLATION_FAILED"

function body(status: number, code: LyricsErrorCode, message: string) {
  return { statusCode: status, error: code, code, message }
}

/** The track exists but has no lyrics: a state the app shows, not a failure. */
export const lyricsNotFound = (): HttpException =>
  new NotFoundException(body(404, "LYRICS_NOT_FOUND", "Bài hát này chưa có lời."))

export const languageNotSupported = (languages: readonly string[]): HttpException =>
  new BadRequestException(
    body(
      400,
      "LYRICS_LANGUAGE_NOT_SUPPORTED",
      `Ngôn ngữ không được hỗ trợ. Dùng một trong: ${languages.join(", ")}.`,
    ),
  )

export const lyricsInvalid = (message: string): HttpException =>
  new BadRequestException(body(400, "LYRICS_INVALID", message))

/** The engine answered, but not with one translation per line; nothing is stored. */
export const translationFailed = (): HttpException =>
  new ServiceUnavailableException(
    body(503, "LYRICS_TRANSLATION_FAILED", "Không dịch được lời bài hát. Vui lòng thử lại sau."),
  )
