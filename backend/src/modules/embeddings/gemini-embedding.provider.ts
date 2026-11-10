import { Logger } from "@nestjs/common"
import {
  EMBEDDING_DIMENSIONS,
  type EmbeddingKind,
  type EmbeddingProvider,
} from "./embedding-provider.js"
import { normalize } from "../../shared/vectors/vector-math.js"

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
const REQUEST_TIMEOUT_MS = 20_000
/**
 * Texts per request. Google's documentation does not state a maximum for batchEmbedContents, so
 * this stays well below the limits people report (100).
 */
export const GEMINI_BATCH_SIZE = 50

interface BatchResponse {
  embeddings?: { values?: number[] }[]
}

/** The service answered with an error. The message never contains the API key. */
export class EmbeddingServiceError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when the service could not be reached. */
    readonly status: number,
  ) {
    super(message)
    this.name = "EmbeddingServiceError"
  }
}

/**
 * Google's Gemini embeddings over plain HTTP (no SDK).
 *
 * `gemini-embedding-2` has no task type: the purpose goes into the text itself, as the
 * documentation prescribes (`task: search result | query: ...` for a question and
 * `title: none | text: ...` for a document), and it normalises shortened vectors by itself.
 * `gemini-embedding-001` takes a `taskType` and leaves the normalising to the caller.
 */
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  private readonly logger = new Logger(GeminiEmbeddingProvider.name)
  readonly dimensions = EMBEDDING_DIMENSIONS

  constructor(
    readonly model: string,
    private readonly apiKey: string,
  ) {}

  private get usesPrefixes(): boolean {
    return this.model.startsWith("gemini-embedding-2")
  }

  async embed(texts: readonly string[], kind: EmbeddingKind): Promise<number[][]> {
    const vectors: number[][] = []
    for (let start = 0; start < texts.length; start += GEMINI_BATCH_SIZE) {
      vectors.push(...(await this.embedBatch(texts.slice(start, start + GEMINI_BATCH_SIZE), kind)))
    }
    return vectors
  }

  private requestFor(text: string, kind: EmbeddingKind) {
    const base = { model: `models/${this.model}`, outputDimensionality: this.dimensions }
    if (this.usesPrefixes) {
      const prefixed =
        kind === "query" ? `task: search result | query: ${text}` : `title: none | text: ${text}`
      return { ...base, content: { parts: [{ text: prefixed }] } }
    }
    return {
      ...base,
      taskType: kind === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
      content: { parts: [{ text }] },
    }
  }

  private async embedBatch(texts: readonly string[], kind: EmbeddingKind): Promise<number[][]> {
    let response: Response
    try {
      response = await fetch(`${API_BASE}/${this.model}:batchEmbedContents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify({ requests: texts.map((text) => this.requestFor(text, kind)) }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch {
      throw new EmbeddingServiceError("The embedding service could not be reached", 0)
    }

    if (!response.ok) {
      this.logger.warn(`Gemini embeddings answered ${response.status}`)
      throw new EmbeddingServiceError(
        `The embedding service answered ${response.status}`,
        response.status,
      )
    }

    const body = (await response.json()) as BatchResponse
    const embeddings = body.embeddings ?? []
    if (embeddings.length !== texts.length) {
      throw new EmbeddingServiceError(
        "The embedding service returned the wrong number of vectors",
        502,
      )
    }
    return embeddings.map(({ values }) => {
      if (!values || values.length !== this.dimensions) {
        throw new EmbeddingServiceError(
          `Expected vectors of ${this.dimensions} numbers, got ${values?.length ?? 0}`,
          502,
        )
      }
      // Needed for gemini-embedding-001; harmless for -2, which normalises by itself.
      return normalize(values)
    })
  }
}
