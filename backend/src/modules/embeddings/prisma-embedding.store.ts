import { Injectable } from "@nestjs/common"
import { Prisma } from "../../generated/prisma/client.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import { EMBEDDING_DIMENSIONS } from "./embedding-provider.js"
import type { EmbeddedKind, EmbeddingRow, EmbeddingStore, StoredEmbedding } from "./ports.js"
import { toVectorParam } from "./vector-math.js"

/**
 * The only SQL text in this class that is not a parameter is a table and a column name, taken from
 * this fixed list: nothing a user or the catalog sends ever becomes part of the SQL.
 */
const TABLES = {
  track: { table: Prisma.raw('"TrackEmbedding"'), key: Prisma.raw('"trackId"') },
  artist: { table: Prisma.raw('"ArtistEmbedding"'), key: Prisma.raw('"artistId"') },
} as const

/** PostgreSQL error code for a foreign key violation: the track or artist is gone. */
const FOREIGN_KEY_VIOLATION = "23503"

function sqlState(error: unknown): string | undefined {
  const meta = (error as { meta?: { code?: string } } | null)?.meta
  return meta?.code ?? (error as { code?: string } | null)?.code
}

/**
 * Vectors in PostgreSQL. Prisma cannot read or write a pgvector column, so everything goes through
 * `$queryRaw` / `$executeRaw` with tagged templates: every value, the vector included, is a bound
 * parameter.
 */
@Injectable()
export class PrismaEmbeddingStore implements EmbeddingStore {
  constructor(private readonly prisma: PrismaService) {}

  async stored(kind: EmbeddedKind, ids: readonly string[]): Promise<Map<string, StoredEmbedding>> {
    if (ids.length === 0) return new Map()
    const { table, key } = TABLES[kind]
    const rows = await this.prisma.$queryRaw<{ id: string; model: string; contentHash: string }[]>(
      Prisma.sql`SELECT ${key} AS id, model, "contentHash" FROM ${table} WHERE ${key} = ANY(${[...ids]}::text[])`,
    )
    return new Map(rows.map((row) => [row.id, { model: row.model, contentHash: row.contentHash }]))
  }

  async save(kind: EmbeddedKind, rows: readonly EmbeddingRow[]): Promise<void> {
    const { table, key } = TABLES[kind]
    for (const row of rows) {
      const vector = toVectorParam(row.vector, EMBEDDING_DIMENSIONS)
      try {
        await this.prisma.$executeRaw(Prisma.sql`
          INSERT INTO ${table} (${key}, embedding, model, "contentHash", "updatedAt")
          VALUES (${row.id}, ${vector}::vector, ${row.model}, ${row.contentHash}, now())
          ON CONFLICT (${key}) DO UPDATE SET
            embedding = EXCLUDED.embedding,
            model = EXCLUDED.model,
            "contentHash" = EXCLUDED."contentHash",
            "updatedAt" = now()`)
      } catch (error) {
        // Deleted while its vector was being made: there is nothing left to describe.
        if (sqlState(error) !== FOREIGN_KEY_VIOLATION) throw error
      }
    }
  }

  async count(kind: EmbeddedKind): Promise<number> {
    const { table } = TABLES[kind]
    const [row] = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`SELECT count(*) AS count FROM ${table}`,
    )
    return Number(row.count)
  }
}
