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

/** The values of `.env.example` that must be replaced start with "change-me". */
const NOT_A_PLACEHOLDER = /^(?!change-me)/i

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

/** `gemini`, or `fake` (an echo that is only for tests and offline development). */
@ValidatorConstraint({ name: "aiProvider" })
class AiProviderConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const name = typeof value === "string" ? value.trim().toLowerCase() : ""
    if (name === "gemini") return true
    return name === "fake" && (args.object as EnvironmentVariables).NODE_ENV !== "production"
  }

  defaultMessage(): string {
    return "AI_PROVIDER must be gemini (fake is only allowed outside production)"
  }
}

/** `deepl`, or `fake` (calls nobody; only for tests and offline development). */
@ValidatorConstraint({ name: "translationProvider" })
class TranslationProviderConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const name = typeof value === "string" ? value.trim().toLowerCase() : ""
    if (name === "deepl") return true
    return name === "fake" && (args.object as EnvironmentVariables).NODE_ENV !== "production"
  }

  defaultMessage(): string {
    return "TRANSLATION_PROVIDER must be deepl (fake is only allowed outside production)"
  }
}

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string

  /** Signs every access token: long, random and not the placeholder of `.env.example`. */
  @IsString()
  @MinLength(32, { message: "JWT_SECRET must be at least 32 characters" })
  @Matches(NOT_A_PLACEHOLDER, {
    message: "JWT_SECRET is still the placeholder (change-me...): make a real one",
  })
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

  /** Semantic searches one user may make per window (`GET /search/semantic`). */
  @IsOptional()
  @Matches(POSITIVE_INTEGER, {
    message: "SEMANTIC_SEARCH_THROTTLE_LIMIT must be a positive integer",
  })
  SEMANTIC_SEARCH_THROTTLE_LIMIT?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, {
    message: "SEMANTIC_SEARCH_THROTTLE_TTL_SECONDS must be a positive integer",
  })
  SEMANTIC_SEARCH_THROTTLE_TTL_SECONDS?: string

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

  /** Folder of the help texts (*.md) that `npm run ai:embed` indexes; relative paths start where the command runs (`backend/`). */
  @IsOptional()
  @IsString()
  KNOWLEDGE_DIR?: string

  /** Blank = gemini when there is a key. `fake` answers with an echo, with no key and no network. */
  @ValidateIf((env: EnvironmentVariables) => Boolean(env.AI_PROVIDER?.trim()))
  @Validate(AiProviderConstraint)
  AI_PROVIDER?: string

  /** Key of the DeepL API (free keys end in ":fx"). Required in production; blank = translating is off. */
  @ValidateIf(requiredInProduction)
  @IsString()
  @IsNotEmpty({ message: "DEEPL_API_KEY is required in production" })
  DEEPL_API_KEY?: string

  /** Retries after the first attempt for a 429, a 5xx or a network failure. */
  @IsOptional()
  @Matches(/^(10|\d)$/, { message: "DEEPL_MAX_RETRIES must be a whole number from 0 to 10" })
  DEEPL_MAX_RETRIES?: string

  /** Blank = deepl. `fake` calls nobody and writes "[<language>] <text>". */
  @ValidateIf((env: EnvironmentVariables) => Boolean(env.TRANSLATION_PROVIDER?.trim()))
  @Validate(TranslationProviderConstraint)
  TRANSLATION_PROVIDER?: string

  /** Lyrics translations a user may ask for per window (a kept one costs DeepL nothing). */
  @IsOptional()
  @Matches(POSITIVE_INTEGER, {
    message: "LYRICS_TRANSLATE_THROTTLE_LIMIT must be a positive integer",
  })
  LYRICS_TRANSLATE_THROTTLE_LIMIT?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, {
    message: "LYRICS_TRANSLATE_THROTTLE_TTL_SECONDS must be a positive integer",
  })
  LYRICS_TRANSLATE_THROTTLE_TTL_SECONDS?: string

  /** From this share (1-100) of the monthly DeepL allowance on, no new lyrics are translated. */
  @IsOptional()
  @Matches(/^([1-9]\d?|100)$/, {
    message: "LYRICS_TRANSLATION_STOP_AT_PERCENT must be a whole number from 1 to 100",
  })
  LYRICS_TRANSLATION_STOP_AT_PERCENT?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: "AI_CHAT_THROTTLE_LIMIT must be a positive integer" })
  AI_CHAT_THROTTLE_LIMIT?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER, {
    message: "AI_CHAT_THROTTLE_TTL_SECONDS must be a positive integer",
  })
  AI_CHAT_THROTTLE_TTL_SECONDS?: string

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

  /**
   * The sites (browsers) allowed to call the API, comma separated. Mobile apps send no Origin, so
   * this is only for the admin web and Expo web. Empty means every site is allowed, which is only
   * acceptable while developing.
   */
  @ValidateIf(requiredInProduction)
  @IsString()
  @IsNotEmpty({
    message: "CORS_ORIGINS is required in production: list the sites that may call the API",
  })
  CORS_ORIGINS?: string

  /** The API docs (/api/docs) are off in production unless this is `true`. */
  @ValidateIf((env: EnvironmentVariables) => Boolean(env.SWAGGER_ENABLED?.trim()))
  @Matches(/^(true|false)$/, { message: "SWAGGER_ENABLED must be true or false" })
  SWAGGER_ENABLED?: string

  @ValidateIf((env: EnvironmentVariables) => Boolean(env.SEED_ON_START?.trim()))
  @Matches(/^(true|false)$/, { message: "SEED_ON_START must be true or false" })
  SEED_ON_START?: string

  /** The password of the administrator the seed creates: a real one when the seed runs in production. */
  @ValidateIf(
    (env: EnvironmentVariables) => requiredInProduction(env) && env.SEED_ON_START === "true",
  )
  @IsString()
  @MinLength(12, {
    message: "SEED_ADMIN_PASSWORD must be at least 12 characters when the seed runs in production",
  })
  @Matches(NOT_A_PLACEHOLDER, {
    message: "SEED_ADMIN_PASSWORD is still the placeholder (change-me): make a real one",
  })
  SEED_ADMIN_PASSWORD?: string
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
