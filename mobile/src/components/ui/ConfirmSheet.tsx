import { StyleSheet, View } from "react-native"
import { spacing } from "@/theme"
import { AppText } from "./AppText"
import { BottomSheet } from "./BottomSheet"
import { Button } from "./Button"

type ConfirmSheetProps = {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  /** Also called when the sheet is dismissed (backdrop, back button, swipe). */
  onCancel: () => void
}

/** Asks the user to confirm something that cannot be undone. Mount it only while it is open. */
export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <BottomSheet visible onClose={onCancel} title={title}>
      <AppText color="secondary" style={styles.message}>
        {message}
      </AppText>
      <View style={styles.actions}>
        <Button label={confirmLabel} onPress={onConfirm} />
        <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  message: { paddingVertical: spacing.md },
  actions: { gap: spacing.md, paddingBottom: spacing.md },
})
