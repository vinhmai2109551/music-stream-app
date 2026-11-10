import { router } from "expo-router"
import { ChevronRight } from "lucide-react-native"
import { memo } from "react"
import type { ApiPlaylist } from "@/api/types"
import { sizes, useColors } from "@/theme"
import { MediaRow } from "./MediaRow"
import { useTranslation } from "@/i18n"

type PlaylistRowProps = {
  playlist: ApiPlaylist
}

const openPlaylist = (id: string) => router.push({ pathname: "/playlist/[id]", params: { id } })

function PlaylistRowBase({ playlist }: PlaylistRowProps) {
  const { t } = useTranslation()

  const colors = useColors()

  const count = playlist.trackIds.length
  return (
    <MediaRow
      image={playlist.cover ?? ""}
      title={playlist.name}
      subtitle={`${playlist.owner} · ${t("common.count.songs", { count, value: count })}`}
      accessibilityLabel={t("playlist.named", { name: playlist.name })}
      onPress={() => openPlaylist(playlist.id)}
      trailing={<ChevronRight size={sizes.icon} color={colors.secondary} />}
    />
  )
}

export const PlaylistRow = memo(PlaylistRowBase)
