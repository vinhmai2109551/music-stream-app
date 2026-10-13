import { Heart } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { IconButton } from "@/components/ui/IconButton"

type PlayerTrackInfoProps = {
  title: string
  artist: string
  liked: boolean
  onToggleLike: () => void
}

export function PlayerTrackInfo({ title, artist, liked, onToggleLike }: PlayerTrackInfoProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="h2" color="white" numberOfLines={1} ellipsizeMode="tail">
          {title}
        </AppText>
        <AppText color="onDarkMuted" numberOfLines={1} ellipsizeMode="tail">
          {artist}
        </AppText>
      </View>
      <IconButton
        icon={Heart}
        label={liked ? "Unlike track" : "Like track"}
        active={liked}
        color="white"
        activeColor="like"
        onPress={onToggleLike}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  text: { flex: 1, minWidth: 0 },
})
