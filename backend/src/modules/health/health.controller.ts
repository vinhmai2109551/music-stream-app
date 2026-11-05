import { Controller, Get, Header } from "@nestjs/common"
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger"
import { HealthService, type HealthStatus } from "./health.service.js"

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary: "Is the API up and can it reach its database?",
    description:
      "Public, not rate limited. Used by the Docker healthcheck and by hosting platforms.",
  })
  @ApiOkResponse({ schema: { example: { status: "ok", database: "up" } } })
  @ApiServiceUnavailableResponse({
    schema: { example: { status: "error", database: "down" } },
    description: "The database does not answer",
  })
  check(): Promise<HealthStatus> {
    return this.health.check()
  }
}
