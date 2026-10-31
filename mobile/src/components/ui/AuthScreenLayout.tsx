import { BlurView } from "expo-blur"
import { Image } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import { Music2 } from "lucide-react-native"
import type { ReactNode } from "react"
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, radius, sizes, spacing } from "@/theme"
import type { ImageSource } from "@/types"
import { AppText } from "./AppText"
import { pressedStyle } from "./pressed"

const ENTER_DURATION = 400
const PANEL_BLUR_INTENSITY = 40

// Photo stays visible behind the title, near-black behind the form.
const SCRIM_COLORS = [
  colors.backdrop,
  colors.playerScrim,
  colors.cardScrim,
  colors.scrimDeep,
] as const
const SCRIM_LOCATIONS = [0, 0.4, 0.62, 0.85] as const

/** Link to the other auth screen, shown right under the form. */
export type AuthFooter = {
  prompt: string
  action: string
  disabled?: boolean
  onPress: () => void
}

type AuthScreenLayoutProps = {
  title: string
  subtitle: string
  background: ImageSource
  footer?: AuthFooter
  children: ReactNode
}

/** Shared frame of the login / register screens: photo backdrop, frosted form panel, keyboard handling, safe areas. */
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
      <LinearGradient
        colors={SCRIM_COLORS}
        locations={SCRIM_LOCATIONS}
        style={StyleSheet.absoluteFill}
      />
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
            <View style={styles.header}>
              <View style={styles.logo}>
                <Music2 size={sizes.icon} strokeWidth={2} color={colors.white} />
              </View>
              <AppText variant="h1" color="white" accessibilityRole="header" numberOfLines={2}>
                {title}
              </AppText>
              <AppText color="onDarkMuted" numberOfLines={2} ellipsizeMode="tail">
                {subtitle}
              </AppText>
            </View>
            <View>
              <View style={styles.panel}>
                <BlurView
                  tint="dark"
                  intensity={PANEL_BLUR_INTENSITY}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.form}>{children}</View>
              </View>
              {footer ? <AuthFooterLink {...footer} /> : null}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

function AuthFooterLink({ prompt, action, disabled = false, onPress }: AuthFooter) {
  return (
    <View style={styles.footer}>
      <AppText color="onDarkMuted">{prompt}</AppText>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={action}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.link,
          disabled && styles.linkDisabled,
          pressedStyle(pressed),
        ]}
      >
        <AppText variant="bodyMedium" color="accent" numberOfLines={1} ellipsizeMode="tail">
          {action}
        </AppText>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.text },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.screen },
  body: { flexGrow: 1, justifyContent: "space-between" },
  header: { gap: spacing.xs, paddingBottom: spacing.xxl },
  logo: {
    width: sizes.coverMd,
    height: sizes.coverMd,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    marginBottom: spacing.lg,
  },
  panel: {
    borderRadius: radius.sheet,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  form: { gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.panel },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  link: {
    minHeight: sizes.minTouch,
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
  },
  linkDisabled: { opacity: 0.5 },
})
