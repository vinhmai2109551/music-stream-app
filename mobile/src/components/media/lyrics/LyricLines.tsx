import { memo, useMemo, type ReactElement } from "react"
import { FlatList, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { makeStyles, spacing } from "@/theme"

/** What the lines show: the original, each line with its translation under it, or the translation. */
export type LyricsView = "original" | "parallel" | "translation"

type Row = { key: string; original: string; translated: string | null }

type LyricLinesProps = {
  lines: readonly string[]
  /** One element for every original line, in place. */
  translated?: readonly string[]
  view: LyricsView
  header?: ReactElement
}

const LyricRow = memo(function LyricRow({
  original,
  translated,
  view,
}: Omit<Row, "key"> & { view: LyricsView }) {
  const styles = useStyles()
  const first = view === "translation" && translated !== null ? translated : original
  // A blank line is a pause between verses.
  if (first.trim() === "") return <View style={styles.pause} />

  return (
    <View style={styles.row}>
      <AppText variant="bodyMedium">{first}</AppText>
      {view === "parallel" && translated !== null && translated.trim() !== "" && (
        <AppText variant="body" color="accentText" style={styles.translation}>
          {translated}
        </AppText>
      )}
    </View>
  )
})

/** The lyrics, a line to a row. The blank lines of the original stay blank in every view. */
export function LyricLines({ lines, translated, view, header }: LyricLinesProps) {
  const styles = useStyles()
  const rows = useMemo<Row[]>(
    () =>
      lines.map((original, index) => ({
        key: String(index),
        original,
        translated: translated?.[index] ?? null,
      })),
    [lines, translated],
  )

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={({ item }) => (
        <LyricRow original={item.original} translated={item.translated} view={view} />
      )}
      ListHeaderComponent={header}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  )
}

const useStyles = makeStyles(() => ({
  list: { flex: 1 },
  content: { paddingBottom: spacing.xxxl },
  row: { paddingVertical: spacing.xs },
  translation: { marginTop: spacing.xxs },
  pause: { height: spacing.xl },
}))
