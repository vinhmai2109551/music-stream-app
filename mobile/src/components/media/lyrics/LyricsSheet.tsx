import { ScrollText } from "lucide-react-native"
import { View } from "react-native"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { useLyrics } from "@/hooks/useLyrics"
import { useTranslation } from "@/i18n"
import { makeStyles, spacing } from "@/theme"
import { lyricsFailure } from "@/utils/lyricsErrors"
import { LyricsContent } from "./LyricsContent"

const SHEET_HEIGHT = "88%"
const SKELETON_LINES = [92, 70, 84, 0, 78, 88, 64, 0, 90, 74]
const LINE_HEIGHT = 18

type LyricsSheetProps = {
  trackId: string
  onClose: () => void
}

/** The lyrics of the song that is playing, over the player; they can be translated from here. */
export function LyricsSheet({ trackId, onClose }: LyricsSheetProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { state, reload } = useLyrics(trackId)

  return (
    <BottomSheet visible onClose={onClose} title={t("lyrics.title")} height={SHEET_HEIGHT}>
      <View style={styles.body}>
        {state.status === "loading" && (
          <View accessibilityLabel={t("lyrics.loading")} style={styles.skeleton}>
            {SKELETON_LINES.map((width, index) =>
              width === 0 ? (
                <View key={index} style={styles.pause} />
              ) : (
                <Skeleton key={index} width={`${width}%`} height={LINE_HEIGHT} />
              ),
            )}
          </View>
        )}
        {state.status === "error" &&
          (lyricsFailure(state.error) === "none" ? (
            <EmptyState
              icon={ScrollText}
              title={t("lyrics.emptyTitle")}
              description={t("lyrics.emptyDescription")}
            />
          ) : (
            <ErrorState error={state.error} onRetry={() => void reload()} />
          ))}
        {state.status === "ready" && <LyricsContent lyrics={state.data} />}
      </View>
    </BottomSheet>
  )
}

const useStyles = makeStyles(() => ({
  body: { flex: 1 },
  skeleton: { gap: spacing.md, paddingTop: spacing.md },
  pause: { height: spacing.md },
}))
