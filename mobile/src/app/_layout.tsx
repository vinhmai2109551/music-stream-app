import { Stack, type Href } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { StyleSheet } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AudioEngine } from "@/components/media/AudioEngine"
import { YouTubeHost } from "@/components/media/YouTubeHost"
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
  const authIntent = useAppStore((state) => state.authIntent)

  useEffect(() => {
    void useAuthStore.getState().bootstrap()
  }, [])

  // Likes, follows and playlists belong to the account: fetch them once signed in.
  const isAuthenticated = status === "authenticated"
  // The auth screen Launch (or a sign-out) chose.
  const authHref: Href = authIntent === "register" ? "/register" : "/login"
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
          {/*
            When a guard is false the router sends the user to `redirectTo`; without it Expo Router
            picks the first accessible route, which for the (auth) group has no URL.
          */}
          {/* 1. Not signed in and Launch not seen yet. */}
          <Stack.Protected
            guard={!isAuthenticated && !hasStarted}
            redirectTo={isAuthenticated ? "/" : authHref}
          >
            <Stack.Screen name="launch" />
          </Stack.Protected>
          {/* 2. Not signed in, Launch already seen. */}
          <Stack.Protected
            guard={!isAuthenticated && hasStarted}
            redirectTo={isAuthenticated ? "/" : "/launch"}
          >
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          {/* 3. Signed in. */}
          <Stack.Protected guard={isAuthenticated} redirectTo={hasStarted ? authHref : "/launch"}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="playlist/[id]" />
            <Stack.Screen name="album/[id]" />
            <Stack.Screen name="artist/[id]" />
            <Stack.Screen name="premium" />
            <Stack.Screen
              name="premium-welcome"
              options={{ animation: "fade", gestureEnabled: false }}
            />
            {/*
              A plain screen, not a native modal: the YouTube player is drawn above the screens
              (see YouTubeHost) and a native modal would hide it on iOS.
            */}
            <Stack.Screen
              name="player"
              options={{ animation: "slide_from_bottom", gestureEnabled: false }}
            />
          </Stack.Protected>
        </Stack>
        <YouTubeHost />
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
})
