import { Image, type ImageProps } from "expo-image"
import { Music, type LucideIcon } from "lucide-react-native"
import { useState } from "react"
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ImageStyle,
} from "react-native"
import { colors, sizes } from "@/theme"
import type { ImageSource } from "@/types"
import { youtubeThumbnailUrls } from "@/utils/playbackKind"

/** Share of the picture's shorter side that the placeholder icon takes. */
const PLACEHOLDER_ICON_RATIO = 0.4

type CoverImageProps = Omit<ImageProps, "source" | "onError" | "style"> & {
  source: ImageSource
  /** The track's official video; its pictures stand in when the cover file cannot be loaded. */
  youtubeVideoId?: string | null
  /** Shown when no picture loads. */
  icon?: LucideIcon
  /** `false` leaves the place empty instead (for a backdrop). */
  placeholder?: boolean
  style?: StyleProp<ImageStyle>
}

/**
 * A cover, artist or album picture that never ends up blank: when the file is not there (404, no
 * network) it tries the official video's thumbnails, then shows a plain placeholder.
 */
export function CoverImage({
  source,
  youtubeVideoId,
  icon: Icon = Music,
  placeholder = true,
  style,
  ...props
}: CoverImageProps) {
  const [failure, setFailure] = useState<{ source: ImageSource; count: number } | null>(null)
  const [side, setSide] = useState(0)

  const candidates = [source, ...(youtubeVideoId ? youtubeThumbnailUrls(youtubeVideoId) : [])]
  // A different picture starts again from the first candidate.
  const failed = failure && failure.source === source ? failure.count : 0
  const current = candidates[failed]

  if (current === undefined) {
    if (!placeholder) return null
    const onLayout = (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout
      setSide(Math.min(width, height))
    }
    return (
      <View accessible={false} onLayout={onLayout} style={[style, styles.placeholder]}>
        <Icon
          size={Math.max(sizes.iconSm, Math.round(side * PLACEHOLDER_ICON_RATIO))}
          color={colors.accent}
        />
      </View>
    )
  }

  return (
    <Image
      {...props}
      source={current}
      contentFit="cover"
      style={style}
      onError={() => setFailure({ source, count: failed + 1 })}
    />
  )
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
  },
})
