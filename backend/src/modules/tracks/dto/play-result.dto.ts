import { ApiProperty } from "@nestjs/swagger"

export class PlayResultDto {
  /** Total plays of the track after this call. */
  @ApiProperty({ example: 1204 })
  plays!: number

  /** False when the listen was ignored because the user played this track a moment ago. */
  @ApiProperty({ example: true })
  counted!: boolean
}
