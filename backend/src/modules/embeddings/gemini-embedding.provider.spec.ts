import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import { Logger } from "@nestjs/common"
import { EMBEDDING_DIMENSIONS } from "./embedding-provider.js"
import {
  EmbeddingServiceError,
  GEMINI_BATCH_SIZE,
  GeminiEmbeddingProvider,
} from "./gemini-embedding.provider.js"

const KEY = "AIza-test-key-that-must-never-leak"

interface SentRequest {
  model: string
  outputDimensionality: number
  taskType?: string
  content: { parts: { text: string }[] }
}

/** Answers every batch with one vector per request: (1, 2, 0, 0, ...) - not unit length. */
function answerWithVectors(options: { size?: number; drop?: number } = {}) {
  return jest.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    const { requests } = JSON.parse(init?.body as string) as { requests: SentRequest[] }
    const values = new Array<number>(options.size ?? EMBEDDING_DIMENSIONS).fill(0)
    values[0] = 3
    values[1] = 4
    const embeddings = requests.slice(options.drop ?? 0).map(() => ({ values }))
    return new Response(JSON.stringify({ embeddings }), { status: 200 })
  })
}

const sent = (spy: ReturnType<typeof answerWithVectors>, call = 0) => ({
  url: spy.mock.calls[call][0] as string,
  init: spy.mock.calls[call][1] as RequestInit,
  requests: (JSON.parse(spy.mock.calls[call][1]?.body as string) as { requests: SentRequest[] })
    .requests,
})

beforeEach(() => {
  jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
})
afterEach(() => {
  jest.restoreAllMocks()
})

describe("GeminiEmbeddingProvider with gemini-embedding-2", () => {
  const provider = () => new GeminiEmbeddingProvider("gemini-embedding-2", KEY)

  it("calls batchEmbedContents with the key in a header, never in the address", async () => {
    const spy = answerWithVectors()

    await provider().embed(["a"], "document")

    const { url, init } = sent(spy)
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents",
    )
    expect(url).not.toContain(KEY)
    expect(init.method).toBe("POST")
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "x-goog-api-key": KEY,
    })
  })

  it("asks for 768 numbers per text and sends no task type (the model has none)", async () => {
    const spy = answerWithVectors()

    await provider().embed(["a", "b"], "document")

    const { requests } = sent(spy)
    expect(requests).toHaveLength(2)
    for (const request of requests) {
      expect(request.model).toBe("models/gemini-embedding-2")
      expect(request.outputDimensionality).toBe(768)
      expect(request.taskType).toBeUndefined()
    }
  })

  it("marks a document and a question with the prefixes the documentation prescribes", async () => {
    const spy = answerWithVectors()
    await provider().embed(["Bài: Mưa. Nghệ sĩ: A"], "document")
    await provider().embed(["nhạc buồn"], "query")

    expect(sent(spy, 0).requests[0].content.parts[0].text).toBe(
      "title: none | text: Bài: Mưa. Nghệ sĩ: A",
    )
    expect(sent(spy, 1).requests[0].content.parts[0].text).toBe(
      "task: search result | query: nhạc buồn",
    )
  })

  it("returns the vectors in order, scaled to length 1", async () => {
    answerWithVectors()

    const vectors = await provider().embed(["a", "b"], "query")

    expect(vectors).toHaveLength(2)
    expect(vectors[0][0]).toBeCloseTo(0.6)
    expect(vectors[0][1]).toBeCloseTo(0.8)
    expect(Math.hypot(...vectors[1])).toBeCloseTo(1)
  })

  it("splits a long list into requests of at most the batch size and keeps the order", async () => {
    const spy = answerWithVectors()
    const texts = Array.from({ length: GEMINI_BATCH_SIZE * 2 + 20 }, (_, index) => `text ${index}`)

    const vectors = await provider().embed(texts, "document")

    expect(spy).toHaveBeenCalledTimes(3)
    expect(sent(spy, 0).requests).toHaveLength(GEMINI_BATCH_SIZE)
    expect(sent(spy, 2).requests).toHaveLength(20)
    expect(sent(spy, 2).requests[19].content.parts[0].text).toContain("text 119")
    expect(vectors).toHaveLength(texts.length)
  })

  it("sends nothing for an empty list", async () => {
    const spy = answerWithVectors()

    expect(await provider().embed([], "document")).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })

  describe("failures", () => {
    const failure = async (promise: Promise<unknown>) => {
      const error: unknown = await promise.then(
        () => null,
        (caught: unknown) => caught,
      )
      expect(error).toBeInstanceOf(EmbeddingServiceError)
      return error as EmbeddingServiceError
    }

    it("reports the status of an error answer, without the key or the body", async () => {
      jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(`{"error":"bad key ${KEY}"}`, { status: 403 }))

      const error = await failure(provider().embed(["a"], "query"))

      expect(error.status).toBe(403)
      expect(error.message).toBe("The embedding service answered 403")
      expect(error.message).not.toContain(KEY)
    })

    it("reports a rate limit as 429", async () => {
      jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 429 }))

      expect((await failure(provider().embed(["a"], "query"))).status).toBe(429)
    })

    it("reports a service that cannot be reached as status 0", async () => {
      jest.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"))

      const error = await failure(provider().embed(["a"], "query"))

      expect(error.status).toBe(0)
      expect(error.message).not.toContain(KEY)
    })

    it("refuses an answer with the wrong number of vectors", async () => {
      answerWithVectors({ drop: 1 })

      expect((await failure(provider().embed(["a", "b"], "query"))).status).toBe(502)
    })

    it("refuses vectors of the wrong size, which the database column would not take", async () => {
      answerWithVectors({ size: 3072 })

      const error = await failure(provider().embed(["a"], "query"))

      expect(error.status).toBe(502)
      expect(error.message).toContain("768")
    })
  })
})

describe("GeminiEmbeddingProvider with gemini-embedding-001", () => {
  const provider = () => new GeminiEmbeddingProvider("gemini-embedding-001", KEY)

  it("uses a task type and leaves the text as it is", async () => {
    const spy = answerWithVectors()
    await provider().embed(["a document"], "document")
    await provider().embed(["a question"], "query")

    const document = sent(spy, 0).requests[0]
    expect(document.taskType).toBe("RETRIEVAL_DOCUMENT")
    expect(document.content.parts[0].text).toBe("a document")
    expect(document.model).toBe("models/gemini-embedding-001")
    expect(sent(spy, 1).requests[0].taskType).toBe("RETRIEVAL_QUERY")
    expect(sent(spy, 0).url).toContain("/gemini-embedding-001:batchEmbedContents")
  })

  it("normalises the vectors itself, which this model does not do for shortened ones", async () => {
    answerWithVectors()

    const [vector] = await provider().embed(["a"], "document")

    expect(Math.hypot(...vector)).toBeCloseTo(1)
  })

  it("exposes its model name so stored vectors can be told apart", () => {
    expect(provider().model).toBe("gemini-embedding-001")
    expect(provider().dimensions).toBe(768)
  })
})
