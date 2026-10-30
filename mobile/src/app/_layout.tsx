import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { StyleSheet } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AudioEngine } from "@/components/media/AudioEngine"
import { ToastHost } from "@/components/ui/ToastHost"
import { useAppFonts } from "@/hooks/useAppFonts"
import { useAppStore } from "@/store/appStore"
import { useAuthStore } from "@/store/authStore"
import { useLibraryStore } from "@/store/libraryStore"
import { colors } from "@/theme"

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const fontsReady = useAppFonts()
  const status = useAuthStore((state) => state.status)
  const hasStarted = useAppStore((state) => state.hasStarted)

  useEffect(() => {
    void useAuthStore.getState().bootstrap()
  }, [])

  // Likes, follows and playlists belong to the account: fetch them once signed in.
  const isAuthenticated = status === "authenticated"
  useEffect(() => {
    if (isAuthenticated) void useLibraryStore.getState().load()
  }, [isAuthenticated])

  // Keep the splash screen up until fonts are loaded and the saved session has been checked.
  const ready = fontsReady && status !== "loading"
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style={isAuthenticated ? "dark" : "light"} />
        <AudioEngine />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          {/* 1. Not signed in and Launch not seen yet. */}
          <Stack.Protected guard={!isAuthenticated && !hasStarted}>
            <Stack.Screen name="launch" />
          </Stack.Protected>
          {/* 2. Not signed in, Launch already seen. */}
          <Stack.Protected guard={!isAuthenticated && hasStarted}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          {/* 3. Signed in. */}
          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="playlist/[id]" />
            <Stack.Screen name="album/[id]" />
            <Stack.Screen name="artist/[id]" />
            <Stack.Screen
              name="player"
              options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }}
            />
          </Stack.Protected>
        </Stack>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
})
