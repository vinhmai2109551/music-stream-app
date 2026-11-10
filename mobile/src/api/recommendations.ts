import { api } from "./client"
import { pathId, toQuery } from "./query"
import type {
  BecauseYouListenedResponse,
  ForYouResponse,
  Region,
  SemanticTrackSearch,
  SimilarTracksResponse,
} from "./types"

/** Tracks that fit the taste of the user; popular ones while they have no history. */
export const getForYou = (region: Region | null, limit: number) =>
  api.get<ForYouResponse>(
    `/recommendations/for-you${toQuery({ region: region ?? undefined, limit })}`,
  )

/** Tracks like the one the user played last. Answers 503 while the AI features are off. */
export const getBecauseYouListened = (region: Region | null, limit: number) =>
  api.get<BecauseYouListenedResponse>(
    `/recommendations/because-you-listened${toQuery({ region: region ?? undefined, limit })}`,
  )

/** Tracks close to `trackId` in style and mood. Answers 503 while the AI features are off. */
export const getSimilarTracks = (trackId: string, limit: number) =>
  api.get<SimilarTracksResponse>(`/tracks/${pathId(trackId)}/similar${toQuery({ limit })}`)

/** Tracks whose meaning is close to the words typed ("nhạc buồn ngày mưa"). */
export const searchTracksByMeaning = (q: string, limit: number) =>
  api.get<SemanticTrackSearch>(`/search/semantic${toQuery({ q, type: "track", limit })}`)
