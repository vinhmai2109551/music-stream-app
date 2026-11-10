import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
const SITEVERIFY_TIMEOUT_MS = 5000
/** Cloudflare's tokens are at most 2048 characters. */
export const TURNSTILE_TOKEN_MAX = 2048

export type TurnstileAction = "login" | "register"

/** The part of the Siteverify answer this service reads. */
interface SiteverifyResponse {
  success: boolean
  hostname?: string
  action?: string
  "error-codes"?: string[]
}

/**
 * Checks Cloudflare Turnstile tokens on the server (the widget alone proves nothing: a bot can skip
 * it and call the API directly).
 *
 * - TURNSTILE_SECRET_KEY set: every call must carry a valid token.
 * - Not set (allowed only outside production, see env.validation): the check is skipped, so local
 *   development and the e2e tests work without a Cloudflare account.
 * - TURNSTILE_ALLOWED_HOSTNAMES (optional): the token must come from one of these hostnames, so a
 *   token solved on another site that reuses the public site key is refused.
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name)
  private readonly secretKey: string | null
  private readonly allowedHostnames: ReadonlySet<string>

  constructor(config: ConfigService) {
    this.secretKey = config.get<string>("TURNSTILE_SECRET_KEY")?.trim() || null
    this.allowedHostnames = new Set(
      (config.get<string>("TURNSTILE_ALLOWED_HOSTNAMES") ?? "")
        .split(",")
        .map((hostname) => hostname.trim().toLowerCase())
        .filter(Boolean),
    )
    if (!this.secretKey) {
      this.logger.warn("TURNSTILE_SECRET_KEY is not set: login is NOT protected by Turnstile")
    }
  }

  get enabled(): boolean {
    return this.secretKey !== null
  }

  /**
   * Cloudflare answers a token it dislikes with 200 and `success: false`; an HTTP error means the
   * request itself was wrong, most often a secret key it does not accept. The reason goes to the
   * log (never the key), so the cause is not a mystery behind a bare 503.
   */
  private async describeFailure(response: Response): Promise<string> {
    let codes: string[] = []
    try {
      codes = ((await response.json()) as SiteverifyResponse)["error-codes"] ?? []
    } catch {
      // No readable body: the status alone has to do.
    }
    const reported = codes.length > 0 ? ` (${codes.join(", ")})` : ""
    const badSecret = codes.some((code) => /secret/.test(code))
    const hint = badSecret
      ? ": TURNSTILE_SECRET_KEY is not accepted. Use the Secret Key of the widget (not its Site Key), alone on its line, and restart the API"
      : ""
    return `Siteverify answered ${response.status}${reported}${hint}`
  }

  async verify(token: string | undefined, expectedAction: TurnstileAction, remoteIp?: string) {
    if (!this.secretKey) return
    if (typeof token !== "string" || !token.trim() || token.length > TURNSTILE_TOKEN_MAX) {
      throw new BadRequestException("Security check is missing. Please verify and try again.")
    }

    let result: SiteverifyResponse
    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: this.secretKey,
          response: token,
          ...(remoteIp ? { remoteip: remoteIp } : {}),
        }),
        signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
      })
      if (!response.ok) throw new Error(await this.describeFailure(response))
      result = (await response.json()) as SiteverifyResponse
    } catch (error) {
      this.logger.error(`Turnstile Siteverify failed: ${(error as Error).message}`)
      throw new ServiceUnavailableException(
        "The security check is temporarily unavailable. Please try again.",
      )
    }

    // Cloudflare's test secret keys answer without an action, so the action is only compared
    // when Cloudflare sends one.
    const wrongAction = Boolean(result.action) && result.action !== expectedAction
    const wrongHostname =
      this.allowedHostnames.size > 0 &&
      !this.allowedHostnames.has((result.hostname ?? "").toLowerCase())

    if (result?.success !== true || wrongAction || wrongHostname) {
      throw new BadRequestException("Security check failed. Please verify again.")
    }
  }
}
