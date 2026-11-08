import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common"
import type { Region } from "../../generated/prisma/enums.js"
import { EMBEDDING_STORE, EmbeddingsService, type EmbeddingStore } from "../embeddings/index.js"
import { LikeKind, LikesService } from "../likes/index.js"
import { TracksService, type TrackView } from "../tracks/index.js"
import { capPerArtist, selectDiverse, type Candidate } from "./diversify.js"
import {
  buildTasteVector,
  PLAY_WINDOW_DAYS,
  signalWeight,
  type TasteSignal,
} from "./taste-profile.js"

/** Liked tracks that shape the taste (the most recent ones). */
const MAX_LIKES = 100
/** Listens read to shape the taste and the "because you listened" track. */
const MAX_PLAYS = 300
/** Tracks of the history (by weight) that make the taste: more would add cost, not accuracy. */
const TASTE_TRACKS = 60
/** Nearest tracks read before they are diversified; more than any list asked for. */
const POOL = 100
const DAY_MS = 24 * 60 * 60 * 1000

/** How `for-you` was made: from the taste of the user, or from what is popular (cold start). */
export type ForYouStrategy = "taste" | "popular"

export interface ForYouResult {
  strategy: ForYouStrategy
  items: TrackView[]
}

export interface BecauseYouListenedResult {
  /** The track the list is based on; null when the user has not listened to anything lately. */
  basedOn: TrackView | null
  items: TrackView[]
}

export interface SimilarTracksResult {
  items: TrackView[]
}

interface RankRequest {
  vector: readonly number[]
  exclude: ReadonlySet<string>
  limit: number
  region?: Region
  userId?: string
}

/** Recommendations from the vectors of the tracks. Owns no tables. */
@Injectable()
export class RecommendationsService {
  constructor(
    private readonly tracks: TracksService,
    private readonly likes: LikesService,
    private readonly embeddings: EmbeddingsService,
    @Inject(EMBEDDING_STORE) private readonly store: EmbeddingStore,
  ) {}

  /**
   * Tracks that fit the taste of the user (likes count three times a listen, listens fade over
   * 30 days), without the ones they already know, varied, at most three per artist. A user with
   * no history gets what is popular instead (in `region` when one is asked for).
   */
  async forYou(userId: string, limit: number, region?: Region): Promise<ForYouResult> {
    const likedIds = (await this.likes.likedIds(LikeKind.Tracks, userId)).slice(0, MAX_LIKES)
    const plays = await this.tracks.recentPlays(userId, this.windowStart(), MAX_PLAYS)
    const now = new Date()
    const signals = this.signals(likedIds, plays)
    const known = new Set(signals.map((signal) => signal.trackId))

    // The taste is made from the tracks that weigh most; the rest are still "known" below.
    const strongest = [...signals]
      .sort((a, b) => signalWeight(b, now) - signalWeight(a, now))
      .slice(0, TASTE_TRACKS)
    const vectors = await this.store.vectorsOf(
      "track",
      strongest.map((signal) => signal.trackId),
    )
    const taste = buildTasteVector(strongest, vectors, now)
    if (taste) {
      const items = await this.rank({ vector: taste, exclude: known, limit, region, userId })
      if (items.length > 0) return { strategy: "taste", items }
    }
    return { strategy: "popular", items: await this.popular(userId, limit, region, known) }
  }

  /** Tracks like the one the user listened to last (that has a vector). */
  async becauseYouListened(
    userId: string,
    limit: number,
    region?: Region,
  ): Promise<BecauseYouListenedResult> {
    this.assertEnabled()
    const plays = await this.tracks.recentPlays(userId, this.windowStart(), MAX_PLAYS)
    const played = [...new Set(plays.map((play) => play.trackId))] // newest first
    // Which of them have a vector (no payload); only the one chosen is read in full.
    const withVector = await this.store.stored("track", played)
    const seedId = played.find((id) => withVector.has(id))
    const seedVector = seedId
      ? (await this.store.vectorsOf("track", [seedId])).get(seedId)
      : undefined
    if (!seedId || !seedVector) return { basedOn: null, items: [] }

    const [basedOn] = await this.tracks.getByIds([seedId], userId)
    if (!basedOn) return { basedOn: null, items: [] }
    const items = await this.rank({
      vector: seedVector,
      exclude: new Set(played),
      limit,
      region,
      userId,
    })
    return { basedOn, items }
  }

  /** Tracks close to `trackId` in style and mood. 404 for an unknown track. */
  async similar(trackId: string, limit: number, userId?: string): Promise<SimilarTracksResult> {
    this.assertEnabled()
    await this.tracks.get(trackId) // 404 when it does not exist
    const vector = (await this.store.vectorsOf("track", [trackId])).get(trackId)
    if (!vector) return { items: [] }
    return { items: await this.rank({ vector, exclude: new Set([trackId]), limit, userId }) }
  }

  /** The semantic features need the embeddings to be set up; without them the sections are hidden. */
  private assertEnabled(): void {
    if (!this.embeddings.enabled) {
      throw new ServiceUnavailableException("Semantic features are not configured")
    }
  }

  private windowStart(): Date {
    return new Date(Date.now() - PLAY_WINDOW_DAYS * DAY_MS)
  }

  private signals(
    likedIds: readonly string[],
    plays: readonly { trackId: string; playedAt: Date }[],
  ): TasteSignal[] {
    const byTrack = new Map<string, { liked: boolean; playedAt: Date[] }>()
    const entry = (id: string) => {
      const found = byTrack.get(id) ?? { liked: false, playedAt: [] }
      byTrack.set(id, found)
      return found
    }
    for (const id of likedIds) entry(id).liked = true
    for (const play of plays) entry(play.trackId).playedAt.push(play.playedAt)
    return [...byTrack].map(([trackId, value]) => ({ trackId, ...value }))
  }

  /** Nearest tracks to `vector`, minus `exclude`, diversified. */
  private async rank({
    vector,
    exclude,
    limit,
    region,
    userId,
  }: RankRequest): Promise<TrackView[]> {
    const only = region ? await this.tracks.idsInRegion(region) : undefined
    const hits = await this.store.nearest("track", vector, POOL + exclude.size, only)
    const ids = hits.filter((hit) => !exclude.has(hit.id)).map((hit) => hit.id)
    if (ids.length === 0) return []

    const [views, vectors] = await Promise.all([
      this.tracks.getByIds(ids, userId),
      this.store.vectorsOf("track", ids),
    ])
    const viewById = new Map(views.map((view) => [view.id, view]))
    const similarity = new Map(hits.map((hit) => [hit.id, 1 - hit.distance]))
    const candidates = ids.flatMap((id): Candidate[] => {
      const view = viewById.get(id)
      const candidateVector = vectors.get(id)
      if (!view || !candidateVector) return []
      return [
        {
          id,
          artistId: view.artistId,
          relevance: similarity.get(id) ?? 0,
          vector: candidateVector,
        },
      ]
    })
    return selectDiverse(candidates, { limit }).map((candidate) => viewById.get(candidate.id)!)
  }

  /** The most played tracks that the user does not know yet, at most three per artist. */
  private async popular(
    userId: string,
    limit: number,
    region: Region | undefined,
    known: ReadonlySet<string>,
  ): Promise<TrackView[]> {
    const ids = (await this.tracks.popularIds(region, POOL)).filter((id) => !known.has(id))
    const views = await this.tracks.getByIds(ids, userId)
    return capPerArtist(views).slice(0, limit)
  }
}
