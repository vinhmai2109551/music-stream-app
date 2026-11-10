import { FlatList, StyleSheet, View, type ListRenderItem } from "react-native"
import { spacing } from "@/theme"
import { AppText } from "./AppText"
import { useTranslation } from "@/i18n"

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
  emptyMessage,
}: HorizontalListProps<T>) {
  const { t } = useTranslation()

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
          {emptyMessage ?? t("common.empty.generic")}
        </AppText>
      }
    />
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.screen },
  separator: { width: spacing.md },
})
