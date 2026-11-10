import { Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { IconButton } from "@/components/ui/IconButton"
import { PlayButton } from "@/components/ui/PlayButton"
import { sizes } from "@/theme"
import type { RepeatMode } from "@/types"
import { useTranslation, type TranslationKey } from "@/i18n"

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

const REPEAT_LABEL: Record<RepeatMode, TranslationKey> = {
  off: "player.repeatOff",
  all: "player.repeatAll",
  one: "player.repeatOne",
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
  const { t } = useTranslation()

  return (
    <View style={styles.row}>
      <IconButton
        icon={Shuffle}
        label={shuffle ? t("player.shuffleOn") : t("player.shuffleOff")}
        active={shuffle}
        color="white"
        activeColor="accent"
        onPress={onToggleShuffle}
      />
      <IconButton icon={SkipBack} label={t("player.previous")} color="white" onPress={onPrevious} />
      <PlayButton
        playing={isPlaying}
        loading={isBuffering && isPlaying}
        size={sizes.playButtonLg}
        onPress={onTogglePlay}
      />
      <IconButton icon={SkipForward} label={t("player.next")} color="white" onPress={onNext} />
      <IconButton
        icon={repeat === "one" ? Repeat1 : Repeat}
        label={t(REPEAT_LABEL[repeat])}
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
