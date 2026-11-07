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

const turnstile = { TURNSTILE_SECRET_KEY: "0x4AAAAAAA-secret" }

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
    expect(() =>
      validateEnv({ ...base, NODE_ENV: "production", ...r2, ...turnstile }),
    ).not.toThrow()
  })

  it("requires TURNSTILE_SECRET_KEY in production only", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "production", ...r2 })).toThrow(
      /TURNSTILE_SECRET_KEY/,
    )
    expect(() =>
      validateEnv({ ...base, NODE_ENV: "development", TURNSTILE_SECRET_KEY: "" }),
    ).not.toThrow()
  })

  it("treats a blank TURNSTILE_ALLOWED_HOSTNAMES as unset, as .env.example ships it", () => {
    for (const value of ["", "   "]) {
      expect(() => validateEnv({ ...base, TURNSTILE_ALLOWED_HOSTNAMES: value })).not.toThrow()
      expect(() =>
        validateEnv({
          ...base,
          NODE_ENV: "production",
          ...r2,
          ...turnstile,
          TURNSTILE_ALLOWED_HOSTNAMES: value,
        }),
      ).not.toThrow()
    }
  })

  it("accepts a hostname list for TURNSTILE_ALLOWED_HOSTNAMES and rejects anything else", () => {
    for (const value of ["localhost", "musicstream.app, localhost", "a.b.c,d"]) {
      expect(() => validateEnv({ ...base, TURNSTILE_ALLOWED_HOSTNAMES: value })).not.toThrow()
    }
    for (const value of ["https://musicstream.app", "a,,b", "a b"]) {
      expect(() => validateEnv({ ...base, TURNSTILE_ALLOWED_HOSTNAMES: value })).toThrow(
        /TURNSTILE_ALLOWED_HOSTNAMES/,
      )
    }
  })

  it("checks R2_PUBLIC_URL whenever it is set, even in development", () => {
    expect(() => validateEnv({ ...base, R2_PUBLIC_URL: "not a url" })).toThrow(/R2_PUBLIC_URL/)
    expect(() => validateEnv({ ...base, R2_PUBLIC_URL: "https://media.example.com" })).not.toThrow()
  })

  describe("EMBEDDING_PROVIDER", () => {
    it("is optional: blank or missing switches semantic features off", () => {
      expect(() => validateEnv(base)).not.toThrow()
      expect(() => validateEnv({ ...base, EMBEDDING_PROVIDER: "" })).not.toThrow()
      expect(() => validateEnv({ ...base, EMBEDDING_PROVIDER: "  " })).not.toThrow()
    })

    it("accepts gemini with or without a key and a model", () => {
      expect(() => validateEnv({ ...base, EMBEDDING_PROVIDER: "gemini" })).not.toThrow()
      expect(() =>
        validateEnv({
          ...base,
          EMBEDDING_PROVIDER: "Gemini",
          EMBEDDING_MODEL: "gemini-embedding-2",
          EMBEDDING_API_KEY: "key",
        }),
      ).not.toThrow()
    })

    it("accepts the fake provider outside production only", () => {
      expect(() => validateEnv({ ...base, EMBEDDING_PROVIDER: "fake" })).not.toThrow()
      expect(() =>
        validateEnv({
          ...base,
          ...r2,
          ...turnstile,
          NODE_ENV: "production",
          EMBEDDING_PROVIDER: "fake",
        }),
      ).toThrow(/EMBEDDING_PROVIDER/)
      expect(() =>
        validateEnv({
          ...base,
          ...r2,
          ...turnstile,
          NODE_ENV: "production",
          EMBEDDING_PROVIDER: "gemini",
        }),
      ).not.toThrow()
    })

    it("rejects a provider it does not know", () => {
      expect(() => validateEnv({ ...base, EMBEDDING_PROVIDER: "openai" })).toThrow(
        /EMBEDDING_PROVIDER/,
      )
    })
  })

  describe("the AI settings", () => {
    it("are optional: none of them has to be set", () => {
      expect(() => validateEnv(base)).not.toThrow()
      expect(() =>
        validateEnv({ ...base, GEMINI_API_KEY: "", AI_MODEL: "", AI_THINKING_LEVEL: "" }),
      ).not.toThrow()
    })

    it("refuse a blank number, like every other numeric setting", () => {
      expect(() => validateEnv({ ...base, AI_MAX_TOKENS: "" })).toThrow(/AI_MAX_TOKENS/)
      expect(() => validateEnv({ ...base, AI_DAILY_MESSAGE_LIMIT: "" })).toThrow(
        /AI_DAILY_MESSAGE_LIMIT/,
      )
    })

    it("accept the values .env.example ships", () => {
      expect(() =>
        validateEnv({
          ...base,
          GEMINI_API_KEY: "",
          AI_MODEL: "gemini-3.5-flash-lite",
          AI_MAX_TOKENS: "1024",
          AI_DAILY_MESSAGE_LIMIT: "30",
          AI_THINKING_LEVEL: "",
        }),
      ).not.toThrow()
    })

    it.each(["minimal", "low", "medium", "high"])("accept the thinking level %s", (level) => {
      expect(() => validateEnv({ ...base, AI_THINKING_LEVEL: level })).not.toThrow()
    })

    it("refuse a thinking level that does not exist and limits that are not positive integers", () => {
      expect(() => validateEnv({ ...base, AI_THINKING_LEVEL: "extreme" })).toThrow(
        /AI_THINKING_LEVEL/,
      )
      expect(() => validateEnv({ ...base, AI_MAX_TOKENS: "0" })).toThrow(/AI_MAX_TOKENS/)
      expect(() => validateEnv({ ...base, AI_DAILY_MESSAGE_LIMIT: "-3" })).toThrow(
        /AI_DAILY_MESSAGE_LIMIT/,
      )
    })
  })

  it("still requires the basics", () => {
    expect(() => validateEnv({ JWT_SECRET: base.JWT_SECRET })).toThrow(/DATABASE_URL/)
    expect(() => validateEnv({ ...base, JWT_SECRET: "short" })).toThrow(/JWT_SECRET/)
  })

  describe("limits, grace period and proxy settings", () => {
    const valid = {
      ...base,
      AUTH_THROTTLE_LIMIT: "5",
      REFRESH_THROTTLE_LIMIT: "30",
      REFRESH_THROTTLE_TTL_SECONDS: "60",
      REFRESH_REUSE_GRACE_SECONDS: "10",
      PLAY_DEDUPE_MINUTES: "30",
      PLAY_THROTTLE_LIMIT: "60",
      PLAY_THROTTLE_TTL_SECONDS: "60",
      TRUST_PROXY: "1",
    }

    it("accepts the documented defaults", () => {
      expect(() => validateEnv(valid)).not.toThrow()
    })

    it("accepts 0 for the grace period (it turns the grace off) but not for the limits", () => {
      expect(() => validateEnv({ ...valid, REFRESH_REUSE_GRACE_SECONDS: "0" })).not.toThrow()
      expect(() => validateEnv({ ...valid, REFRESH_THROTTLE_LIMIT: "0" })).toThrow(
        /REFRESH_THROTTLE_LIMIT/,
      )
      expect(() => validateEnv({ ...valid, PLAY_DEDUPE_MINUTES: "0" })).toThrow(
        /PLAY_DEDUPE_MINUTES/,
      )
    })

    it.each([
      ["REFRESH_THROTTLE_LIMIT", "many"],
      ["REFRESH_THROTTLE_TTL_SECONDS", "-5"],
      ["REFRESH_REUSE_GRACE_SECONDS", "1.5"],
      ["PLAY_THROTTLE_LIMIT", "x"],
      ["PLAY_THROTTLE_TTL_SECONDS", "0"],
    ])("rejects %s=%p and names the variable", (name, value) => {
      expect(() => validateEnv({ ...valid, [name]: value })).toThrow(new RegExp(name))
    })

    it("accepts a hop count, a boolean or an address list for TRUST_PROXY", () => {
      for (const value of ["0", "1", "2", "true", "false", "loopback, 10.0.0.0/8"]) {
        expect(() => validateEnv({ ...valid, TRUST_PROXY: value })).not.toThrow()
      }
    })

    it("rejects a TRUST_PROXY that cannot be an Express setting", () => {
      expect(() => validateEnv({ ...valid, TRUST_PROXY: "" })).toThrow(/TRUST_PROXY/)
      expect(() => validateEnv({ ...valid, TRUST_PROXY: "1; drop" })).toThrow(/TRUST_PROXY/)
    })
  })
})
