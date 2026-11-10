import { Body, Controller, HttpCode, Post } from "@nestjs/common"
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger"
import { Role } from "../../generated/prisma/enums.js"
import { Auth } from "../../shared/index.js"
import { PresignedUploadDto, PresignUploadDto } from "./dto/presign-upload.dto.js"
import { UploadsService, type PresignedUpload } from "./uploads.service.js"

@ApiTags("uploads")
@Controller("uploads")
@Auth(Role.ADMIN)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post("presign")
  @HttpCode(200)
  @ApiOperation({
    summary: "Get a presigned URL to upload one file straight to Cloudflare R2 (admin)",
    description:
      "Then `PUT` the raw file to `uploadUrl` with the same `Content-Type` and body length you " +
      "declared. Save `publicUrl` in the track, album or artist.",
  })
  @ApiOkResponse({ type: PresignedUploadDto })
  @ApiBadRequestResponse({ description: "Type or size not allowed" })
  @ApiServiceUnavailableResponse({ description: "R2 is not configured on the server" })
  presign(@Body() dto: PresignUploadDto): Promise<PresignedUpload> {
    return this.uploads.presign(dto)
  }
}
