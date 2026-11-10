/**
 * Limits for the descriptive text of the catalog (genres, moods, tags, descriptions). In their own
 * file, with no framework import, so the seed and its tools can share them with the admin API.
 */

/** Most entries a list of genres, moods or tags may have. */
export const LIST_MAX_ITEMS = 10

/** Longest single genre, mood or tag. */
export const LIST_ITEM_MAX_LENGTH = 40

/** Longest description of a track: a short text about its style and mood, never its lyrics. */
export const DESCRIPTION_MAX_LENGTH = 600

/** Language of the vocals as an ISO 639 code: `vi`, `ko`, `ja`, `zh`, `en`... */
export const LANGUAGE_CODE = /^[a-z]{2,3}$/
