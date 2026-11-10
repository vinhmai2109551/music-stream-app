import { ApiProperty } from "@nestjs/swagger"

export class TranslationUsageDto {
  @ApiProperty({ description: "False when the server has no DeepL key: nothing else is known." })
  configured!: boolean

  @ApiProperty({ nullable: true, type: Number, description: "Characters translated this period." })
  used!: number | null

  @ApiProperty({ nullable: true, type: Number, description: "Characters allowed this period." })
  limit!: number | null

  @ApiProperty({
    nullable: true,
    type: Number,
    description: "Used, as a share of the limit (0-100).",
  })
  percent!: number | null

  @ApiProperty({ description: "True from 80% of the allowance on (a warning is also logged)." })
  warning!: boolean
}
