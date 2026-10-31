import { memo } from "react"
import { User } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { CoverImage } from "@/components/ui/CoverImage"
import { pressedStyle } from "@/components/ui/pressed"
import { useLibraryStore } from "@/store/libraryStore"
import { radius, shadows, sizes, spacing } from "@/theme"
import type { ImageSource } from "@/types"

type ArtistAvatarProps = {
  artist: { id: string; name: string; image: ImageSource }
  onPress: (id: string) => void
}

function ArtistAvatarBase({ artist, onPress }: ArtistAvatarProps) {
  const followed = useLibraryStore((state) => state.followedArtistIds.includes(artist.id))
  const toggleFollow = useLibraryStore((state) => state.toggleFollow)

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Artist ${artist.name}`}
        onPress={() => onPress(artist.id)}
        style={({ pressed }) => [styles.link, pressedStyle(pressed)]}
      >
        <CoverImage source={artist.image} icon={User} style={styles.image} />
        <AppText variant="caption" numberOfLines={1} ellipsizeMode="tail" style={styles.name}>
          {artist.name}
        </AppText>
      </Pressable>
      <Button
        compact
        label={followed ? "Following" : "Follow"}
        variant={followed ? "tonal" : "outline"}
        onPress={() => toggleFollow(artist.id)}
        style={styles.follow}
      />
    </View>
  )
}

export const ArtistAvatar = memo(ArtistAvatarBase)

const styles = StyleSheet.create({
  container: { width: sizes.avatar + spacing.lg, alignItems: "center" },
  link: { alignItems: "center", width: "100%" },
  image: { width: sizes.avatar, height: sizes.avatar, borderRadius: radius.pill, ...shadows.card },
  name: { marginTop: spacing.sm, textAlign: "center", width: "100%" },
  follow: { marginTop: spacing.sm },
})
