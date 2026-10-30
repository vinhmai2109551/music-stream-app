import { router } from "expo-router"
import { Search } from "lucide-react-native"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { HomeContent } from "@/components/media/HomeContent"
import { HomeHeader } from "@/components/media/HomeHeader"
import { HomeSkeleton } from "@/components/media/HomeSkeleton"
import { AppText } from "@/components/ui/AppText"
import { ErrorState } from "@/components/ui/ErrorState"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { useHomeData } from "@/hooks/useHomeData"
import { useAuthStore } from "@/store/authStore"
import { showToast } from "@/store/toastStore"
import { colors, radius, sizes, spacing } from "@/theme"

const COMING_SOON = "Coming soon"

const openSearch = () => router.navigate("/search")

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { state, reload } = useHomeData()
  const user = useAuthStore((auth) => auth.user)

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {state.status === "loading" ? (
          <HomeSkeleton />
        ) : (
          <>
            <View style={styles.padded}>
              <HomeHeader
                name={user?.name ?? ""}
                avatarUrl={user?.avatarUrl ?? null}
                onNotifications={() => showToast(COMING_SOON)}
                onLogout={() => void useAuthStore.getState().logout()}
              />
              <Pressable
                accessibilityRole="search"
                accessibilityLabel={copy.searchPlaceholder}
                onPress={openSearch}
                style={({ pressed }) => [styles.search, pressedStyle(pressed)]}
              >
                <Search size={sizes.iconMd} color={colors.tertiary} />
                <AppText color="tertiary" numberOfLines={1}>
                  {copy.searchPlaceholder}
                </AppText>
              </Pressable>
            </View>
            {state.status === "error" ? (
              <ErrorState error={state.error} onRetry={() => void reload()} />
            ) : (
              <HomeContent data={state.data} />
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing.screen },
  search: {
    height: sizes.searchBarHeight,
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.divider,
  },
})
