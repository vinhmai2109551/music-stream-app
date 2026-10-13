import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { StyleSheet } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { useAppFonts } from "@/hooks/useAppFonts"
import { useAppStore } from "@/store/appStore"
import { colors } from "@/theme"

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const fontsReady = useAppFonts()
  const hasStarted = useAppStore((state) => state.hasStarted)

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync()
  }, [fontsReady])

  if (!fontsReady) return null

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style={hasStarted ? "dark" : "light"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Protected guard={!hasStarted}>
            <Stack.Screen name="launch" />
          </Stack.Protected>
          <Stack.Protected guard={hasStarted}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="playlist/[id]" />
            <Stack.Screen name="album/[id]" />
            <Stack.Screen name="artist/[id]" />
            <Stack.Screen name="player" options={{ presentation: "modal" }} />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
})
