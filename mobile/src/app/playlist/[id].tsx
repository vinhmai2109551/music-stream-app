import { useLocalSearchParams } from "expo-router"
import { CollectionView } from "@/components/media/CollectionView"

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <CollectionView kind="playlist" id={id} />
}
