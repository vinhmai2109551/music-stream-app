import { useRef, useState } from "react"
import { listFeed } from "@/api/feed"
import type { ApiFeedPost, Page } from "@/api/types"
import { showToast } from "@/store/toastStore"
import { describeApiError } from "@/utils/apiErrors"
import { useResource } from "./useResource"

const PAGE_SIZE = 10

/** Pages after the first one, remembered for the first page they were loaded after. */
type MorePages = { base: Page<ApiFeedPost>; items: ApiFeedPost[]; lastPage: number }

/** The feed, newest first: the first page, then one more page each time the end is reached. */
export function useFeed() {
  const {
    state,
    reload,
    refresh: refreshFirst,
  } = useResource(() => listFeed({ page: 1, limit: PAGE_SIZE }), "feed")
  const [more, setMore] = useState<MorePages | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const busy = useRef(false)

  const base = state.status === "ready" ? state.data : null
  // Pages loaded after an older first page no longer belong to the list.
  const extra = more && more.base === base ? more : null
  const items = base ? [...base.items, ...(extra?.items ?? [])] : []
  const lastPage = extra?.lastPage ?? base?.page ?? 1
  const hasMore = base !== null && lastPage < base.totalPages

  const loadMore = async () => {
    if (!base || busy.current || !hasMore) return
    busy.current = true
    setLoadingMore(true)
    try {
      const page = await listFeed({ page: lastPage + 1, limit: PAGE_SIZE })
      const known = new Set(items.map((post) => post.id))
      setMore({
        base,
        items: [...(extra?.items ?? []), ...page.items.filter((post) => !known.has(post.id))],
        lastPage: page.page,
      })
    } catch (error) {
      showToast(describeApiError(error))
    } finally {
      busy.current = false
      setLoadingMore(false)
    }
  }

  /** Pull to refresh: starts again from the newest page without flashing the skeleton. */
  const refresh = async () => {
    setRefreshing(true)
    await refreshFirst()
    setRefreshing(false)
  }

  return {
    items,
    status: state.status,
    error: state.status === "error" ? state.error : null,
    refreshing,
    loadingMore,
    reload,
    refresh,
    loadMore,
  }
}
