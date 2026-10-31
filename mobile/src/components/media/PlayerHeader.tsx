import { ChevronDown, Ellipsis } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { IconButton } from "@/components/ui/IconButton"
import { sizes } from "@/theme"

type PlayerHeaderProps = {
  /** Name of the playlist, album or artist the queue came from. */
  source: string
  onClose: () => void
  onMore?: () => void
}

export function PlayerHeader({ source, onClose, onMore }: PlayerHeaderProps) {
  return (
    <View style={styles.row}>
      <IconButton icon={ChevronDown} label="Close player" color="white" onPress={onClose} />
      <View style={styles.center}>
        <AppText variant="small" color="onDarkMuted">
          Playing from
        </AppText>
        <AppText variant="caption" color="white" numberOfLines={1} ellipsizeMode="tail">
          {source}
        </AppText>
      </View>
      {onMore ? (
        <IconButton icon={Ellipsis} label="More options" color="white" onPress={onMore} />
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  center: { flex: 1, minWidth: 0, alignItems: "center" },
  placeholder: { width: sizes.minTouch, height: sizes.minTouch },
})
