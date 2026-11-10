import { Injectable } from "@nestjs/common"
import { Prisma } from "../../generated/prisma/client.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import { toVectorParam } from "../../shared/vectors/vector-math.js"
import { EMBEDDING_DIMENSIONS } from "./embedding-provider.js"
import type { KnowledgeHit, KnowledgeRow, KnowledgeStore, StoredEmbedding } from "./ports.js"

/** The vectors of the help texts in PostgreSQL; every value, the vector included, is a parameter. */
@Injectable()
export class PrismaKnowledgeStore implements KnowledgeStore {
  constructor(private readonly prisma: PrismaService) {}

  async stored(source: string): Promise<Map<number, StoredEmbedding>> {
    const rows = await this.prisma.knowledgeChunk.findMany({
      where: { source },
      select: { position: true, model: true, contentHash: true },
    })
    return new Map(
      rows.map((row) => [row.position, { model: row.model, contentHash: row.contentHash }]),
    )
  }

  async save(rows: readonly KnowledgeRow[]): Promise<void> {
    // All or nothing: a file is never left half re-indexed by a failure in the middle of a batch.
    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const vector = toVectorParam(row.vector, EMBEDDING_DIMENSIONS)
        // The id is derived from the identity of the chunk, so saving again replaces it.
        const id = `${row.source}#${row.position}`
        await tx.$executeRaw(Prisma.sql`
        INSERT INTO "KnowledgeChunk"
          (id, source, heading, position, content, embedding, model, "contentHash", "updatedAt")
        VALUES
          (${id}, ${row.source}, ${row.heading}, ${row.position}, ${row.content},
           ${vector}::vector, ${row.model}, ${row.contentHash}, now())
        ON CONFLICT (source, position) DO UPDATE SET
          heading = EXCLUDED.heading,
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          model = EXCLUDED.model,
          "contentHash" = EXCLUDED."contentHash",
          "updatedAt" = now()`)
      }
    })
  }

  async deleteFrom(source: string, fromPosition: number): Promise<number> {
    const { count } = await this.prisma.knowledgeChunk.deleteMany({
      where: { source, position: { gte: fromPosition } },
    })
    return count
  }

  async deleteSourcesNotIn(sources: readonly string[]): Promise<number> {
    const { count } = await this.prisma.knowledgeChunk.deleteMany({
      where: { source: { notIn: [...sources] } },
    })
    return count
  }

  async nearest(vector: readonly number[], limit: number, model: string): Promise<KnowledgeHit[]> {
    const query = toVectorParam(vector, EMBEDDING_DIMENSIONS)
    const rows = await this.prisma.$queryRaw<
      { source: string; heading: string; position: number; content: string; distance: number }[]
    >(Prisma.sql`
      SELECT source, heading, position, content, embedding <=> ${query}::vector AS distance
      FROM "KnowledgeChunk"
      WHERE model = ${model}
      ORDER BY embedding <=> ${query}::vector
      LIMIT ${limit}`)
    return rows.map((row) => ({ ...row, distance: Number(row.distance) }))
  }

  count(): Promise<number> {
    return this.prisma.knowledgeChunk.count()
  }
}
