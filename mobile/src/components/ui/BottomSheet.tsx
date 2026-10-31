import { ChevronDown } from "lucide-react-native"
import type { ReactNode } from "react"
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
} from "react-native"
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, radius, sizes, spacing } from "@/theme"
import { AppText } from "./AppText"
import { IconButton } from "./IconButton"

const SHEET_MAX_HEIGHT = "88%"

type BottomSheetProps = {
  visible: boolean
  onClose: () => void
  title?: string
  /** A fixed height (e.g. "70%") for content that fills the sheet, such as a list. */
  height?: DimensionValue
  children: ReactNode
}

export function BottomSheet({ visible, onClose, title, height, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.fill}
      >
        <Pressable
          accessibilityLabel="Close"
          style={[styles.fill, styles.backdrop]}
          onPress={onClose}
        />
      </Animated.View>
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.anchor}
      >
        <Animated.View
          entering={SlideInDown.duration(260)}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.sheet,
            height !== undefined && { height },
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <View style={styles.handle} />
          {title !== undefined && (
            <View style={styles.header}>
              <AppText variant="subtitle" numberOfLines={1} style={styles.title}>
                {title}
              </AppText>
              <IconButton icon={ChevronDown} label="Close" onPress={onClose} />
            </View>
          )}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
  backdrop: { backgroundColor: colors.backdrop },
  anchor: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: SHEET_MAX_HEIGHT,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: "center",
    width: sizes.sheetHandleWidth,
    height: sizes.sheetHandleHeight,
    borderRadius: radius.pill,
    backgroundColor: colors.divider,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { flex: 1 },
})
