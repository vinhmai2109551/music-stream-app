import { Global, Module } from "@nestjs/common"
import { PrismaService } from "./prisma.service.js"

/** Infrastructure, not a domain module: every module may inject PrismaService. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
