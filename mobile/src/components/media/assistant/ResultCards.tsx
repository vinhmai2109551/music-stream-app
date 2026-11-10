import { memo, useState } from "react"
import { View } from "react-native"
import type { AssistantDisplay } from "@/api/types"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { makeStyles, radius, sizes, spacing } from "@/theme"
import { AlbumRow } from "../AlbumRow"
import { ArtistRow } from "../ArtistRow"
import { PlaylistRow } from "../PlaylistRow"
import { TrackRow } from "../TrackRow"
import { useTranslation } from "@/i18n"

/** Tracks shown before "Xem thêm": a long answer must not push the conversation off screen. */
const PREVIEW_TRACKS = 5

type ResultCardsProps = {
  display?: AssistantDisplay
}

/** What a tool found, with the app's own rows (tap to play or open). Nothing when it found nothing. */
function ResultCardsBase({ display }: ResultCardsProps) {
  const { t } = useTranslation()

  const styles = useStyles()

  const [expanded, setExpanded] = useState(false)
  if (!display) return null
  const { tracks = [], artists = [], albums = [], playlists = [], sources = [] } = display
  if (tracks.length + artists.length + albums.length + playlists.length + sources.length === 0) {
    return null
  }

  const hidden = expanded ? 0 : Math.max(0, tracks.length - PREVIEW_TRACKS)
  const shown = hidden > 0 ? tracks.slice(0, PREVIEW_TRACKS) : tracks
  return (
    <View style={styles.card}>
      {shown.map((track, index) => (
        <TrackRow
          key={track.id}
          track={track}
          index={index}
          list={tracks}
          source={t("assistant.playSource")}
        />
      ))}
      {(hidden > 0 || (expanded && tracks.length > PREVIEW_TRACKS)) && (
        <Button
          compact
          variant="text"
          label={
            expanded ? t("assistant.fewerTracks") : t("assistant.moreTracks", { count: hidden })
          }
          onPress={() => setExpanded((open) => !open)}
          style={styles.toggle}
        />
      )}
      {artists.map((artist) => (
        <ArtistRow key={artist.id} artist={artist} />
      ))}
      {albums.map((album) => (
        <AlbumRow key={album.id} album={album} />
      ))}
      {playlists.map((playlist) => (
        <PlaylistRow key={playlist.id} playlist={playlist} />
      ))}
      {sources.length > 0 && (
        <View style={styles.sources}>
          <AppText variant="small" color="secondary">
            {t("assistant.sources")}
          </AppText>
          {sources.map((source) => (
            <AppText
              key={`${source.source}-${source.heading}`}
              variant="small"
              color="secondary"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              • {source.heading}
            </AppText>
          ))}
        </View>
      )}
    </View>
  )
}

export const ResultCards = memo(ResultCardsBase)

const useStyles = makeStyles((colors) => ({
  card: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.card,
    borderWidth: sizes.borderThin,
    borderColor: colors.divider,
    backgroundColor: colors.background,
  },
  toggle: { alignSelf: "flex-start" },
  sources: { gap: spacing.xxs, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
}))
