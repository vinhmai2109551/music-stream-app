import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { spacing } from "@/theme"
import { formatTime } from "@/utils/formatTime"
import { Waveform } from "./Waveform"

type SeekBarProps = {
  seed: string
  /** Position in seconds. */
  progress: number
  /** Length in seconds. */
  duration: number
  onSeek: (seconds: number) => void
}

/** Waveform with elapsed / remaining time labels. */
export function SeekBar({ seed, progress, duration, onSeek }: SeekBarProps) {
  const ratio = duration > 0 ? progress / duration : 0
  return (
    <View>
      <Waveform seed={seed} progress={ratio} onSeek={(value) => onSeek(value * duration)} />
      <View style={styles.times}>
        <AppText variant="small" color="onDarkMuted">
          {formatTime(progress)}
        </AppText>
        <AppText variant="small" color="onDarkMuted">
          -{formatTime(Math.max(0, duration - progress))}
        </AppText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  times: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
})
