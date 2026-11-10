import { router } from "expo-router"
import { ChevronRight } from "lucide-react-native"
import { memo } from "react"
import type { ApiAlbum } from "@/api/types"
import { sizes, useColors } from "@/theme"
import { MediaRow } from "./MediaRow"
import { useTranslation } from "@/i18n"

type AlbumRowProps = {
  album: ApiAlbum
}

const openAlbum = (id: string) => router.push({ pathname: "/album/[id]", params: { id } })

function AlbumRowBase({ album }: AlbumRowProps) {
  const { t } = useTranslation()

  const colors = useColors()

  return (
    <MediaRow
      image={album.cover}
      imageLabel={album.artist}
      title={album.title}
      subtitle={album.artist}
      accessibilityLabel={t("album.named", { title: album.title, artist: album.artist })}
      onPress={() => openAlbum(album.id)}
      trailing={<ChevronRight size={sizes.icon} color={colors.secondary} />}
    />
  )
}

export const AlbumRow = memo(AlbumRowBase)
