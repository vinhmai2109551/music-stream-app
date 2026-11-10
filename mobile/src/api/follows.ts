import { api } from "./client"
import { pathId } from "./query"

/** Both calls are idempotent. */
export const followArtist = (artistId: string) =>
  api.put<{ following: boolean }>(`/follows/artists/${pathId(artistId)}`)

export const unfollowArtist = (artistId: string) =>
  api.delete<{ following: boolean }>(`/follows/artists/${pathId(artistId)}`)

/** Follows or unfollows depending on `on`. */
export const setFollowing = (artistId: string, on: boolean) =>
  on ? followArtist(artistId) : unfollowArtist(artistId)
