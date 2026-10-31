import { Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { IconButton } from "@/components/ui/IconButton"
import { PlayButton } from "@/components/ui/PlayButton"
import { sizes } from "@/theme"
import type { RepeatMode } from "@/types"

type PlayerControlsProps = {
  isPlaying: boolean
  isBuffering: boolean
  shuffle: boolean
  repeat: RepeatMode
  onTogglePlay: () => void
  onNext: () => void
  onPrevious: () => void
  onToggleShuffle: () => void
  onCycleRepeat: () => void
}

const REPEAT_LABEL: Record<RepeatMode, string> = {
  off: "Repeat off",
  all: "Repeat all",
  one: "Repeat one",
}

export function PlayerControls({
  isPlaying,
  isBuffering,
  shuffle,
  repeat,
  onTogglePlay,
  onNext,
  onPrevious,
  onToggleShuffle,
  onCycleRepeat,
}: PlayerControlsProps) {
  return (
    <View style={styles.row}>
      <IconButton
        icon={Shuffle}
        label={shuffle ? "Shuffle on" : "Shuffle off"}
        active={shuffle}
        color="white"
        activeColor="accent"
        onPress={onToggleShuffle}
      />
      <IconButton icon={SkipBack} label="Previous" color="white" onPress={onPrevious} />
      <PlayButton
        playing={isPlaying}
        loading={isBuffering && isPlaying}
        size={sizes.playButtonLg}
        onPress={onTogglePlay}
      />
      <IconButton icon={SkipForward} label="Next" color="white" onPress={onNext} />
      <IconButton
        icon={repeat === "one" ? Repeat1 : Repeat}
        label={REPEAT_LABEL[repeat]}
        active={repeat !== "off"}
        color="white"
        activeColor="accent"
        onPress={onCycleRepeat}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
})
