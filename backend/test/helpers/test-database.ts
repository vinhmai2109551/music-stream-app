import "dotenv/config"
import { execFileSync } from "node:child_process"
import path from "node:path"
import pg from "pg"

const TEST_DB_SUFFIX = "_e2e"
const SAFE_DB_NAME = /^[A-Za-z0-9_]+$/

/** Every account created by the tests uses this domain so cleanup can find it. */
export const TEST_EMAIL_DOMAIN = "e2e.test"

/** Artists created by the tests start with this so cleanup can find them. */
export const TEST_NAME_PREFIX = "E2E "

let ready: Promise<string> | undefined

/**
 * Creates (once) a database dedicated to the e2e tests next to the development one and applies
 * the migrations to it. Returns its connection URL. The development database is never touched.
 */
export function prepareTestDatabase(): Promise<string> {
  ready ??= createAndMigrate()
  return ready
}

async function createAndMigrate(): Promise<string> {
  const devUrl = process.env["DATABASE_URL_LOCAL"] || process.env["DATABASE_URL"]
  if (!devUrl) throw new Error("DATABASE_URL (or DATABASE_URL_LOCAL) is not set")

  const url = new URL(devUrl)
  const devName = decodeURIComponent(url.pathname.slice(1))
  const testName = devName.endsWith(TEST_DB_SUFFIX) ? devName : `${devName}${TEST_DB_SUFFIX}`
  if (!SAFE_DB_NAME.test(testName)) throw new Error(`Unsafe database name: ${testName}`)

  const admin = new pg.Client({ connectionString: withDatabase(url, "postgres") })
  await admin.connect()
  try {
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [testName])
    if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${testName}"`)
  } finally {
    await admin.end()
  }

  const testUrl = withDatabase(url, testName)
  execFileSync(
    process.execPath,
    [path.join("node_modules", "prisma", "build", "index.js"), "migrate", "deploy"],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: testUrl, DATABASE_URL_LOCAL: testUrl },
      stdio: "pipe",
    },
  )
  return testUrl
}

/** Same server and credentials, different database; the `schema` query parameter is kept. */
function withDatabase(url: URL, database: string): string {
  const copy = new URL(url.toString())
  copy.pathname = `/${database}`
  return copy.toString()
}

/** Direct SQL access for assertions that the HTTP API cannot (and should not) expose. */
export class TestDb {
  private constructor(private readonly client: pg.Client) {}

  static async connect(url: string): Promise<TestDb> {
    // pg does not understand Prisma's `schema` parameter.
    const connectionString = new URL(url)
    connectionString.searchParams.delete("schema")
    const client = new pg.Client({ connectionString: connectionString.toString() })
    await client.connect()
    return new TestDb(client)
  }

  async rows<T extends object>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.client.query(sql, params)
    return result.rows as T[]
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    await this.client.query(sql, params)
  }

  /** Removes test accounts (their refresh tokens go with them) and test catalog entries. */
  async deleteTestData(): Promise<void> {
    await this.run(`DELETE FROM "User" WHERE email LIKE $1`, [`%@${TEST_EMAIL_DOMAIN}`])
    // Tracks of a deleted artist are removed by ON DELETE CASCADE.
    await this.run(`DELETE FROM "Artist" WHERE name LIKE $1`, [`${TEST_NAME_PREFIX}%`])
  }

  close(): Promise<void> {
    return this.client.end()
  }
}
