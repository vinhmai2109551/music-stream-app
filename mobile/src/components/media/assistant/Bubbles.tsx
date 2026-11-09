import { CircleAlert } from "lucide-react-native"
import { memo } from "react"
import { View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { copy } from "@/constants/copy"
import { makeStyles, radius, sizes, spacing, useColors } from "@/theme"
import { RichText } from "./RichText"
import { TypingDots } from "./TypingDots"

type UserBubbleProps = {
  text: string
  /** The server never got it: offer to send it again. */
  failed: boolean
  onResend: (text: string) => void
}

function UserBubbleBase({ text, failed, onResend }: UserBubbleProps) {
  const styles = useStyles()
  const colors = useColors()

  return (
    <View style={styles.userSide}>
      <View
        accessible
        accessibilityLabel={`${copy.assistant.youSaid}: ${text}`}
        style={[styles.bubble, styles.user]}
      >
        <AppText color="onAccent" selectable>
          {text}
        </AppText>
      </View>
      {failed && (
        <View style={styles.failed}>
          <CircleAlert size={sizes.iconSm} color={colors.like} />
          <AppText variant="caption" color="secondary">
            {copy.assistant.notSent}
          </AppText>
          <Button
            compact
            label={copy.assistant.resend}
            variant="tonal"
            onPress={() => onResend(text)}
          />
        </View>
      )}
    </View>
  )
}

export const UserBubble = memo(UserBubbleBase)

type AssistantBubbleProps = {
  text: string
  streaming: boolean
  truncated: boolean
}

function AssistantBubbleBase({ text, streaming, truncated }: AssistantBubbleProps) {
  const styles = useStyles()

  const waiting = streaming && text.length === 0
  return (
    <View style={styles.assistantSide}>
      <View
        accessible={waiting}
        accessibilityLabel={waiting ? copy.assistant.replying : undefined}
        style={[styles.bubble, styles.assistant]}
      >
        {waiting ? <TypingDots /> : <RichText text={text} />}
      </View>
      {truncated && (
        <AppText variant="small" color="secondary" style={styles.note}>
          {copy.assistant.truncated}
        </AppText>
      )}
    </View>
  )
}

export const AssistantBubble = memo(AssistantBubbleBase)

const useStyles = makeStyles((colors) => ({
  userSide: { alignItems: "flex-end", gap: spacing.xs },
  assistantSide: { alignItems: "flex-start", gap: spacing.xs },
  bubble: {
    maxWidth: "88%",
    minWidth: sizes.minTouch,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
  },
  user: { backgroundColor: colors.accent, borderBottomRightRadius: radius.sm },
  assistant: { backgroundColor: colors.surface, borderBottomLeftRadius: radius.sm },
  failed: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  note: { paddingHorizontal: spacing.xs },
}))
