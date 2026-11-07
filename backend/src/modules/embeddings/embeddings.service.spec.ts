import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { Logger, ServiceUnavailableException } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import type { EmbeddingKind, EmbeddingProvider } from "./embedding-provider.js"
import { createEmbeddingProvider } from "./embeddings.module.js"
import { EmbeddingsService } from "./embeddings.service.js"
import { readEmbeddingsConfig } from "./embeddings.config.js"
import { EmbeddingServiceError, GeminiEmbeddingProvider } from "./gemini-embedding.provider.js"
import { HashingEmbeddingProvider } from "./hashing-embedding.provider.js"

const config = (env: Record<string, string | undefined>) =>
  ({ get: (key: string) => env[key] }) as unknown as ConfigService

/** A provider that returns [text length] for every text and remembers what it was asked. */
function fakeProvider() {
  const embed = jest.fn<EmbeddingProvider["embed"]>(
    async (texts: readonly string[], _kind: EmbeddingKind) => texts.map((text) => [text.length]),
  )
  const provider: EmbeddingProvider = { model: "fixed-test-model", dimensions: 1, embed }
  return { provider, embed }
}

beforeEach(() => {
  jest.restoreAllMocks()
  jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
})

describe("EmbeddingsService with a provider", () => {
  it("embeds documents and a question through it, telling it which is which", async () => {
    const { provider, embed } = fakeProvider()
    const service = new EmbeddingsService(provider)

    expect(await service.embedDocuments(["abc", "de"])).toEqual([[3], [2]])
    expect(await service.embedQuery("hello")).toEqual([5])

    expect(embed).toHaveBeenNthCalledWith(1, ["abc", "de"], "document")
    expect(embed).toHaveBeenNthCalledWith(2, ["hello"], "query")
  })

  it("says it is on, and which model makes the vectors", () => {
    const service = new EmbeddingsService(fakeProvider().provider)

    expect(service.enabled).toBe(true)
    expect(service.model).toBe("fixed-test-model")
    expect(service.dimensions).toBe(1)
  })

  it("does not call the provider for an empty list", async () => {
    const { provider, embed } = fakeProvider()

    expect(await new EmbeddingsService(provider).embedDocuments([])).toEqual([])
    expect(embed).not.toHaveBeenCalled()
  })

  it("answers 503 when the embedding service fails, without its details", async () => {
    const { provider, embed } = fakeProvider()
    embed.mockRejectedValue(new EmbeddingServiceError("The embedding service answered 500", 500))

    const error: unknown = await new EmbeddingsService(provider)
      .embedQuery("x")
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ServiceUnavailableException)
    expect((error as Error).message).toBe("Semantic features are temporarily unavailable")
  })

  it("lets a bug (an error that is not the service's) through instead of hiding it", async () => {
    const { provider, embed } = fakeProvider()
    embed.mockRejectedValue(new RangeError("bug"))

    await expect(new EmbeddingsService(provider).embedQuery("x")).rejects.toBeInstanceOf(RangeError)
  })
})

describe("EmbeddingsService without a provider", () => {
  const service = () => new EmbeddingsService(null)

  it("is off", () => {
    expect(service().enabled).toBe(false)
    expect(service().model).toBeNull()
    expect(service().dimensions).toBeNull()
  })

  it("answers 503 to every request, so the features switch off and nothing else breaks", async () => {
    await expect(service().embedQuery("x")).rejects.toBeInstanceOf(ServiceUnavailableException)
    await expect(service().embedDocuments(["x"])).rejects.toThrow("not configured")
  })

  it("starts anyway and only warns", () => {
    const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)

    expect(() => new EmbeddingsService(null)).not.toThrow()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("semantic features are off"))
  })
})

describe("readEmbeddingsConfig", () => {
  it("defaults to no provider, the default model and no key", () => {
    expect(readEmbeddingsConfig(config({}))).toEqual({
      provider: null,
      model: "gemini-embedding-2",
      apiKey: null,
    })
  })

  it("trims values, ignores case and counts blanks as not set", () => {
    expect(
      readEmbeddingsConfig(
        config({
          EMBEDDING_PROVIDER: " Gemini ",
          EMBEDDING_MODEL: " m ",
          EMBEDDING_API_KEY: " k ",
        }),
      ),
    ).toEqual({ provider: "gemini", model: "m", apiKey: "k" })
    expect(
      readEmbeddingsConfig(config({ EMBEDDING_PROVIDER: " ", EMBEDDING_API_KEY: "" })),
    ).toMatchObject({ provider: null, apiKey: null })
  })

  it("does not take a provider it does not know", () => {
    expect(readEmbeddingsConfig(config({ EMBEDDING_PROVIDER: "openai" })).provider).toBeNull()
  })
})

describe("createEmbeddingProvider", () => {
  it("builds Gemini with the key and the model", () => {
    const provider = createEmbeddingProvider(
      config({
        EMBEDDING_PROVIDER: "gemini",
        EMBEDDING_API_KEY: "k",
        EMBEDDING_MODEL: "gemini-embedding-001",
      }),
    )

    expect(provider).toBeInstanceOf(GeminiEmbeddingProvider)
    expect(provider?.model).toBe("gemini-embedding-001")
  })

  it("builds nothing for Gemini without a key: the features are off, the API still starts", () => {
    expect(createEmbeddingProvider(config({ EMBEDDING_PROVIDER: "gemini" }))).toBeNull()
  })

  it("builds the hashing stand-in for the fake provider, with no key", () => {
    expect(createEmbeddingProvider(config({ EMBEDDING_PROVIDER: "fake" }))).toBeInstanceOf(
      HashingEmbeddingProvider,
    )
  })

  it("builds nothing when no provider is set", () => {
    expect(createEmbeddingProvider(config({}))).toBeNull()
  })
})
