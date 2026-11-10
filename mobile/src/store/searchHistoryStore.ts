import AsyncStorage from "@react-native-async-storage/async-storage"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

const MAX_RECENT_SEARCHES = 5

type SearchHistoryState = {
  recentSearches: string[]
  add: (query: string) => void
  remove: (query: string) => void
  clear: () => void
}

/** Recent searches live only on the device; the backend does not know about them. */
export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set) => ({
      recentSearches: [],
      add: (query) => {
        const value = query.trim()
        if (!value) return
        set((state) => ({
          recentSearches: [value, ...state.recentSearches.filter((item) => item !== value)].slice(
            0,
            MAX_RECENT_SEARCHES,
          ),
        }))
      },
      remove: (query) =>
        set((state) => ({ recentSearches: state.recentSearches.filter((item) => item !== query) })),
      clear: () => set({ recentSearches: [] }),
    }),
    {
      name: "music-stream-search-history",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
)
