import { spawn, type ChildProcess } from "node:child_process"
import { existsSync } from "node:fs"
import net from "node:net"
import path from "node:path"
import {
  prepareTestDatabase,
  TEST_EMAIL_DOMAIN,
  TEST_NAME_PREFIX,
  TestDb,
} from "./test-database.js"

const ENTRY = path.join("dist", "main.js")
const STARTUP_TIMEOUT_MS = 30_000
const POLL_INTERVAL_MS = 250

const TEST_ENV = {
  NODE_ENV: "test",
  JWT_SECRET: "e2e-secret-that-is-long-enough-to-pass-validation",
  JWT_ACCESS_EXPIRES_IN: "15m",
  REFRESH_TOKEN_TTL_DAYS: "30",
  // Effectively unlimited, so only the throttle spec ever hits the limit.
  AUTH_THROTTLE_LIMIT: "1000",
  AUTH_THROTTLE_TTL_SECONDS: "60",
  SEED_ON_START: "false",
  // Blank, so the real R2 keys from .env never reach a test server unless a spec sets them.
  R2_ACCOUNT_ID: "",
  R2_ACCESS_KEY_ID: "",
  R2_SECRET_ACCESS_KEY: "",
  R2_BUCKET: "",
  R2_PUBLIC_URL: "",
}

export interface TestServer {
  /** e.g. http://127.0.0.1:41234 - pass it to supertest. */
  url: string
  db: TestDb
  stop: () => Promise<void>
}

/**
 * Starts the built API (`dist/main.js`) as a separate process on a free port, connected to the
 * e2e database. Testing the real build keeps main.ts, the module wiring and the HTTP stack in the
 * loop. Each server keeps its own rate-limit counters, so specs cannot affect each other.
 */
export async function startTestServer(env: Record<string, string> = {}): Promise<TestServer> {
  if (!existsSync(ENTRY)) throw new Error(`${ENTRY} not found - run "npm run build" first`)

  const databaseUrl = await prepareTestDatabase()
  const port = await freePort()
  const url = `http://127.0.0.1:${port}`

  const child = spawn(process.execPath, [ENTRY], {
    env: {
      ...process.env,
      ...TEST_ENV,
      ...env,
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      DATABASE_URL_LOCAL: databaseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  const output = collectOutput(child)

  try {
    await waitUntilReady(url, child, output)
  } catch (error) {
    child.kill()
    throw error
  }

  const db = await TestDb.connect(databaseUrl)
  return {
    url,
    db,
    stop: async () => {
      await db.deleteTestData()
      await db.close()
      await stopProcess(child)
    },
  }
}

export { TEST_EMAIL_DOMAIN, TEST_NAME_PREFIX }

let counter = 0

export function uniqueEmail(): string {
  counter += 1
  return `user-${Date.now()}-${counter}@${TEST_EMAIL_DOMAIN}`
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as net.AddressInfo
      server.close(() => resolve(port))
    })
  })
}

function collectOutput(child: ChildProcess): () => string {
  let text = ""
  const append = (chunk: Buffer) => {
    text += chunk.toString()
  }
  child.stdout?.on("data", append)
  child.stderr?.on("data", append)
  return () => text
}

async function waitUntilReady(url: string, child: ChildProcess, output: () => string) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`The API exited during startup (code ${child.exitCode}):\n${output()}`)
    }
    try {
      const response = await fetch(`${url}/api/docs`)
      if (response.ok) return
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  throw new Error(`The API did not start within ${STARTUP_TIMEOUT_MS} ms:\n${output()}`)
}

function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return Promise.resolve()
  return new Promise((resolve) => {
    child.once("exit", () => resolve())
    child.kill()
  })
}
