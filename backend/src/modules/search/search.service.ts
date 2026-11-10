import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import type { Region } from "../../generated/prisma/enums.js"
import { toSearchName } from "../../shared/text/search-name.js"
import { ArtistsService, type ArtistView } from "../artists/index.js"
import { EMBEDDING_STORE, EmbeddingsService, type EmbeddingStore } from "../embeddings/index.js"
import { TracksService, type TrackView } from "../tracks/index.js"
import type { SemanticSearchQueryDto, SemanticType } from "./dto/semantic-search.dto.js"
import { rankKeywordMatches } from "./keyword-rank.js"
import { reciprocalRankFusion } from "./rank-fusion.js"

/** Candidates taken from each of the two searches before they are merged. */
const CANDIDATES = 50

/**
 * Rows the search by words reads before it ranks them by quality of match. The database can only
 * cut by popularity, so the window must be wide enough that an exact match with few plays is not
 * cut off; for a catalog of this size it holds every match.
 */
const KEYWORD_WINDOW = 500

/** The lists a result came from: it can be in one, or in both. */
export type SearchSource = "keyword" | "vector"

export interface SemanticTrackHit {
  /** Reciprocal Rank Fusion score: higher is better; only meaningful against the same search. */
  score: number
  sources: SearchSource[]
  track: TrackView
}

export interface SemanticArtistHit {
  score: number
  sources: SearchSource[]
  artist: ArtistView
}

export interface SemanticSearchResult {
  query: string
  type: SemanticType
  /**
   * True when the search by meaning could not run (the embedding service is down or out of quota)
   * and only the search by words answered. The results are still good for names.
   */
  degraded: boolean
  items: (SemanticTrackHit | SemanticArtistHit)[]
}

const SOURCE_NAMES: readonly SearchSource[] = ["keyword", "vector"]

/** The one way the two lists are merged, for the API and for the evaluation. */
const fuse = (keywordIds: readonly string[], vectorIds: readonly string[], limit: number) =>
  reciprocalRankFusion([keywordIds, vectorIds]).slice(0, limit)

/**
 * Search by meaning and by words at once. The question is turned into a vector and compared with
 * the vectors of the tracks (or artists); a plain search by name runs beside it; the two lists are
 * merged with Reciprocal Rank Fusion, so "nhạc buồn ngày mưa" finds songs that never contain
 * those words, and "son tung" still finds "Sơn Tùng" first.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)

  constructor(
    private readonly embeddings: EmbeddingsService,
    @Inject(EMBEDDING_STORE) private readonly store: EmbeddingStore,
    private readonly tracks: TracksService,
    private readonly artists: ArtistsService,
  ) {}

  async semantic(query: SemanticSearchQueryDto, userId?: string): Promise<SemanticSearchResult> {
    const { q, type, region, limit } = query
    // Without a provider the feature is off: 503. With one that fails right now, the search by
    // words still answers, marked as degraded.
    if (!this.embeddings.enabled) {
      throw new ServiceUnavailableException("Semantic features are not configured")
    }
    const vector = await this.embedQuery(q)
    const [keywordIds, vectorIds] = await Promise.all([
      this.keywordIds(type, q, region),
      vector ? this.vectorIds(type, vector, region) : Promise.resolve([]),
    ])
    const degraded = vector === null

    const fused = fuse(keywordIds, vectorIds, limit)
    const ids = fused.map((item) => item.id)
    const hitOf = (item: (typeof fused)[number]) => ({
      score: item.score,
      sources: item.sources.map((source) => SOURCE_NAMES[source]),
    })

    if (type === "track") {
      const views = new Map(
        (await this.tracks.getByIds(ids, userId)).map((view) => [view.id, view]),
      )
      return {
        query: q,
        type,
        degraded,
        items: fused.flatMap((item) => {
          const track = views.get(item.id)
          return track ? [{ ...hitOf(item), track }] : []
        }),
      }
    }
    const views = new Map((await this.artists.getByIds(ids, userId)).map((view) => [view.id, view]))
    return {
      query: q,
      type,
      degraded,
      items: fused.flatMap((item) => {
        const artist = views.get(item.id)
        return artist ? [{ ...hitOf(item), artist }] : []
      }),
    }
  }

  /**
   * For the evaluation (`npm run ai:eval`): the ids of the tracks found by the search by words,
   * by the search by meaning, and by the two merged exactly as `semantic()` merges them, best
   * first. The two lists are made once and the merged one is worked out from them. A failing
   * embedding service is an error here, not a quiet fallback: a number measured on half a search
   * would be wrong.
   */
  async trackLists(
    q: string,
    limit: number,
  ): Promise<{ keyword: string[]; vector: string[]; hybrid: string[] }> {
    const vector = await this.embeddings.embedQuery(q)
    const [keywordIds, vectorIds] = await Promise.all([
      this.keywordIds("track", q),
      this.vectorIds("track", vector),
    ])
    return {
      keyword: keywordIds.slice(0, limit),
      vector: vectorIds.slice(0, limit),
      hybrid: fuse(keywordIds, vectorIds, limit).map((item) => item.id),
    }
  }

  /** The vector of the question, or null when the embedding service cannot answer now. */
  private async embedQuery(q: string): Promise<number[] | null> {
    try {
      return await this.embeddings.embedQuery(q)
    } catch (error) {
      if (!(error instanceof ServiceUnavailableException)) throw error
      this.logger.warn("Semantic search is degraded: the embedding service did not answer")
      return null
    }
  }

  /** The search by words: ids, best match first. */
  private async keywordIds(type: SemanticType, q: string, region?: Region): Promise<string[]> {
    const needle = toSearchName(q)
    if (!needle) return []
    if (type === "track") {
      const matches = await this.tracks.keywordMatches(q, region, KEYWORD_WINDOW)
      return rankKeywordMatches(
        matches.map((match) => ({
          id: match.id,
          name: match.name,
          secondary: match.artistName,
          popularity: match.plays,
        })),
        needle,
      ).slice(0, CANDIDATES)
    }
    const matches = await this.artists.keywordMatches(q, region, KEYWORD_WINDOW)
    return rankKeywordMatches(
      matches.map((match) => ({
        id: match.id,
        name: match.name,
        secondary: "",
        popularity: match.followers,
      })),
      needle,
    ).slice(0, CANDIDATES)
  }

  /** The search by meaning: ids, nearest first. Without a region the whole index is searched. */
  private async vectorIds(
    type: SemanticType,
    vector: number[],
    region?: Region,
  ): Promise<string[]> {
    const only = region
      ? type === "track"
        ? await this.tracks.idsInRegion(region)
        : await this.artists.idsInRegion(region)
      : undefined
    const hits = await this.store.nearest(type, vector, CANDIDATES, only)
    return hits.map((hit) => hit.id)
  }
}
