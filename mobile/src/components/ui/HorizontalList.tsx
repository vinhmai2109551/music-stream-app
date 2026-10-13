import { FlatList, StyleSheet, View, type ListRenderItem } from "react-native"
import { spacing } from "@/theme"
import { AppText } from "./AppText"

type HorizontalListProps<T> = {
  data: readonly T[]
  renderItem: ListRenderItem<T>
  keyExtractor: (item: T) => string
  emptyMessage?: string
}

function Separator() {
  return <View style={styles.separator} />
}

/** Full-bleed horizontal list that keeps the first item aligned with the screen padding. */
export function HorizontalList<T>({
  data,
  renderItem,
  keyExtractor,
  emptyMessage = "Nothing here yet",
}: HorizontalListProps<T>) {
  return (
    <FlatList
      horizontal
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      showsHorizontalScrollIndicator={false}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={styles.content}
      ListEmptyComponent={
        <AppText variant="caption" color="secondary">
          {emptyMessage}
        </AppText>
      }
    />
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.screen },
  separator: { width: spacing.md },
})
