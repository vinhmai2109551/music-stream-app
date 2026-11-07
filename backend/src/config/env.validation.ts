import { plainToInstance } from "class-transformer"
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  validateSync,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from "class-validator"

const POSITIVE_INTEGER = /^[1-9]\d*$/
const NON_NEGATIVE_INTEGER = /^\d+$/
/** A number, true / false, or names and addresses such as `loopback, 10.0.0.0/8`. */
const TRUST_PROXY_VALUE = /^(\d+|true|false|[A-Za-z0-9.:/, _-]+)$/

/** Cloudflare R2 and Turnstile settings are mandatory in production and optional while developing. */
const requiredInProduction = (env: EnvironmentVariables) => env.NODE_ENV === "production"

/** `gemini`, or `fake` (a deterministic stand-in that is only for tests and offline development). */
@ValidatorConstraint({ name: "embeddingProvider" })
class EmbeddingProviderConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const name = typeof value === "string" ? value.trim().toLowerCase() : ""
    if (name === "gemini") return true
    return name === "fake" && (args.object as EnvironmentVariables).NODE_ENV !== "production"
  }

  defaultMessage(): string {
    return "EMBEDDING_PROVIDER must be gemini (fake is only allowed outside production)"
  }
}

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string

  @IsString()
  @MinLength(16, { message: "JWT_SECRET must be at least 16 characters" })
  JWT_SECRET!: string

  @IsOptional()
  @IsString()
  PORT?: string

  @IsOptional()
  @IsString()
  NODE_ENV?: string

  @ValidateIf(requiredInProduction)
  @IsString()
  @IsNotEmpty({ message: "R2_ACCOUNT_ID is required in production" })
  R2_ACCOUNT_ID?: string

  @ValidateIf(requiredInProduction)
  @IsString()
  @IsNotEmpty({ message: "R2_ACCESS_KEY_ID is required in production" })
  R2_ACCESS_KEY_ID?: string

  @ValidateIf(requiredInProduction)
  @IsString()
  @IsNotEmpty({ message: "R2_SECRET_ACCESS_KEY is required in production" })
  R2_SECRET_ACCESS_KEY?: string

  @ValidateIf(requiredInProduction)
  @IsString()
  @IsNotEmpty({ message: "R2_BUCKET is required in production" })
  R2_BUCKET?: string

  /** Public address of the bucket (r2.dev or a custom domain). Checked whenever it is set. */
  @ValidateIf(
    (env: EnvironmentVariables) => requiredInProduction(env) || Boolean(env.R2_PUBLIC_URL),
  )
  @IsUrl({ require_tld: false }, { message: "R2_PUBLIC_URL must be a valid URL" })
  R2_PUBLIC_URL?: string

  /** Access token lifetime, e.g. 15m, 1h, 30s, 1d. */
  @IsOptional()
  @Matches(/^[1-9]\d*(s|m|h|d)$/, {
    message: "JWT_ACCESS_EXPIRES_IN must look like 15m, 1h, 30s or 1d",
  })
  JWT_ACCESS_EXPIRES_IN?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: "REFRESH_TOKEN_TTL_DAYS must be a positive integer" })
  REFRESH_TOKEN_TTL_DAYS?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: "AUTH_THROTTLE_LIMIT must be a positive integer" })
  AUTH_THROTTLE_LIMIT?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: "AUTH_THROTTLE_TTL_SECONDS must be a positive integer" })
  AUTH_THROTTLE_TTL_SECONDS?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: "REFRESH_THROTTLE_LIMIT must be a positive integer" })
  REFRESH_THROTTLE_LIMIT?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: "REFRESH_THROTTLE_TTL_SECONDS must be a positive integer" })
  REFRESH_THROTTLE_TTL_SECONDS?: string

  /** 0 turns the grace period off. */
  @IsOptional()
  @Matches(NON_NEGATIVE_INTEGER, {
    message: "REFRESH_REUSE_GRACE_SECONDS must be a non-negative integer",
  })
  REFRESH_REUSE_GRACE_SECONDS?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: "PLAY_DEDUPE_MINUTES must be a positive integer" })
  PLAY_DEDUPE_MINUTES?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: "PLAY_THROTTLE_LIMIT must be a positive integer" })
  PLAY_THROTTLE_LIMIT?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: "PLAY_THROTTLE_TTL_SECONDS must be a positive integer" })
  PLAY_THROTTLE_TTL_SECONDS?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: "AVATAR_THROTTLE_LIMIT must be a positive integer" })
  AVATAR_THROTTLE_LIMIT?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: "AVATAR_THROTTLE_TTL_SECONDS must be a positive integer" })
  AVATAR_THROTTLE_TTL_SECONDS?: string

  /**
   * Key of the Gemini API for the assistant and `npm run ai:enrich`. Blank = EMBEDDING_API_KEY is
   * used; with neither, AI features are off (503) and the rest of the API keeps working.
   */
  @IsOptional()
  @IsString()
  GEMINI_API_KEY?: string

  /** Gemini model of the assistant; defaults to gemini-3.5-flash-lite. */
  @IsOptional()
  @IsString()
  AI_MODEL?: string

  /** Longest answer of the assistant, in tokens (what the model thinks counts too). */
  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: "AI_MAX_TOKENS must be a positive integer" })
  AI_MAX_TOKENS?: string

  /** Messages one user may send to the assistant per day. */
  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: "AI_DAILY_MESSAGE_LIMIT must be a positive integer" })
  AI_DAILY_MESSAGE_LIMIT?: string

  /** How hard the model thinks: minimal, low, medium or high. Blank = the default of the model. */
  @ValidateIf((env: EnvironmentVariables) => Boolean(env.AI_THINKING_LEVEL?.trim()))
  @Matches(/^(minimal|low|medium|high)$/, {
    message: "AI_THINKING_LEVEL must be minimal, low, medium or high",
  })
  AI_THINKING_LEVEL?: string

  /**
   * Which service makes the text embeddings for semantic search. Blank = semantic features are
   * off (their endpoints answer 503). Without EMBEDDING_API_KEY the `gemini` provider is off too.
   */
  @ValidateIf((env: EnvironmentVariables) => Boolean(env.EMBEDDING_PROVIDER?.trim()))
  @Validate(EmbeddingProviderConstraint)
  EMBEDDING_PROVIDER?: string

  @IsOptional()
  @IsString()
  EMBEDDING_MODEL?: string

  @IsOptional()
  @IsString()
  EMBEDDING_API_KEY?: string

  /** Cloudflare Turnstile secret key (bot check on login). Required in production. */
  @ValidateIf(requiredInProduction)
  @IsString()
  @IsNotEmpty({ message: "TURNSTILE_SECRET_KEY is required in production" })
  TURNSTILE_SECRET_KEY?: string

  /**
   * Comma-separated hostnames a Turnstile token may come from, e.g. `musicstream.app,localhost`.
   * Left blank (as in .env.example) it means "any hostname", so only a filled value is checked.
   */
  @ValidateIf((env: EnvironmentVariables) => Boolean(env.TURNSTILE_ALLOWED_HOSTNAMES?.trim()))
  @Matches(/^[A-Za-z0-9.-]+(\s*,\s*[A-Za-z0-9.-]+)*$/, {
    message: "TURNSTILE_ALLOWED_HOSTNAMES must be a comma-separated list of hostnames",
  })
  TURNSTILE_ALLOWED_HOSTNAMES?: string

  /** Reverse proxies in front of the API: a hop count, true / false, or an address list. */
  @IsOptional()
  @Matches(TRUST_PROXY_VALUE, {
    message: "TRUST_PROXY must be a hop count (1), true, false or a list of addresses",
  })
  TRUST_PROXY?: string
}

/** Fails fast at startup when a required variable is missing or malformed. */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const parsed = plainToInstance(EnvironmentVariables, config)
  const errors = validateSync(parsed, { skipMissingProperties: false })
  if (errors.length > 0) {
    const details = errors.map((error) => Object.values(error.constraints ?? {}).join(", "))
    throw new Error(`Invalid environment: ${details.join("; ")}`)
  }
  return config
}
