import { Module } from "@nestjs/common"
import { UsersModule } from "../users/index.js"
import { CommentsController } from "./comments.controller.js"
import { CommentsService } from "./comments.service.js"

@Module({
  imports: [UsersModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
