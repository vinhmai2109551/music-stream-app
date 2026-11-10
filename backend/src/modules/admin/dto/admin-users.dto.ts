import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsBoolean, IsEnum, IsOptional } from "class-validator"
import { Role } from "../../../generated/prisma/enums.js"
import { PaginationQueryDto } from "../../../shared/index.js"

/** Query strings are text: "true" and "false" become booleans, anything else fails validation. */
const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === "true" ? true : value === "false" ? false : value

export class AdminUsersQueryDto extends PaginationQueryDto {
  /** Only users with this role. */
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role

  /** `true` = only banned users, `false` = only users who are not banned. */
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  banned?: boolean
}

export class UpdateUserAccessDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role

  /** `true` bans the user and ends all their sessions; `false` lets them in again. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBanned?: boolean
}

export class AdminUserDto {
  @ApiProperty() id!: string
  @ApiProperty() email!: string
  @ApiProperty() name!: string
  @ApiProperty({ nullable: true, type: String }) avatarUrl!: string | null
  @ApiProperty({ enum: Role }) role!: Role
  @ApiProperty() isPremium!: boolean
  @ApiProperty() isBanned!: boolean
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date
}

export class AdminUserPageDto {
  @ApiProperty({ type: [AdminUserDto] }) items!: AdminUserDto[]
  @ApiProperty() total!: number
  @ApiProperty() page!: number
  @ApiProperty() limit!: number
  @ApiProperty() totalPages!: number
}
