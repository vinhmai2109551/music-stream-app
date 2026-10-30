import { Module } from "@nestjs/common"
import { UploadsController } from "./uploads.controller.js"
import { UploadsService } from "./uploads.service.js"

/** Presigned uploads to Cloudflare R2, and the "is this URL ours?" check for other modules. */
@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
