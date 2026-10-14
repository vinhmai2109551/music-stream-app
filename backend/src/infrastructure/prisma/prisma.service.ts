import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client.js"

/** Splits a Prisma-style URL: pg itself does not understand the `schema` query parameter. */
export function parseDatabaseUrl(rawUrl: string): { connectionString: string; schema: string } {
  const url = new URL(rawUrl)
  const schema = url.searchParams.get("schema") ?? "public"
  url.searchParams.delete("schema")
  return { connectionString: url.toString(), schema }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    // DATABASE_URL_LOCAL points at localhost for host-side runs; it is empty inside Docker.
    const rawUrl =
      config.get<string>("DATABASE_URL_LOCAL") || config.getOrThrow<string>("DATABASE_URL")
    const { connectionString, schema } = parseDatabaseUrl(rawUrl)
    super({ adapter: new PrismaPg({ connectionString }, { schema }) })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
