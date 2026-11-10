import { useState } from "react"
import { TextInput, View } from "react-native"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { Button } from "@/components/ui/Button"
import { MAX_PLAYLIST_NAME } from "@/constants/playlist"
import { useLibraryStore } from "@/store/libraryStore"
import { showToast } from "@/store/toastStore"
import { makeStyles, radius, sizes, spacing, typography, useColors } from "@/theme"
import { useTranslation } from "@/i18n"

type CreatePlaylistSheetProps = {
  onClose: () => void
}

/** Asks for a name and creates an empty playlist of the user. */
export function CreatePlaylistSheet({ onClose }: CreatePlaylistSheetProps) {
  const { t } = useTranslation()

  const styles = useStyles()
  const colors = useColors()

  const createPlaylist = useLibraryStore((state) => state.createPlaylist)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  const create = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    const playlist = await createPlaylist(name)
    setSaving(false)
    if (!playlist) return
    showToast(t("library.playlists.created"))
    onClose()
  }

  return (
    <BottomSheet visible onClose={onClose} title={t("playlist.newPlaylist")}>
      <View style={styles.form}>
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          onSubmitEditing={() => void create()}
          placeholder={t("playlist.playlistNamePlaceholder")}
          placeholderTextColor={colors.secondary}
          selectionColor={colors.accent}
          maxLength={MAX_PLAYLIST_NAME}
          returnKeyType="done"
          editable={!saving}
          accessibilityLabel={t("playlist.playlistNamePlaceholder")}
          style={styles.input}
        />
        <Button
          label={t("playlist.createPlaylist")}
          loading={saving}
          disabled={!name.trim()}
          onPress={() => void create()}
        />
      </View>
    </BottomSheet>
  )
}

const useStyles = makeStyles((colors) => ({
  form: { gap: spacing.lg, paddingBottom: spacing.md },
  input: {
    height: sizes.searchBarHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: sizes.borderThin,
    borderColor: colors.divider,
    color: colors.text,
    ...typography.body,
  },
}))
