import { plainToInstance } from "class-transformer"
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
  ValidateIf,
  validateSync,
} from "class-validator"

const POSITIVE_INTEGER = /^[1-9]\d*$/

/** Cloudflare R2 settings are mandatory in production and optional while developing. */
const requiredInProduction = (env: EnvironmentVariables) => env.NODE_ENV === "production"

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
