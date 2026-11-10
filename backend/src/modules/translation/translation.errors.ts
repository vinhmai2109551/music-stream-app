import {
  BadRequestException,
  ServiceUnavailableException,
  type HttpException,
} from "@nestjs/common"

/**
 * Codes the app can tell apart. The message is written for the person (it may be shown as it is);
 * the code is for the app, which can word it in the language of the person.
 */
export type TranslationErrorCode =
  | "TRANSLATION_NOT_CONFIGURED"
  | "TRANSLATION_QUOTA_EXCEEDED"
  | "TRANSLATION_BUSY"
  | "TRANSLATION_UNAVAILABLE"
  | "TRANSLATION_LANGUAGE_NOT_SUPPORTED"
  | "TRANSLATION_TEXT_TOO_LARGE"
  | "TRANSLATION_REJECTED"

function body(status: number, code: TranslationErrorCode, message: string) {
  return { statusCode: status, error: code, code, message }
}

/** No key (development) or a key DeepL refused: the feature is off, the rest of the API is not. */
export const translationNotConfigured = (): HttpException =>
  new ServiceUnavailableException(
    body(503, "TRANSLATION_NOT_CONFIGURED", "Tính năng dịch chưa được cấu hình trên máy chủ."),
  )

/** The monthly allowance is used up. Not retried: it cannot work until the period renews. */
export const translationQuotaExceeded = (): HttpException =>
  new ServiceUnavailableException(
    body(
      503,
      "TRANSLATION_QUOTA_EXCEEDED",
      "Đã hết hạn mức dịch của tháng này. Vui lòng thử lại sau.",
    ),
  )

export const translationBusy = (): HttpException =>
  new ServiceUnavailableException(
    body(503, "TRANSLATION_BUSY", "Dịch vụ dịch đang quá tải. Vui lòng thử lại sau ít phút."),
  )

export const translationUnavailable = (): HttpException =>
  new ServiceUnavailableException(
    body(
      503,
      "TRANSLATION_UNAVAILABLE",
      "Dịch vụ dịch tạm thời không khả dụng. Vui lòng thử lại sau.",
    ),
  )

export const languageNotSupported = (supported: readonly string[]): HttpException =>
  new BadRequestException(
    body(
      400,
      "TRANSLATION_LANGUAGE_NOT_SUPPORTED",
      `Ngôn ngữ không được hỗ trợ. Các ngôn ngữ hợp lệ: ${supported.join(", ")}.`,
    ),
  )

export const textTooLarge = (): HttpException =>
  new BadRequestException(
    body(400, "TRANSLATION_TEXT_TOO_LARGE", "Văn bản quá dài để dịch trong một lần."),
  )

export const translationRejected = (): HttpException =>
  new BadRequestException(body(400, "TRANSLATION_REJECTED", "Không dịch được văn bản này."))
