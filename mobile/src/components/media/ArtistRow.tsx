import { router } from "expo-router"
import { User } from "lucide-react-native"
import { memo } from "react"
import type { ApiArtist } from "@/api/types"
import { Button } from "@/components/ui/Button"
import { useLibraryStore } from "@/store/libraryStore"
import { sizes } from "@/theme"
import { formatCount } from "@/utils/formatCount"
import { plural } from "@/utils/plural"
import { MediaRow } from "./MediaRow"

type ArtistRowProps = {
  artist: ApiArtist
}

const openArtist = (id: string) => router.push({ pathname: "/artist/[id]", params: { id } })

/** An artist with a follow button; opens the artist page. */
function ArtistRowBase({ artist }: ArtistRowProps) {
  const followed = useLibraryStore((state) => state.followedArtistIds.includes(artist.id))
  const toggleFollow = useLibraryStore((state) => state.toggleFollow)
  // The count from the server already includes the follow the user had when it was loaded.
  const followers = artist.followers - (artist.followed ? 1 : 0) + (followed ? 1 : 0)

  return (
    <MediaRow
      image={artist.image}
      icon={User}
      round
      size={sizes.coverMd}
      title={artist.name}
      subtitle={`${formatCount(followers)} ${plural("follower", followers)}`}
      accessibilityLabel={`Artist ${artist.name}`}
      onPress={() => openArtist(artist.id)}
      trailing={
        <Button
          compact
          label={followed ? "Following" : "Follow"}
          variant={followed ? "tonal" : "outline"}
          onPress={() => void toggleFollow(artist.id)}
        />
      }
    />
  )
}

export const ArtistRow = memo(ArtistRowBase)
