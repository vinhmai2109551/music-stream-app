import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client.js"
import { parseDatabaseUrl } from "../src/infrastructure/prisma/prisma.service.js"
import { runSeed } from "../src/seed/seed.js"

/** Host-side entry: `npm run prisma:seed`. Inside Docker the API seeds itself on start. */
async function main(): Promise<void> {
  const rawUrl = process.env["DATABASE_URL_LOCAL"] || process.env["DATABASE_URL"]
  if (!rawUrl) throw new Error("DATABASE_URL is not set")
  const { connectionString, schema } = parseDatabaseUrl(rawUrl)
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }, { schema }) })
  try {
    await runSeed(prisma, {
      adminEmail: process.env["SEED_ADMIN_EMAIL"],
      adminPassword: process.env["SEED_ADMIN_PASSWORD"],
      mediaBaseUrl: process.env["R2_PUBLIC_URL"],
    })
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
