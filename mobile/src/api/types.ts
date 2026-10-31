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
  /** File in our storage (R2). Tracks of real artists have none: they play from YouTube. */
  audioUrl: string
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
