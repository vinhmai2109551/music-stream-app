import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { copy } from "@/constants/copy"
import { AUTO_SKIP_DELAY_MS } from "@/constants/player"
import { spacing } from "@/theme"
import type { PlaybackErrorKind } from "@/types/playback"

const MESSAGES: Record<PlaybackErrorKind, string> = {
  blocked: copy.player.cannotPlayInApp,
  missing: copy.player.noSource,
  unavailable: copy.player.noSource,
  network: copy.player.networkError,
}

const SKIP_NOTICE = `${copy.player.skipPrefix} ${AUTO_SKIP_DELAY_MS / 1000} ${copy.player.secondsSuffix}`

type PlayerErrorProps = {
  kind: PlaybackErrorKind
  /** The player moves on to the next track by itself. */
  skipping: boolean
  onRetry: () => void
  /** Given when the track has an official video that can be opened instead. */
  onOpenYouTube?: () => void
}

/** Why the current track does not play, and what can be done about it. */
export function PlayerError({ kind, skipping, onRetry, onOpenYouTube }: PlayerErrorProps) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.container}>
      <AppText variant="caption" color="onDarkMuted" style={styles.text}>
        {MESSAGES[kind]}
      </AppText>
      {skipping && (
        <AppText variant="small" color="onDarkMuted" style={styles.text}>
          {SKIP_NOTICE}
        </AppText>
      )}
      {kind === "network" && (
        <Button compact label={copy.common.retry} variant="glass" onPress={onRetry} />
      )}
      {kind === "blocked" && onOpenYouTube && (
        <Button compact label={copy.player.openOnYoutube} variant="glass" onPress={onOpenYouTube} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  text: { textAlign: "center" },
})
