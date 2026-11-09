import { View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { MascotTile } from "@/components/ui/MascotTile"
import { copy } from "@/constants/copy"
import { makeStyles, radius, sizes, spacing } from "@/theme"

type WelcomeProps = {
  /** Sending a starter is the same as typing it. */
  onPick: (text: string) => void
  disabled: boolean
}

/** What an empty chat shows: who the assistant is, and four things to ask to begin. */
export function Welcome({ onPick, disabled }: WelcomeProps) {
  const styles = useStyles()

  return (
    <View style={styles.container}>
      <MascotTile
        size={sizes.welcomeTile}
        mascotSize={sizes.welcomeMascot}
        borderRadius={radius.heroTile}
        style={styles.tile}
      />
      <AppText variant="title" style={styles.center} accessibilityRole="header">
        {copy.assistant.welcomeTitle}
      </AppText>
      <AppText color="secondary" style={styles.center}>
        {copy.assistant.welcomeBody}
      </AppText>
      <View accessibilityLabel={copy.assistant.startersLabel} style={styles.starters}>
        {copy.assistant.starters.map((starter) => (
          <Button
            key={starter}
            label={starter}
            variant="tonal"
            disabled={disabled}
            onPress={() => onPick(starter)}
          />
        ))}
      </View>
    </View>
  )
}

const useStyles = makeStyles(() => ({
  container: {
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.xxxl,
  },
  tile: { marginBottom: spacing.sm },
  center: { textAlign: "center" },
  starters: { alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.lg },
}))
