import { Inject, Injectable } from "@nestjs/common"
import { EmbeddingsService } from "./embeddings.service.js"
import { KNOWLEDGE_STORE, type KnowledgeStore } from "./ports.js"

/** A piece of a help text that answers a question. */
export interface KnowledgeAnswer {
  /** File it came from, e.g. "premium.md": the source to cite. */
  source: string
  /** Heading above it, e.g. "Các gói Premium". */
  heading: string
  content: string
  /** 0 to 1 (cosine similarity): higher is closer. */
  score: number
}

const DEFAULT_LIMIT = 4
const MAX_LIMIT = 10

/** Finds the pieces of the help texts closest in meaning to a question. */
@Injectable()
export class KnowledgeService {
  constructor(
    private readonly embeddings: EmbeddingsService,
    @Inject(KNOWLEDGE_STORE) private readonly store: KnowledgeStore,
  ) {}

  /** Answers 503 (from the embeddings service) while semantic features are off. */
  async search(question: string, limit: number = DEFAULT_LIMIT): Promise<KnowledgeAnswer[]> {
    if (!question.trim()) return []
    const wanted = Number.isFinite(limit) ? Math.trunc(limit) : DEFAULT_LIMIT
    const vector = await this.embeddings.embedQuery(question)
    const model = this.embeddings.model
    if (!model) return []
    const hits = await this.store.nearest(vector, Math.min(Math.max(wanted, 1), MAX_LIMIT), model)
    return hits.map((hit) => ({
      source: hit.source,
      heading: hit.heading,
      content: hit.content,
      score: Math.max(0, 1 - hit.distance),
    }))
  }
}
