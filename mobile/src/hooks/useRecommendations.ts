import {
  getBecauseYouListened,
  getForYou,
  getSimilarTracks,
  searchTracksByMeaning,
} from "@/api/recommendations"
import type { ApiTrack, Region } from "@/api/types"
import { toOptionalSection, type OptionalSection } from "@/utils/optionalSection"
import { useResource } from "./useResource"

const SECTION_LIMIT = 10
const SIMILAR_LIMIT = 15
const MEANING_LIMIT = 10

export interface BecauseYouListened {
  basedOn: ApiTrack
  tracks: ApiTrack[]
}

/** "Dành cho bạn": only when it is made from the taste of the user (popular ones are on Home anyway). */
export function useForYou(region: Region | null): OptionalSection<ApiTrack> {
  const { state } = useResource(
    () => getForYou(region, SECTION_LIMIT),
    `for-you:${region ?? "all"}`,
  )
  return toOptionalSection(state, (data) => (data.strategy === "taste" ? data.items : []))
}

/** "Vì bạn đã nghe …": the track it is based on, and the tracks like it. */
export function useBecauseYouListened(region: Region | null): OptionalSection<BecauseYouListened> {
  const { state } = useResource(
    () => getBecauseYouListened(region, SECTION_LIMIT),
    `because:${region ?? "all"}`,
  )
  return toOptionalSection(state, (data) =>
    data.basedOn && data.items.length > 0 ? [{ basedOn: data.basedOn, tracks: data.items }] : [],
  )
}

/** "Bài tương tự" for the track that is playing. */
export function useSimilarTracks(trackId: string): OptionalSection<ApiTrack> {
  const { state } = useResource(
    () => getSimilarTracks(trackId, SIMILAR_LIMIT),
    `similar:${trackId}`,
  )
  return toOptionalSection(state, (data) => data.items)
}

/** "Theo tâm trạng": tracks found by meaning that the search by words did not find. */
export function useTracksByMeaning(
  query: string,
  known: readonly ApiTrack[],
): OptionalSection<ApiTrack> {
  const { state } = useResource(
    () => searchTracksByMeaning(query, MEANING_LIMIT),
    `meaning:${query}`,
  )
  const knownIds = new Set(known.map((track) => track.id))
  // A degraded answer is the search by words again: nothing new to add.
  return toOptionalSection(state, (data) =>
    data.degraded
      ? []
      : data.items.map((hit) => hit.track).filter((track) => !knownIds.has(track.id)),
  )
}
