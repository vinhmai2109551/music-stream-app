import { useState } from "react"
import { StyleSheet, TextInput, View } from "react-native"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { Button } from "@/components/ui/Button"
import { copy } from "@/constants/copy"
import { useLibraryStore } from "@/store/libraryStore"
import { showToast } from "@/store/toastStore"
import { colors, radius, sizes, spacing, typography } from "@/theme"

const MAX_PLAYLIST_NAME = 100

type CreatePlaylistSheetProps = {
  onClose: () => void
}

/** Asks for a name and creates an empty playlist of the user. */
export function CreatePlaylistSheet({ onClose }: CreatePlaylistSheetProps) {
  const createPlaylist = useLibraryStore((state) => state.createPlaylist)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  const create = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    const playlist = await createPlaylist(name)
    setSaving(false)
    if (!playlist) return
    showToast(copy.playlistsScreen.created)
    onClose()
  }

  return (
    <BottomSheet visible onClose={onClose} title={copy.library.newPlaylist}>
      <View style={styles.form}>
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          onSubmitEditing={() => void create()}
          placeholder={copy.library.playlistNamePlaceholder}
          placeholderTextColor={colors.secondary}
          selectionColor={colors.accent}
          maxLength={MAX_PLAYLIST_NAME}
          returnKeyType="done"
          editable={!saving}
          accessibilityLabel={copy.library.playlistNamePlaceholder}
          style={styles.input}
        />
        <Button
          label={copy.library.createPlaylist}
          loading={saving}
          disabled={!name.trim()}
          onPress={() => void create()}
        />
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
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
})
