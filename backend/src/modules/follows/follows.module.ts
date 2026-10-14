import { Module } from "@nestjs/common"
import { FollowsController } from "./follows.controller.js"
import { FollowsService } from "./follows.service.js"

@Module({
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
