import { Transform } from "class-transformer"
import { IsString, MaxLength, MinLength } from "class-validator"
import { MAX_MESSAGE_CHARS } from "../ai.config.js"

export class SendMessageDto {
  /** What the person writes to the assistant (1 to 2000 characters, spaces at the ends removed). */
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_MESSAGE_CHARS)
  text!: string
}
