import { plainToInstance } from "class-transformer"
import { IsNotEmpty, IsOptional, IsString, MinLength, validateSync } from "class-validator"

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
}

/** Fails fast at startup when a required variable is missing. */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const parsed = plainToInstance(EnvironmentVariables, config)
  const errors = validateSync(parsed, { skipMissingProperties: false })
  if (errors.length > 0) {
    const details = errors.map((error) => Object.values(error.constraints ?? {}).join(", "))
    throw new Error(`Invalid environment: ${details.join("; ")}`)
  }
  return config
}
