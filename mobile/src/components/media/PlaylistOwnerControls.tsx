import { router } from "expo-router"
import { Pencil, Trash2 } from "lucide-react-native"
import { useState } from "react"
import { ConfirmSheet } from "@/components/ui/ConfirmSheet"
import { IconButton } from "@/components/ui/IconButton"
import { useTranslation } from "@/i18n"
import { useLibraryStore } from "@/store/libraryStore"
import { showToast } from "@/store/toastStore"
import { RenamePlaylistSheet } from "./RenamePlaylistSheet"

type PlaylistOwnerControlsProps = {
  playlistId: string
  name: string
}

/** Rename and delete buttons for a playlist the user made. Show them for no one else's. */
export function PlaylistOwnerControls({ playlistId, name }: PlaylistOwnerControlsProps) {
  const { t } = useTranslation()
  const deletePlaylist = useLibraryStore((state) => state.deletePlaylist)
  const [renaming, setRenaming] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const remove = () => {
    setConfirming(false)
    // Leave first: the playlist is gone from the library at once, and comes back (with a toast
    // saying why) if the server refuses.
    if (router.canGoBack()) router.back()
    else router.replace("/")
    void deletePlaylist(playlistId).then((deleted) => {
      if (deleted) showToast(t("playlist.deleted"))
    })
  }

  return (
    <>
      <IconButton icon={Pencil} label={t("playlist.rename")} onPress={() => setRenaming(true)} />
      <IconButton icon={Trash2} label={t("playlist.delete")} onPress={() => setConfirming(true)} />
      {renaming ? (
        <RenamePlaylistSheet
          playlistId={playlistId}
          currentName={name}
          onClose={() => setRenaming(false)}
        />
      ) : null}
      {confirming ? (
        <ConfirmSheet
          title={`${t("playlist.deleteConfirmTitle")} “${name}”`}
          message={t("playlist.deleteConfirmMessage")}
          confirmLabel={t("playlist.confirmDelete")}
          cancelLabel={t("playlist.cancel")}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </>
  )
}
