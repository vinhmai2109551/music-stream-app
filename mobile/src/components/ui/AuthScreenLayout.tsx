import { Image } from "expo-image"
import { Music2 } from "lucide-react-native"
import type { ReactNode } from "react"
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, radius, sizes, spacing } from "@/theme"
import type { ImageSource } from "@/types"
import { AppText } from "./AppText"

const ENTER_DURATION = 400

type AuthScreenLayoutProps = {
  title: string
  subtitle: string
  background: ImageSource
  /** Shown under the form, e.g. the link to the other auth screen. */
  footer?: ReactNode
  children: ReactNode
}

/** Shared frame of the login / register screens: photo backdrop, keyboard handling, safe areas. */
export function AuthScreenLayout({
  title,
  subtitle,
  background,
  footer,
  children,
}: AuthScreenLayoutProps) {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.screen}>
      <Image source={background} contentFit="cover" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xl },
          ]}
        >
          <Animated.View entering={FadeInDown.duration(ENTER_DURATION)} style={styles.body}>
            <View style={styles.logo}>
              <Music2 size={sizes.icon} strokeWidth={2} color={colors.white} />
            </View>
            <AppText variant="h1" color="white" style={styles.title}>
              {title}
            </AppText>
            <AppText color="onDarkMuted" style={styles.subtitle}>
              {subtitle}
            </AppText>
            <View style={styles.form}>{children}</View>
          </Animated.View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.text },
  scrim: { backgroundColor: colors.playerScrim },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.screen },
  body: { flex: 1, justifyContent: "center" },
  logo: {
    width: sizes.coverMd,
    height: sizes.coverMd,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    marginBottom: spacing.xl,
  },
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.xxl },
  form: { gap: spacing.lg },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
})
