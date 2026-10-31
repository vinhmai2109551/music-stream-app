import { router } from "expo-router"
import { ChevronRight } from "lucide-react-native"
import { memo } from "react"
import type { ApiAlbum } from "@/api/types"
import { colors, sizes } from "@/theme"
import { MediaRow } from "./MediaRow"

type AlbumRowProps = {
  album: ApiAlbum
}

const openAlbum = (id: string) => router.push({ pathname: "/album/[id]", params: { id } })

function AlbumRowBase({ album }: AlbumRowProps) {
  return (
    <MediaRow
      image={album.cover}
      imageLabel={album.artist}
      title={album.title}
      subtitle={album.artist}
      accessibilityLabel={`Album ${album.title} by ${album.artist}`}
      onPress={() => openAlbum(album.id)}
      trailing={<ChevronRight size={sizes.icon} color={colors.secondary} />}
    />
  )
}

export const AlbumRow = memo(AlbumRowBase)
