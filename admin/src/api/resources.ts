/**
 * What differs between the resources of the API and what a form wants: the path, the filters the
 * list accepts, and the field names. The API answers with display names (`cover`, `duration`,
 * `image`) but accepts the names of the database (`coverUrl`, `durationSec`, `imageUrl`), and it
 * refuses a body with any field it does not know - so a body is built from an explicit list.
 */
export type Row = Record<string, unknown>

export interface ResourceAdapter {
  path: string
  /** Filters of the list endpoint (query parameters). */
  filters: readonly string[]
  /** The API's row as the forms and tables use it. */
  fromApi?: (row: Row) => Row
  /** A body the API accepts, from form values. */
  toApi?: (values: Row) => Row
  /** Rows of this resource can be read one by one (`GET path/:id`). */
  hasDetail: boolean
}

function pick(values: Row, fields: readonly string[]): Row {
  const out: Row = {}
  for (const field of fields) {
    if (values[field] !== undefined) out[field] = values[field]
  }
  return out
}

/** "" means "none" for a field that may be null in the API. */
function emptyToNull(row: Row, fields: readonly string[]): Row {
  const out = { ...row }
  for (const field of fields) {
    if (out[field] === "") out[field] = null
  }
  return out
}

const TRACK_FIELDS = [
  "title",
  "artistId",
  "coverUrl",
  "audioUrl",
  "durationSec",
  "youtubeVideoId",
  "genres",
  "mood",
  "tags",
  "description",
  "language",
] as const

const ARTIST_FIELDS = ["name", "bio", "imageUrl", "baseFollowers", "region", "genres"] as const
const ALBUM_FIELDS = ["title", "artistId", "coverUrl", "trackIds"] as const
const FEED_FIELDS = ["artistId", "trackId", "artworkUrl", "caption"] as const
const USER_FIELDS = ["role", "isBanned"] as const

export const RESOURCES: Readonly<Record<string, ResourceAdapter>> = {
  tracks: {
    path: "/tracks",
    filters: ["q", "artistId", "region"],
    hasDetail: true,
    fromApi: (row) => ({ ...row, coverUrl: row.cover, durationSec: row.duration }),
    toApi: (values) =>
      emptyToNull(pick(values, TRACK_FIELDS), ["audioUrl", "youtubeVideoId", "language"]),
  },
  artists: {
    path: "/artists",
    filters: ["q", "region"],
    hasDetail: true,
    fromApi: (row) => ({ ...row, imageUrl: row.image }),
    toApi: (values) => {
      const body = pick(values, ARTIST_FIELDS)
      // An empty number field is "not given", not zero.
      if (body.baseFollowers === null || body.baseFollowers === "") delete body.baseFollowers
      return body
    },
  },
  albums: {
    path: "/albums",
    filters: ["q", "artistId"],
    hasDetail: true,
    fromApi: (row) => ({ ...row, coverUrl: row.cover }),
    toApi: (values) => pick(values, ALBUM_FIELDS),
  },
  feed: {
    path: "/feed",
    filters: [],
    hasDetail: false,
    toApi: (values) => pick(values, FEED_FIELDS),
  },
  users: {
    path: "/admin/users",
    filters: ["q", "role", "banned"],
    hasDetail: false,
    toApi: (values) => pick(values, USER_FIELDS),
  },
}

export function adapterFor(resource: string): ResourceAdapter {
  const adapter = RESOURCES[resource]
  if (!adapter) throw new Error(`Tài nguyên không được hỗ trợ: ${resource}`)
  return adapter
}
