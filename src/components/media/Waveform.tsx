import { useMemo, useState } from "react"
import { StyleSheet, View, type LayoutChangeEvent } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Svg, { Rect } from "react-native-svg"
import { WAVEFORM_BARS } from "@/constants/player"
import { colors, radius, sizes } from "@/theme"
import { createWaveform } from "@/utils/waveform"

const ACTIVATION_OFFSET = 8
const FAIL_OFFSET_Y = 16

type WaveformProps = {
  /** Anything stable per track (its id) — decides the bar shape. */
  seed: string
  /** Playback position from 0 to 1. */
  progress: number
  onSeek: (ratio: number) => void
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Bar waveform that doubles as a seek bar: tap or drag to jump to a position. */
export function Waveform({ seed, progress, onSeek }: WaveformProps) {
  const [width, setWidth] = useState(0)
  const [dragRatio, setDragRatio] = useState<number | null>(null)
  const bars = useMemo(() => createWaveform(seed, WAVEFORM_BARS), [seed])

  const ratioAt = (x: number) => (width > 0 ? clamp01(x / width) : 0)

  const gesture = Gesture.Race(
    Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-ACTIVATION_OFFSET, ACTIVATION_OFFSET])
      .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
      .onUpdate((event) => setDragRatio(ratioAt(event.x)))
      .onEnd((event) => {
        onSeek(ratioAt(event.x))
        setDragRatio(null)
      })
      .onFinalize(() => setDragRatio(null)),
    Gesture.Tap()
      .runOnJS(true)
      .onEnd((event) => onSeek(ratioAt(event.x))),
  )

  const shown = dragRatio ?? clamp01(progress)
  const gap = sizes.waveformGap
  const barWidth = width > 0 ? Math.max(1, (width - gap * (WAVEFORM_BARS - 1)) / WAVEFORM_BARS) : 0

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Track progress"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(shown * 100) }}
        onLayout={onLayout}
        style={styles.container}
      >
        {width > 0 && (
          <Svg width={width} height={sizes.waveformHeight}>
            {bars.map((height, index) => {
              const barHeight = height * sizes.waveformHeight
              const played = (index + 0.5) / WAVEFORM_BARS <= shown
              return (
                <Rect
                  key={index}
                  x={index * (barWidth + gap)}
                  y={(sizes.waveformHeight - barHeight) / 2}
                  width={barWidth}
                  height={barHeight}
                  rx={radius.sm / 4}
                  fill={played ? colors.accent : colors.glassBorder}
                />
              )
            })}
          </Svg>
        )}
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  container: { height: sizes.waveformHeight, width: "100%", justifyContent: "center" },
})
