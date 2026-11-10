import { describe, expect, it } from "@jest/globals"
import { readLlmConfig } from "./llm-config.js"

const from = (env: Record<string, string | undefined>) => readLlmConfig((key) => env[key])

describe("readLlmConfig", () => {
  it("has the defaults and no key when nothing is set", () => {
    expect(from({})).toEqual({
      apiKey: null,
      model: "gemini-3.5-flash-lite",
      maxTokens: 1024,
      dailyMessageLimit: 30,
      thinkingLevel: null,
    })
  })

  it("uses GEMINI_API_KEY, and the key of the embeddings when it is blank or missing", () => {
    expect(from({ GEMINI_API_KEY: "gemini-key", EMBEDDING_API_KEY: "embed-key" }).apiKey).toBe(
      "gemini-key",
    )
    expect(from({ GEMINI_API_KEY: "  ", EMBEDDING_API_KEY: "embed-key" }).apiKey).toBe("embed-key")
    expect(from({ EMBEDDING_API_KEY: "embed-key" }).apiKey).toBe("embed-key")
    expect(from({ GEMINI_API_KEY: "", EMBEDDING_API_KEY: "" }).apiKey).toBeNull()
  })

  it("reads the model, the limits and the thinking level, trimmed", () => {
    expect(
      from({
        AI_MODEL: " gemini-3.6-flash ",
        AI_MAX_TOKENS: "2048",
        AI_DAILY_MESSAGE_LIMIT: "10",
        AI_THINKING_LEVEL: " LOW ",
      }),
    ).toMatchObject({
      model: "gemini-3.6-flash",
      maxTokens: 2048,
      dailyMessageLimit: 10,
      thinkingLevel: "low",
    })
  })

  it.each([["0"], ["-5"], ["1.5"], ["abc"], [""]])(
    "falls back to the default for the limit %j",
    (value) => {
      expect(from({ AI_MAX_TOKENS: value, AI_DAILY_MESSAGE_LIMIT: value })).toMatchObject({
        maxTokens: 1024,
        dailyMessageLimit: 30,
      })
    },
  )

  it("ignores a thinking level that does not exist", () => {
    expect(from({ AI_THINKING_LEVEL: "extreme" }).thinkingLevel).toBeNull()
  })
})
