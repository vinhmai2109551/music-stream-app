import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { CircleAlert } from "lucide-react-native"
import { useState } from "react"
import { ActivityIndicator, TextInput, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { AUTH_LIMITS } from "@/constants/auth"
import { images } from "@/data/images"
import { useAsyncSubmit } from "@/hooks/useAsyncSubmit"
import { useAuthStore } from "@/store/authStore"
import { showToast } from "@/store/toastStore"
import { makeStyles, radius, sizes, spacing, typography, useColors } from "@/theme"
import { useTranslation } from "@/i18n"
import { prepareAvatar, type PreparedAvatar } from "@/utils/avatarImage"
import { describeProfileError } from "@/utils/profileErrors"
import { validateProfile } from "@/utils/validation"

type EditProfileFormProps = {
  /** Called after the changes are saved, or when the user goes back. */
  onDone: () => void
}

/** Edits the name and the avatar of the signed-in user. */
export function EditProfileForm({ onDone }: EditProfileFormProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()

  const user = useAuthStore((state) => state.user)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const [name, setName] = useState(user?.name ?? "")
  const [photo, setPhoto] = useState<PreparedAvatar | null>(null)
  const [preparing, setPreparing] = useState(false)
  const { submitting, run } = useAsyncSubmit()

  const nameError = validateProfile({ name }).name
  const nameChanged = name.trim() !== (user?.name ?? "")
  const canSave = !nameError && (nameChanged || photo !== null) && !preparing
  const busy = submitting || preparing

  const pickPhoto = async () => {
    if (busy) return
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      })
      const asset = result.canceled ? undefined : result.assets[0]
      if (!asset) return
      setPreparing(true)
      setPhoto(await prepareAvatar(asset))
    } catch {
      showToast(t("settings.edit.pickFailed"))
    } finally {
      setPreparing(false)
    }
  }

  const save = () => {
    if (!canSave) return
    void run(
      async () => {
        await updateProfile({
          ...(nameChanged ? { name: name.trim() } : {}),
          ...(photo ? { photo } : {}),
        })
        showToast(t("settings.edit.saved"))
        onDone()
      },
      (error) => {
        // The old name and avatar stay: the store only changes the user after a full success.
        const message = describeProfileError(error)
        showToast(message)
        return message
      },
    )
  }

  return (
    <View style={styles.form}>
      <View style={styles.photoRow}>
        <View>
          <Image
            source={photo?.uri ?? user?.avatarUrl ?? images.user.avatar}
            contentFit="cover"
            accessible={false}
            style={styles.avatar}
          />
          {preparing ? (
            <View style={styles.preparing}>
              <ActivityIndicator color={colors.white} />
            </View>
          ) : null}
        </View>
        <Button
          label={t("settings.edit.changePhoto")}
          variant="tonal"
          compact
          disabled={busy}
          onPress={() => void pickPhoto()}
        />
      </View>

      <View style={styles.field}>
        <AppText variant="caption" color="secondary">
          {t("settings.edit.nameLabel")}
        </AppText>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={save}
          maxLength={AUTH_LIMITS.nameMax}
          returnKeyType="done"
          editable={!submitting}
          placeholderTextColor={colors.secondary}
          selectionColor={colors.accent}
          accessibilityLabel={t("settings.edit.nameLabel")}
          accessibilityHint={nameError}
          style={styles.input}
        />
        {nameError ? (
          <View style={styles.errorRow}>
            <CircleAlert size={sizes.iconSm} color={colors.like} />
            <AppText variant="caption" accessibilityRole="alert" style={styles.errorText}>
              {nameError}
            </AppText>
          </View>
        ) : null}
      </View>

      <Button
        label={t("settings.edit.save")}
        loading={submitting}
        disabled={!canSave}
        onPress={save}
      />
      <Button
        label={t("settings.edit.back")}
        variant="text"
        disabled={submitting}
        onPress={onDone}
      />
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  form: { gap: spacing.lg, paddingBottom: spacing.md },
  photoRow: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  avatar: { width: sizes.avatar, height: sizes.avatar, borderRadius: radius.pill },
  preparing: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.playerScrim,
  },
  field: { gap: spacing.xs },
  input: {
    height: sizes.searchBarHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: sizes.borderThin,
    borderColor: colors.divider,
    color: colors.text,
    ...typography.body,
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  errorText: { flex: 1 },
}))
