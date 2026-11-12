import { describe, expect, it } from "@jest/globals"
import { validateEnv } from "./env.validation.js"

const base = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  JWT_SECRET: "a-secret-that-is-long-enough-to-sign-tokens",
}
const production = {
  ...base,
  NODE_ENV: "production",
  R2_ACCOUNT_ID: "account",
  R2_ACCESS_KEY_ID: "key-id",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "bucket",
  R2_PUBLIC_URL: "https://pub-abc.r2.dev",
  TURNSTILE_SECRET_KEY: "0x4AAAAAAA-secret",
  CORS_ORIGINS: "https://admin.example.com",
}

describe("the DeepL settings", () => {
  it("are optional while developing: the app starts without a key", () => {
    expect(() => validateEnv(base)).not.toThrow()
    expect(() => validateEnv({ ...base, NODE_ENV: "development", DEEPL_API_KEY: "" })).not.toThrow()
    expect(() => validateEnv({ ...base, NODE_ENV: "test" })).not.toThrow()
  })

  it("require the key in production, and say so", () => {
    expect(() => validateEnv(production)).toThrow(/DEEPL_API_KEY is required in production/)
    expect(() => validateEnv({ ...production, DEEPL_API_KEY: "" })).toThrow(/DEEPL_API_KEY/)
  })

  it("accept a production environment that has the key", () => {
    expect(() => validateEnv({ ...production, DEEPL_API_KEY: "some-key:fx" })).not.toThrow()
  })

  it("never put the value of the key in the error", () => {
    const secret = "do-not-print-this-key-value"
    let message = ""
    try {
      validateEnv({ ...production, DEEPL_API_KEY: "", DEEPL_MAX_RETRIES: "99", JWT_SECRET: secret })
    } catch (error) {
      message = String(error)
    }
    expect(message).toMatch(/DEEPL_MAX_RETRIES/)
    expect(message).not.toContain(secret)
  })

  it.each(["0", "1", "3", "10"])("accept DEEPL_MAX_RETRIES=%s", (value) => {
    expect(() => validateEnv({ ...base, DEEPL_MAX_RETRIES: value })).not.toThrow()
  })

  it.each(["-1", "11", "1.5", "many", " "])("reject DEEPL_MAX_RETRIES=%p", (value) => {
    expect(() => validateEnv({ ...base, DEEPL_MAX_RETRIES: value })).toThrow(/DEEPL_MAX_RETRIES/)
  })

  it("accept the fake provider outside production only", () => {
    expect(() => validateEnv({ ...base, TRANSLATION_PROVIDER: "fake" })).not.toThrow()
    expect(() => validateEnv({ ...base, TRANSLATION_PROVIDER: "deepl" })).not.toThrow()
    expect(() => validateEnv({ ...base, TRANSLATION_PROVIDER: "" })).not.toThrow()
    expect(() =>
      validateEnv({ ...production, DEEPL_API_KEY: "k:fx", TRANSLATION_PROVIDER: "fake" }),
    ).toThrow(/TRANSLATION_PROVIDER/)
  })

  it("reject a provider it does not know", () => {
    expect(() => validateEnv({ ...base, TRANSLATION_PROVIDER: "google" })).toThrow(
      /TRANSLATION_PROVIDER/,
    )
  })
})

describe("the lyrics settings", () => {
  it("are optional", () => {
    expect(() => validateEnv(base)).not.toThrow()
  })

  it.each(["1", "10", "60"])("accept the rate limit %s", (value) => {
    expect(() =>
      validateEnv({
        ...base,
        LYRICS_TRANSLATE_THROTTLE_LIMIT: value,
        LYRICS_TRANSLATE_THROTTLE_TTL_SECONDS: value,
      }),
    ).not.toThrow()
  })

  it.each(["0", "-1", "1.5", "many"])("reject the rate limit %p", (value) => {
    expect(() => validateEnv({ ...base, LYRICS_TRANSLATE_THROTTLE_LIMIT: value })).toThrow(
      /LYRICS_TRANSLATE_THROTTLE_LIMIT/,
    )
    expect(() => validateEnv({ ...base, LYRICS_TRANSLATE_THROTTLE_TTL_SECONDS: value })).toThrow(
      /LYRICS_TRANSLATE_THROTTLE_TTL_SECONDS/,
    )
  })

  it.each(["1", "50", "90", "100"])("accept LYRICS_TRANSLATION_STOP_AT_PERCENT=%s", (value) => {
    expect(() => validateEnv({ ...base, LYRICS_TRANSLATION_STOP_AT_PERCENT: value })).not.toThrow()
  })

  it.each(["0", "101", "-5", "90.5", "all", " "])(
    "reject LYRICS_TRANSLATION_STOP_AT_PERCENT=%p",
    (value) => {
      expect(() => validateEnv({ ...base, LYRICS_TRANSLATION_STOP_AT_PERCENT: value })).toThrow(
        /LYRICS_TRANSLATION_STOP_AT_PERCENT/,
      )
    },
  )
})
