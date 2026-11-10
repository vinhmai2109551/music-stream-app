import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { AUTO_SKIP_DELAY_MS } from "@/constants/player"
import { spacing } from "@/theme"
import type { PlaybackErrorKind } from "@/types/playback"
import { useTranslation, type TranslationKey } from "@/i18n"

const MESSAGES: Record<PlaybackErrorKind, TranslationKey> = {
  blocked: "player.cannotPlayInApp",
  missing: "player.noSource",
  unavailable: "player.noSource",
  network: "player.networkError",
}

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
  const { t } = useTranslation()

  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.container}>
      <AppText variant="caption" color="onDarkMuted" style={styles.text}>
        {t(MESSAGES[kind])}
      </AppText>
      {skipping && (
        <AppText variant="small" color="onDarkMuted" style={styles.text}>
          {t("player.autoSkip", { count: AUTO_SKIP_DELAY_MS / 1000 })}
        </AppText>
      )}
      {kind === "network" && (
        <Button compact label={t("common.retry")} variant="glass" onPress={onRetry} />
      )}
      {kind === "blocked" && onOpenYouTube && (
        <Button compact label={t("player.openOnYoutube")} variant="glass" onPress={onOpenYouTube} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  text: { textAlign: "center" },
})
