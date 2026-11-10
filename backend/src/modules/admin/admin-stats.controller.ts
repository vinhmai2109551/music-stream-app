import { Controller, Get } from "@nestjs/common"
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import { Role } from "../../generated/prisma/enums.js"
import { Auth } from "../../shared/index.js"
import { AdminStatsService, type AdminStats } from "./admin-stats.service.js"
import { AdminStatsDto } from "./dto/admin-stats.dto.js"

@ApiTags("admin")
@Controller("admin/stats")
@Auth(Role.ADMIN)
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get()
  @ApiOperation({ summary: "Numbers for the dashboard (admin)" })
  @ApiOkResponse({ type: AdminStatsDto })
  get(): Promise<AdminStats> {
    return this.stats.get()
  }
}
