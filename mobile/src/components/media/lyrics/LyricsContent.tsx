import { useState, type ReactElement } from "react"
import { View } from "react-native"
import type { ApiLyrics, ApiLyricsTranslation } from "@/api/types"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { useLyricsTranslation } from "@/hooks/useLyrics"
import { LANGUAGE_NAMES, isAppLanguage, useTranslation, type AppLanguage } from "@/i18n"
import { makeStyles, spacing } from "@/theme"
import { TRANSLATION_FAILURE_TEXT, canRetry, lyricsFailure } from "@/utils/lyricsErrors"
import { LyricLines, type LyricsView } from "./LyricLines"
import { AutoTranslatedLabel, LyricsSource, LyricsViewChips } from "./LyricsControls"
import { LyricsNotice } from "./LyricsNotice"

type LyricsContentProps = { lyrics: ApiLyrics }

/** The language the translation is made to: the one the app is in. */
function useTargetLanguage(): AppLanguage {
  const { i18n } = useTranslation()
  return isAppLanguage(i18n.language) ? i18n.language : "vi"
}

/**
 * The lyrics of a song with the way to translate them. The translation is asked for only when the
 * person presses the button (it spends the allowance of the month); after that it is kept by the
 * server and by this app, so showing it again costs nothing.
 */
export function LyricsContent({ lyrics }: LyricsContentProps) {
  const target = useTargetLanguage()
  const [asked, setAsked] = useState(false)
  // Once the server says it cannot translate at all, the button is not offered again.
  const [cannotTranslate, setCannotTranslate] = useState(false)
  const [view, setView] = useState<LyricsView>("parallel")

  const sameLanguage = lyrics.language === target
  if (!asked || sameLanguage || cannotTranslate) {
    return (
      <OriginalView
        lyrics={lyrics}
        target={target}
        canTranslate={!sameLanguage && !cannotTranslate}
        onTranslate={() => setAsked(true)}
      />
    )
  }
  return (
    <TranslationView
      lyrics={lyrics}
      target={target}
      view={view}
      onView={setView}
      onBack={(unavailable) => {
        setAsked(false)
        if (unavailable) setCannotTranslate(true)
      }}
    />
  )
}

type OriginalViewProps = {
  lyrics: ApiLyrics
  target: AppLanguage
  canTranslate: boolean
  onTranslate: () => void
}

function OriginalView({ lyrics, target, canTranslate, onTranslate }: OriginalViewProps) {
  const { t } = useTranslation()
  const styles = useStyles()

  const header = (
    <View style={styles.header}>
      {canTranslate ? (
        <Button
          label={t("lyrics.translate", { language: LANGUAGE_NAMES[target] })}
          variant="tonal"
          onPress={onTranslate}
        />
      ) : (
        lyrics.language === target && (
          <AppText variant="caption" color="secondary">
            {t("lyrics.sameLanguage")}
          </AppText>
        )
      )}
      <LyricsSource source={lyrics.source} />
    </View>
  )
  return <LyricLines lines={lyrics.lines} view="original" header={header} />
}

type TranslationViewProps = {
  lyrics: ApiLyrics
  target: AppLanguage
  view: LyricsView
  onView: (view: LyricsView) => void
  /** Back to the original; `true` when the server said it cannot translate at all. */
  onBack: (unavailable: boolean) => void
}

function TranslationView({ lyrics, target, view, onView, onBack }: TranslationViewProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { state, reload } = useLyricsTranslation(lyrics.trackId, target)

  const source = <LyricsSource source={lyrics.source} />
  const original = (header: ReactElement) => (
    <LyricLines lines={lyrics.lines} view="original" header={header} />
  )

  if (state.status === "loading") {
    return original(
      <View style={styles.header}>
        <Button label={t("lyrics.translating")} variant="tonal" loading disabled />
        {source}
      </View>,
    )
  }

  if (state.status === "error") {
    const failure = lyricsFailure(state.error)
    return original(
      <View style={styles.header}>
        <LyricsNotice
          message={t(TRANSLATION_FAILURE_TEXT[failure])}
          onRetry={canRetry(failure) ? () => void reload() : undefined}
          onBack={() => onBack(failure === "not-configured")}
        />
        {source}
      </View>,
    )
  }

  const translation: ApiLyricsTranslation = state.data
  // The server found the lyrics already in this language: there is nothing to put beside them.
  if (translation.provider === "original") {
    return original(
      <View style={styles.header}>
        <AppText variant="caption" color="secondary">
          {t("lyrics.sameLanguage")}
        </AppText>
        {source}
      </View>,
    )
  }

  return (
    <LyricLines
      lines={lyrics.lines}
      translated={translation.lines}
      view={view}
      header={
        <View style={styles.header}>
          <LyricsViewChips
            view={view}
            onChange={(next) => (next === "original" ? onBack(false) : onView(next))}
          />
          {view !== "original" && <AutoTranslatedLabel />}
          {source}
        </View>
      }
    />
  )
}

const useStyles = makeStyles(() => ({
  header: { gap: spacing.md, paddingBottom: spacing.lg },
}))
