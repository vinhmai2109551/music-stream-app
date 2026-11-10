import { Module } from "@nestjs/common"
import { EmbedController } from "./embed.controller.js"

/** Static pages that other clients embed (no database, no other module). */
@Module({ controllers: [EmbedController] })
export class EmbedModule {}
