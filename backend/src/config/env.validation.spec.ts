import { describe, expect, it } from "@jest/globals"
import { validateEnv } from "./env.validation.js"

const base = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  JWT_SECRET: "a-secret-that-is-long-enough",
}

const r2 = {
  R2_ACCOUNT_ID: "account",
  R2_ACCESS_KEY_ID: "key-id",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "bucket",
  R2_PUBLIC_URL: "https://pub-abc.r2.dev",
}

describe("validateEnv", () => {
  it("accepts a minimal development environment without any R2 setting", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "development" })).not.toThrow()
    expect(() => validateEnv(base)).not.toThrow()
  })

  it("accepts blank R2 settings outside production", () => {
    const blank = { R2_ACCOUNT_ID: "", R2_BUCKET: "", R2_PUBLIC_URL: "" }
    expect(() => validateEnv({ ...base, NODE_ENV: "test", ...blank })).not.toThrow()
  })

  it("requires every R2 setting in production and names the missing ones", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "production" })).toThrow(/R2_ACCOUNT_ID/)
    expect(() => validateEnv({ ...base, NODE_ENV: "production" })).toThrow(/R2_SECRET_ACCESS_KEY/)
    expect(() => validateEnv({ ...base, NODE_ENV: "production" })).toThrow(/R2_PUBLIC_URL/)
  })

  it("rejects a blank R2 value in production", () => {
    const env = { ...base, NODE_ENV: "production", ...r2, R2_BUCKET: "" }
    expect(() => validateEnv(env)).toThrow(/R2_BUCKET/)
  })

  it("accepts a complete production environment", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "production", ...r2 })).not.toThrow()
  })

  it("checks R2_PUBLIC_URL whenever it is set, even in development", () => {
    expect(() => validateEnv({ ...base, R2_PUBLIC_URL: "not a url" })).toThrow(/R2_PUBLIC_URL/)
    expect(() => validateEnv({ ...base, R2_PUBLIC_URL: "https://media.example.com" })).not.toThrow()
  })

  it("still requires the basics", () => {
    expect(() => validateEnv({ JWT_SECRET: base.JWT_SECRET })).toThrow(/DATABASE_URL/)
    expect(() => validateEnv({ ...base, JWT_SECRET: "short" })).toThrow(/JWT_SECRET/)
  })
})
