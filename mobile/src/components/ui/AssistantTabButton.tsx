import { router } from "expo-router"
import { Sparkles } from "lucide-react-native"
import { Pressable, View } from "react-native"
import { copy } from "@/constants/copy"
import { makeStyles, radius, sizes, spacing, useColors } from "@/theme"
import { MascotTile } from "./MascotTile"
import { pressedStyle } from "./pressed"

const BADGE_ICON_SIZE = 12
const GLOW_INSET = spacing.xs

/**
 * The centre button of the tab bar: the assistant's mascot on a gradient tile. It sits inside the
 * bar's own box (raised only as far as the bar's top edge), so it never covers the mini player.
 */
export function AssistantTabButton() {
  const styles = useStyles()
  const colors = useColors()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.assistant.open}
      onPress={() => router.push("/assistant")}
      style={styles.slot}
    >
      {({ pressed }) => (
        <View style={[styles.lift, pressedStyle(pressed)]}>
          <View
            style={[
              styles.glow,
              { backgroundColor: pressed ? colors.mascotGlowActive : colors.mascotGlow },
            ]}
          />
          <MascotTile
            size={sizes.mascotTile}
            mascotSize={sizes.mascot}
            borderRadius={radius.tile}
            active={pressed}
            style={styles.tile}
          />
          <View style={styles.badge}>
            <Sparkles size={BADGE_ICON_SIZE} strokeWidth={2.4} color={colors.mascotShadow} />
          </View>
        </View>
      )}
    </Pressable>
  )
}

const useStyles = makeStyles((colors) => ({
  slot: {
    flex: 1,
    height: sizes.tabBarContent,
    minHeight: sizes.minTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  lift: {
    width: sizes.mascotTile,
    height: sizes.mascotTile,
    transform: [{ translateY: -spacing.xs }],
  },
  glow: {
    position: "absolute",
    top: -GLOW_INSET,
    bottom: -GLOW_INSET,
    left: -GLOW_INSET,
    right: -GLOW_INSET,
    borderRadius: radius.pill,
  },
  tile: {
    borderWidth: sizes.borderMascot,
    borderColor: colors.white,
    shadowColor: colors.mascotShadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  badge: {
    position: "absolute",
    top: -spacing.xs,
    right: -spacing.xs,
    width: sizes.mascotBadge,
    height: sizes.mascotBadge,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
}))
