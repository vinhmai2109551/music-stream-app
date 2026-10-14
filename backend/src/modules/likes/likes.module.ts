import { Module } from "@nestjs/common"
import { LikesController } from "./likes.controller.js"
import { LikesService } from "./likes.service.js"

@Module({
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService],
})
export class LikesModule {}
