import { Image } from "expo-image"
import { memo } from "react"
import { Pressable, StyleSheet } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { pressedStyle } from "@/components/ui/pressed"
import { radius, shadows, sizes, spacing } from "@/theme"
import type { Album } from "@/types"

type AlbumCardProps = {
  album: Album
  onPress: (id: string) => void
}

function AlbumCardBase({ album, onPress }: AlbumCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Album ${album.title} by ${album.artist}`}
      onPress={() => onPress(album.id)}
      style={({ pressed }) => [styles.card, pressedStyle(pressed)]}
    >
      <Image source={album.cover} contentFit="cover" style={styles.cover} />
      <AppText variant="bodyMedium" numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
        {album.title}
      </AppText>
      <AppText variant="caption" color="secondary" numberOfLines={1} ellipsizeMode="tail">
        {album.artist}
      </AppText>
    </Pressable>
  )
}

export const AlbumCard = memo(AlbumCardBase)

const styles = StyleSheet.create({
  card: { width: sizes.cardWidth },
  cover: { width: "100%", aspectRatio: 1, borderRadius: radius.card, ...shadows.card },
  title: { marginTop: spacing.sm },
})
