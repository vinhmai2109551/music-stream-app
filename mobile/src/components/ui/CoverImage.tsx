import { Image, type ImageProps } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import { Music, type LucideIcon } from "lucide-react-native"
import { useState } from "react"
import {
  StyleSheet,
  View,
  type ImageStyle,
  type LayoutChangeEvent,
  type StyleProp,
} from "react-native"
import { colors, fontFamily, sizes } from "@/theme"
import type { ImageSource } from "@/types"
import { hashOf, initialsOf } from "@/utils/initials"
import { youtubeThumbnailUrls } from "@/utils/playbackKind"
import { AppText } from "./AppText"

/** Share of the picture's shorter side that the initials (or the icon) take. */
const PLACEHOLDER_RATIO = 0.4
const GRADIENT_START = { x: 0, y: 0 } as const
const GRADIENT_END = { x: 1, y: 1 } as const

type CoverImageProps = Omit<ImageProps, "source" | "onError" | "style"> & {
  source: ImageSource
  /** The track's official video; its pictures show when they can be loaded. */
  youtubeVideoId?: string | null
  /** Name of what the picture shows; its initials fill the placeholder. */
  label?: string
  /** Shown instead of the initials when there is no label. */
  icon?: LucideIcon
  /** `false` leaves the place empty instead (for a backdrop). */
  placeholder?: boolean
  style?: StyleProp<ImageStyle>
}

/**
 * A cover, artist or album picture that never ends up blank. A track with an official video shows
 * the video's picture first; otherwise (or when that fails) the file in our storage; when nothing
 * loads, a coloured tile with the initials of `label`.
 */
export function CoverImage({
  source,
  youtubeVideoId,
  label,
  icon: Icon = Music,
  placeholder = true,
  style,
  ...props
}: CoverImageProps) {
  const [failure, setFailure] = useState<{ source: ImageSource; count: number } | null>(null)
  const [side, setSide] = useState(0)

  const thumbnails = youtubeVideoId ? youtubeThumbnailUrls(youtubeVideoId) : []
  const candidates = [...thumbnails, source].filter((candidate) => candidate !== "")
  // A different picture starts again from the first candidate.
  const failed = failure && failure.source === source ? failure.count : 0
  const current = candidates[failed]

  if (current === undefined) {
    if (!placeholder) return null
    const onLayout = (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout
      setSide(Math.min(width, height))
    }
    const initials = label ? initialsOf(label) : ""
    const pairs = colors.coverGradients
    const pair = pairs[hashOf(label ?? String(source)) % pairs.length]
    const mark = Math.max(sizes.iconSm, Math.round(side * PLACEHOLDER_RATIO))
    return (
      <View accessible={false} onLayout={onLayout} style={[style, styles.placeholder]}>
        <LinearGradient
          colors={pair}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={StyleSheet.absoluteFill}
        />
        {initials ? (
          <AppText
            color="white"
            style={{ fontFamily: fontFamily.bold, fontSize: mark, lineHeight: mark * 1.15 }}
          >
            {initials}
          </AppText>
        ) : (
          <Icon size={mark} color={colors.white} />
        )}
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
    overflow: "hidden",
  },
})
