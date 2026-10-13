import { router } from "expo-router"
import { Button } from "@/components/ui/Button"
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen"

/** Placeholder modal; the real player is built in the Audio Player epic. */
export default function PlayerScreen() {
  return (
    <PlaceholderScreen title="Player" note="Full player coming in the Audio Player epic.">
      <Button label="Close" variant="secondary" onPress={() => router.back()} />
    </PlaceholderScreen>
  )
}
