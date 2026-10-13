import { Button } from "@/components/ui/Button"
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen"
import { copy } from "@/constants/copy"
import { tracks } from "@/data/mock"
import { usePlayerStore } from "@/store/playerStore"

/** Placeholder; the real Home screen is built in the Home & Discovery epic. */
export default function HomeScreen() {
  const playFromList = usePlayerStore((state) => state.playFromList)
  return (
    <PlaceholderScreen title="Home" note="Home screen coming in the next epic.">
      {/* Temporary: lets you try the mini player before the real Home exists. */}
      <Button label="Play sample" onPress={() => playFromList(tracks, 0, copy.appName)} />
    </PlaceholderScreen>
  )
}
