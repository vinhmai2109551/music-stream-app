import { Image } from "expo-image"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { images } from "@/data/images"
import { radius, sizes, spacing } from "@/theme"

const COLLAPSED_LINES = 3

type ArtistAboutProps = {
  bio: string
}

export function ArtistAbout({ bio }: ArtistAboutProps) {
  const [expanded, setExpanded] = useState(false)
  return (
    <View>
      <Image source={images.user.aboutBanner} contentFit="cover" style={styles.banner} />
      <AppText
        color="secondary"
        numberOfLines={expanded ? undefined : COLLAPSED_LINES}
        ellipsizeMode="tail"
        style={styles.bio}
      >
        {bio}
      </AppText>
      <Button
        variant="text"
        label={expanded ? "View less" : "View more"}
        onPress={() => setExpanded((value) => !value)}
        style={styles.toggle}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { width: "100%", height: sizes.aboutImageHeight, borderRadius: radius.card },
  bio: { marginTop: spacing.md },
  toggle: { alignSelf: "flex-start", paddingHorizontal: 0 },
})
