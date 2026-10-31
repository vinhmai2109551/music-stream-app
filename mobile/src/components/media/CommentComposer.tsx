import { Send, X } from "lucide-react-native"
import { useState } from "react"
import { StyleSheet, TextInput, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { IconButton } from "@/components/ui/IconButton"
import { copy } from "@/constants/copy"
import { useAuthStore } from "@/store/authStore"
import { colors, radius, sizes, spacing, typography } from "@/theme"

const MAX_LENGTH = 500

type CommentComposerProps = {
  /** Name of the person being answered, when replying. */
  replyingTo: string | null
  onCancelReply: () => void
  /** Sends the text; resolves to false when it could not be sent (the text is kept). */
  onSend: (text: string) => Promise<boolean>
}

/** The box at the bottom of the comments: avatar initial, text field and send button. */
export function CommentComposer({ replyingTo, onCancelReply, onSend }: CommentComposerProps) {
  const userName = useAuthStore((state) => state.user?.name ?? "")
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const canSend = text.trim().length > 0 && !sending

  const send = async () => {
    if (!canSend) return
    setSending(true)
    const sent = await onSend(text.trim())
    setSending(false)
    if (sent) setText("")
  }

  return (
    <View>
      {replyingTo !== null && (
        <View style={styles.replying}>
          <AppText variant="caption" color="secondary" numberOfLines={1} style={styles.flex}>
            {copy.comments.replyingTo} {replyingTo}
          </AppText>
          <IconButton
            icon={X}
            label={copy.comments.cancelReply}
            size={sizes.iconMd}
            onPress={onCancelReply}
          />
        </View>
      )}
      <View style={styles.row}>
        <View style={styles.avatar}>
          <AppText variant="subtitle" color="onAccent">
            {userName.trim().charAt(0).toUpperCase() || "?"}
          </AppText>
        </View>
        <View style={styles.field}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => void send()}
            placeholder={copy.comments.placeholder}
            placeholderTextColor={colors.tertiary}
            selectionColor={colors.accent}
            maxLength={MAX_LENGTH}
            returnKeyType="send"
            editable={!sending}
            accessibilityLabel={copy.comments.placeholder}
            style={styles.input}
          />
          <IconButton
            icon={Send}
            label={copy.comments.send}
            active={canSend}
            size={sizes.iconMd}
            disabled={!canSend}
            onPress={() => void send()}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  replying: { flexDirection: "row", alignItems: "center", paddingLeft: sizes.userAvatar },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: sizes.userAvatar,
    height: sizes.userAvatar,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
  },
  field: {
    flex: 1,
    minWidth: 0,
    height: sizes.minTouch + spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: sizes.borderThin,
    borderColor: colors.divider,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    ...typography.body,
    paddingVertical: 0,
    outlineWidth: 0,
  },
})
