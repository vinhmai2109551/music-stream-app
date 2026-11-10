import AsyncStorage from "@react-native-async-storage/async-storage"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { deviceLanguage, i18n, isAppLanguage, type AppLanguage } from "@/i18n"

type LanguageState = {
  /** The language the user picked; null follows the phone. */
  choice: AppLanguage | null
  /** The saved choice has been read, so the first screen already speaks the right language. */
  ready: boolean
  setChoice: (choice: AppLanguage | null) => void
}

/** What the app shows for a choice: the pick itself, or the language of the phone. */
export const languageFor = (choice: AppLanguage | null): AppLanguage => choice ?? deviceLanguage()

const apply = (choice: AppLanguage | null) => {
  const language = languageFor(choice)
  if (i18n.language !== language) void i18n.changeLanguage(language)
}

/** The language is kept on the device; changing it re-renders every text at once. */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      choice: null,
      ready: false,
      setChoice: (choice) => {
        apply(choice)
        set({ choice })
      },
    }),
    {
      name: "music-stream-language",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ choice: state.choice }),
      // A saved value that is not a language of the app (an older version, a hand edit) is dropped.
      merge: (saved, current) => {
        const choice = (saved as Partial<LanguageState> | undefined)?.choice
        return { ...current, choice: isAppLanguage(choice) ? choice : null }
      },
      onRehydrateStorage: () => (state) => {
        apply(state?.choice ?? null)
        useLanguageStore.setState({ ready: true })
      },
    },
  ),
)
