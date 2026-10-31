import { router } from "expo-router"
import { ChevronRight } from "lucide-react-native"
import { memo } from "react"
import type { ApiPlaylist } from "@/api/types"
import { colors, sizes } from "@/theme"
import { plural } from "@/utils/plural"
import { MediaRow } from "./MediaRow"

type PlaylistRowProps = {
  playlist: ApiPlaylist
}

const openPlaylist = (id: string) => router.push({ pathname: "/playlist/[id]", params: { id } })

function PlaylistRowBase({ playlist }: PlaylistRowProps) {
  const count = playlist.trackIds.length
  return (
    <MediaRow
      image={playlist.cover ?? ""}
      title={playlist.name}
      subtitle={`${playlist.owner} · ${count} ${plural("song", count)}`}
      accessibilityLabel={`Playlist ${playlist.name}`}
      onPress={() => openPlaylist(playlist.id)}
      trailing={<ChevronRight size={sizes.icon} color={colors.secondary} />}
    />
  )
}

export const PlaylistRow = memo(PlaylistRowBase)
