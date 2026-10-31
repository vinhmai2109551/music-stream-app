import type { LucideIcon } from "lucide-react-native"
import { memo, type ReactNode } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { CoverImage } from "@/components/ui/CoverImage"
import { pressedStyle } from "@/components/ui/pressed"
import { radius, sizes, spacing } from "@/theme"
import type { ImageSource } from "@/types"

type MediaRowProps = {
  image: ImageSource
  /** Official video of a track, used when the cover cannot be loaded. */
  youtubeVideoId?: string | null
  /** Name whose initials fill the picture when it cannot be loaded (the title by default). */
  imageLabel?: string
  /** Placeholder icon when no picture loads and there is no `label`. */
  icon?: LucideIcon
  /** Circle instead of a rounded square (artists). */
  round?: boolean
  size?: number
  title: string
  subtitle?: string
  /** Shown at the end of the row (a button or an arrow). */
  trailing?: ReactNode
  accessibilityLabel: string
  onPress: () => void
}

/** Picture, two lines of text and something at the end: albums, artists and playlists. */
function MediaRowBase({
  image,
  youtubeVideoId,
  imageLabel,
  icon,
  round = false,
  size = sizes.cover,
  title,
  subtitle,
  trailing,
  accessibilityLabel,
  onPress,
}: MediaRowProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressedStyle(pressed)]}
      >
        <CoverImage
          source={image}
          youtubeVideoId={youtubeVideoId}
          label={imageLabel ?? title}
          icon={icon}
          style={{ width: size, height: size, borderRadius: round ? radius.pill : radius.cover }}
        />
        <View style={styles.text}>
          <AppText variant="subtitle" numberOfLines={1} ellipsizeMode="tail">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color="secondary" numberOfLines={1} ellipsizeMode="tail">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </Pressable>
      {trailing}
    </View>
  )
}

export const MediaRow = memo(MediaRowBase)

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.trackRowHeight,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: sizes.trackRowHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  text: { flex: 1, minWidth: 0 },
})
