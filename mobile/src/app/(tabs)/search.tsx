import { router, useFocusEffect, useLocalSearchParams } from "expo-router"
import { Search } from "lucide-react-native"
import { useCallback, useRef, useState } from "react"
import { Keyboard, StyleSheet, View, type TextInputInstance } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { RecentSearches } from "@/components/media/RecentSearches"
import { SearchResults } from "@/components/media/SearchResults"
import { SearchSuggestions } from "@/components/media/SearchSuggestions"
import { EmptyState } from "@/components/ui/EmptyState"
import { SearchBar } from "@/components/ui/SearchBar"
import { copy } from "@/constants/copy"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useSearchHistoryStore } from "@/store/searchHistoryStore"
import { colors, spacing } from "@/theme"

const SUGGESTION_DELAY_MS = 250

export default function SearchScreen() {
  const insets = useSafeAreaInsets()
  const { focus } = useLocalSearchParams<{ focus?: string }>()
  const inputRef = useRef<TextInputInstance>(null)
  const [query, setQuery] = useState("")
  const [submitted, setSubmitted] = useState<string | null>(null)

  const recentSearches = useSearchHistoryStore((state) => state.recentSearches)
  const addRecent = useSearchHistoryStore((state) => state.add)
  const removeRecent = useSearchHistoryStore((state) => state.remove)
  const clearRecent = useSearchHistoryStore((state) => state.clear)

  const typed = query.trim()
  const suggestionsFor = useDebouncedValue(typed, SUGGESTION_DELAY_MS)

  // Opened from the search field of Home: the keyboard is already wanted.
  useFocusEffect(
    useCallback(() => {
      if (!focus) return
      inputRef.current?.focus()
      router.setParams({ focus: "" })
    }, [focus]),
  )

  const submit = (text: string) => {
    const value = text.trim()
    if (!value) return
    setQuery(value)
    setSubmitted(value)
    addRecent(value)
    Keyboard.dismiss()
  }

  const showResults = submitted !== null && submitted === typed

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.padded}>
        <SearchBar
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          onClear={() => {
            setQuery("")
            setSubmitted(null)
            inputRef.current?.focus()
          }}
          onSubmitEditing={() => submit(query)}
          placeholder={copy.searchPlaceholder}
          accessibilityLabel={copy.searchPlaceholder}
        />
      </View>
      <View style={[styles.padded, styles.content]}>
        {typed === "" &&
          (recentSearches.length > 0 ? (
            <RecentSearches
              searches={recentSearches}
              onPick={submit}
              onRemove={removeRecent}
              onClear={clearRecent}
            />
          ) : (
            <EmptyState
              icon={Search}
              title={copy.search.hintTitle}
              description={copy.search.hintDescription}
            />
          ))}
        {typed !== "" && showResults && <SearchResults query={submitted} />}
        {typed !== "" && !showResults && suggestionsFor !== "" && (
          <SearchSuggestions query={suggestionsFor} onPick={submit} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing.screen },
  content: { flex: 1, marginTop: spacing.lg },
})
