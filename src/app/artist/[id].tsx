import { useLocalSearchParams } from "expo-router"
import { ArtistView } from "@/components/media/ArtistView"

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ArtistView id={id} />
}
