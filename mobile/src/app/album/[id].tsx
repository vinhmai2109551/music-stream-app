import { useLocalSearchParams } from "expo-router"
import { CollectionView } from "@/components/media/CollectionView"

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <CollectionView kind="album" id={id} />
}
