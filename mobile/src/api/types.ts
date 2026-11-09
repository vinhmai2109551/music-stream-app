/**
 * Types of the backend REST API (see the controllers and views in backend/src/modules).
 * Dates travel as ISO strings in JSON.
 */
export type UserRole = "USER" | "ADMIN"

export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: UserRole
  isPremium: boolean
}

/** Short-lived access token (JWT) plus the single-use refresh token that renews it. */
export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse extends TokenPair {
  user: User
}

export interface LoginInput {
  email: string
  password: string
  /** Cloudflare Turnstile token; required when the backend has TURNSTILE_SECRET_KEY set. */
  turnstileToken?: string
}

export interface RegisterInput extends LoginInput {
  name: string
}

/** Error body returned by NestJS. */
export interface ApiErrorBody {
  statusCode: number
  message: string | string[]
  error?: string
}

// ---------------------------------------------------------------- shared

export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/** Query string accepted by every paginated list endpoint. */
export interface PageQuery {
  page?: number
  limit?: number
  /** Free-text search. */
  q?: string
}

export type LikeKind = "tracks" | "albums" | "playlists"

export interface PublicUser {
  id: string
  name: string
  avatarUrl: string | null
}

// ---------------------------------------------------------------- catalog

/** Where an artist comes from; the catalog can be filtered by it. */
export type Region = "VIETNAM" | "KOREA" | "JAPAN" | "CHINA" | "GLOBAL"

export interface ApiTrack {
  id: string
  title: string
  /** Name of the artist. */
  artist: string
  artistId: string
  /** Cover image URL. */
  cover: string
  /** File in our storage (R2). Tracks of real artists have none (null): they play from YouTube. */
  audioUrl: string | null
  /** Official YouTube video to play from; null when the track plays `audioUrl` instead. */
  youtubeVideoId: string | null
  plays: number
  /** Length in seconds. */
  duration: number
  likesCount: number
  liked: boolean
}

export interface TrackQuery extends PageQuery {
  artistId?: string
  /** Only tracks whose artist comes from this region. */
  region?: Region
}

export interface ApiArtist {
  id: string
  name: string
  bio: string
  /** Portrait image URL. */
  image: string
  region: Region
  followers: number
  followed: boolean
}

export interface ArtistQuery extends PageQuery {
  /** Only artists from this region. */
  region?: Region
}

export interface ApiArtistSummary {
  id: string
  name: string
  image: string
}

export interface ApiAlbum {
  id: string
  title: string
  /** Name of the artist. */
  artist: string
  artistId: string
  cover: string
  trackIds: string[]
  likesCount: number
  liked: boolean
}

export interface ApiAlbumDetail extends ApiAlbum {
  tracks: ApiTrack[]
}

export interface AlbumQuery extends PageQuery {
  artistId?: string
}

export interface ApiPlaylist {
  id: string
  name: string
  /** Display name of the owner ("Music Stream" for editorial playlists). */
  owner: string
  ownerId: string | null
  isOfficial: boolean
  description: string
  cover: string | null
  trackIds: string[]
  likesCount: number
  liked: boolean
}

export interface ApiPlaylistDetail extends ApiPlaylist {
  tracks: ApiTrack[]
}

export interface CreatePlaylistInput {
  name: string
  description?: string
  coverUrl?: string
}

export type UpdatePlaylistInput = Partial<CreatePlaylistInput>

// ---------------------------------------------------------------- social

export interface ApiComment {
  id: string
  user: PublicUser | null
  text: string
  createdAt: string
  likesCount: number
  liked: boolean
  parentId: string | null
  trackId: string | null
  postId: string | null
}

/** A top-level comment with its newest replies; the rest are loaded on request. */
export interface ApiCommentThread extends ApiComment {
  /** Up to 3 newest replies, oldest first. */
  replies: ApiComment[]
  /** All replies, also those not in `replies`. */
  repliesCount: number
}

/** One page of a list read with a cursor. */
export interface CursorPage<T> {
  items: T[]
  /** Pass it as `cursor` to get the next page; null on the last page. */
  nextCursor: string | null
}

export interface CursorQuery {
  cursor?: string
  limit?: number
}

/** A page of top-level comments, newest first. */
export interface ApiCommentPage extends CursorPage<ApiCommentThread> {
  /** Every comment on the target, replies included (not only this page). */
  total: number
}

/** Comments belong to exactly one target. */
export type CommentTarget = { trackId: string } | { postId: string }

export type CreateCommentInput = CommentTarget & {
  text: string
  /** Reply to another comment on the same track or post. */
  parentId?: string
}

export interface ApiFeedPost {
  id: string
  artist: ApiArtistSummary | null
  track: ApiTrack | null
  artwork: string
  caption: string
  createdAt: string
  likesCount: number
  commentsCount: number
  liked: boolean
}

// ---------------------------------------------------------------- users

export interface UpdateProfileInput {
  name?: string
  avatarUrl?: string
}

// ---------------------------------------------------------------- recommendations and semantic search

/** `taste`: made from what the user liked and played; `popular`: the user has no history yet. */
export type ForYouStrategy = "taste" | "popular"

export interface ForYouResponse {
  strategy: ForYouStrategy
  items: ApiTrack[]
}

export interface BecauseYouListenedResponse {
  /** The track the list is based on; null when nothing was played lately. */
  basedOn: ApiTrack | null
  items: ApiTrack[]
}

export interface SimilarTracksResponse {
  items: ApiTrack[]
}

export interface SemanticTrackHit {
  score: number
  sources: ("keyword" | "vector")[]
  track: ApiTrack
}

export interface SemanticTrackSearch {
  query: string
  /** True when only the search by words answered (the embedding service was down). */
  degraded: boolean
  items: SemanticTrackHit[]
}

// ---------------------------------------------------------------- AI assistant

export interface AssistantConversation {
  id: string
  /** The start of the first message; empty until there is one. */
  title: string
  createdAt: string
  updatedAt: string
}

export interface AssistantUsage {
  /** Messages sent today. */
  used: number
  /** Messages allowed per day. */
  limit: number
}

/** The cards of a tool result: only the kinds that the result is about are present. */
export interface AssistantDisplay {
  tracks?: ApiTrack[]
  artists?: ApiArtist[]
  albums?: ApiAlbum[]
  playlists?: ApiPlaylist[]
  /** Where a help answer came from, for the citation. */
  sources?: { source: string; heading: string }[]
}

export type AssistantActionStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "EXPIRED"

/** One line of a conversation: a text, or a card between texts (`tool`). */
export interface AssistantMessageLine {
  id: string
  role: "user" | "assistant" | "tool"
  text: string
  createdAt: string
  tool?: {
    callId: string
    name: string
    /** Whether it worked; null while a proposed change waits for an answer. */
    ok: boolean | null
    display?: AssistantDisplay
    action?: {
      id: string
      status: AssistantActionStatus
      summary: string
      expiresAt: string
    }
  }
}

/** The events of the stream that answers a message (see the API: POST /ai/conversations/:id/messages). */
export type AssistantEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_call"; callId: string; name: string }
  | {
      type: "tool_result"
      callId: string
      name: string
      ok: boolean
      display?: AssistantDisplay
      action?: { id: string; status: "CONFIRMED" | "REJECTED" }
    }
  | {
      type: "action_required"
      actionId: string
      callId: string
      tool: string
      summary: string
      expiresAt: string
    }
  | { type: "client_action"; action: "play_tracks"; trackIds: string[]; tracks: ApiTrack[] }
  | { type: "done"; messageId: string; truncated: boolean; awaitingAction: boolean }
  | { type: "error"; code: string; message: string }
