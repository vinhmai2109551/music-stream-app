import { Stack } from "expo-router"
import { useAppStore } from "@/store/appStore"
import { colors } from "@/theme"

export default function AuthLayout() {
  // Launch decides which screen opens first ("Create an account" vs "I already have an account").
  const initialRouteName = useAppStore((state) => state.authIntent)
  return (
    <Stack
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: colors.text },
      }}
    />
  )
}
