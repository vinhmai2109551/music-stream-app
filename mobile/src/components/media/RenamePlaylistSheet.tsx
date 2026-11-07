import { useState } from "react"
import { TextInput, View } from "react-native"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { Button } from "@/components/ui/Button"
import { copy } from "@/constants/copy"
import { MAX_PLAYLIST_NAME } from "@/constants/playlist"
import { useLibraryStore } from "@/store/libraryStore"
import { showToast } from "@/store/toastStore"
import { makeStyles, radius, sizes, spacing, typography, useColors } from "@/theme"

type RenamePlaylistSheetProps = {
  playlistId: string
  currentName: string
  onClose: () => void
}

/** Asks for a new name for one of the user's playlists. Mount it only while it is open. */
export function RenamePlaylistSheet({
  playlistId,
  currentName,
  onClose,
}: RenamePlaylistSheetProps) {
  const styles = useStyles()
  const colors = useColors()

  const renamePlaylist = useLibraryStore((state) => state.renamePlaylist)
  const [name, setName] = useState(currentName)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const next = name.trim()
    if (!next || saving) return
    if (next === currentName) {
      onClose()
      return
    }
    setSaving(true)
    const renamed = await renamePlaylist(playlistId, next)
    setSaving(false)
    // When the server refuses, the store has already said why; the sheet stays for another try.
    if (!renamed) return
    showToast(copy.library.renamed)
    onClose()
  }

  return (
    <BottomSheet visible onClose={onClose} title={copy.library.rename}>
      <View style={styles.form}>
        <TextInput
          autoFocus
          selectTextOnFocus
          value={name}
          onChangeText={setName}
          onSubmitEditing={() => void save()}
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
          label={copy.library.save}
          loading={saving}
          disabled={!name.trim()}
          onPress={() => void save()}
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
