import { ApiProperty } from "@nestjs/swagger"

export class DailyCountDto {
  @ApiProperty({ example: "2026-11-10", description: "Day in Asia/Ho_Chi_Minh." }) day!: string
  @ApiProperty() count!: number
}

export class StatsTotalsDto {
  @ApiProperty() tracks!: number
  @ApiProperty() artists!: number
  @ApiProperty() albums!: number
  @ApiProperty() users!: number
  @ApiProperty({ description: "Plays of all tracks added up." }) plays!: number
  @ApiProperty({ description: "Listens counted in the last 7 days." }) playsLast7Days!: number
}

export class TopTrackDto {
  @ApiProperty() id!: string
  @ApiProperty() title!: string
  @ApiProperty() artist!: string
  @ApiProperty() coverUrl!: string
  @ApiProperty() plays!: number
}

export class AdminStatsDto {
  @ApiProperty({ type: StatsTotalsDto }) totals!: StatsTotalsDto

  @ApiProperty({ type: [TopTrackDto], description: "The 5 most played tracks." })
  topTracks!: TopTrackDto[]

  @ApiProperty({ type: [DailyCountDto], description: "Last 14 days, oldest first." })
  playsByDay!: DailyCountDto[]

  @ApiProperty({ type: [DailyCountDto], description: "Last 14 days, oldest first." })
  newUsersByDay!: DailyCountDto[]
}
