import "dotenv/config"
import { defineConfig } from "prisma/config"

// Host-side commands (migrate, seed) use DATABASE_URL_LOCAL; inside Docker it is empty.
const url = process.env["DATABASE_URL_LOCAL"] || process.env["DATABASE_URL"]

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url },
})
