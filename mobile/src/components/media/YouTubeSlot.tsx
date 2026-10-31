import { useFocusEffect } from "expo-router"
import { useCallback, useRef, type ComponentRef } from "react"
import { StyleSheet, View } from "react-native"
import { YOUTUBE_MIN_SIZE } from "@/constants/player"
import { useVideoSlotStore } from "@/store/videoSlotStore"
import { colors, radius, sizes } from "@/theme"

/** Measured again once the screen has finished sliding in (the first measure may be mid-slide). */
const REMEASURE_DELAY_MS = 450

/**
 * The place of the video on the player screen. The player itself lives above every screen (see
 * `YouTubeHost`), so this only reserves the square, reports where it is and gives it up when the
 * screen is left.
 */
export function YouTubeSlot() {
  const ref = useRef<ComponentRef<typeof View>>(null)
  const focused = useRef(false)

  const measure = useCallback(() => {
    if (!focused.current) return
    ref.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      if (width > 0 && height > 0) useVideoSlotStore.getState().setSlot({ x, y, width, height })
    })
  }, [])

  useFocusEffect(
    useCallback(() => {
      focused.current = true
      measure()
      const timer = setTimeout(measure, REMEASURE_DELAY_MS)
      return () => {
        // The screen is on its way out: the video goes back to its floating place at once.
        focused.current = false
        clearTimeout(timer)
        useVideoSlotStore.getState().setSlot(null)
      }
    }, [measure]),
  )

  return <View ref={ref} accessibilityLabel="Video player" onLayout={measure} style={styles.slot} />
}

const styles = StyleSheet.create({
  slot: {
    width: "100%",
    maxWidth: sizes.playerArtworkMax,
    maxHeight: "100%",
    minWidth: YOUTUBE_MIN_SIZE,
    minHeight: YOUTUBE_MIN_SIZE,
    aspectRatio: 1,
    alignSelf: "center",
    borderRadius: radius.card,
    backgroundColor: colors.black,
  },
})
