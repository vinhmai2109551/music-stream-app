import { LinearGradient } from "expo-linear-gradient"
import type { StyleProp, ViewStyle } from "react-native"
import { useColors } from "@/theme"
import { Mascot } from "./Mascot"

const START = { x: 0, y: 0 }
const END = { x: 1, y: 1 }

type MascotTileProps = {
  /** Side of the square tile. */
  size: number
  /** Side of the drawing on it. */
  mascotSize: number
  borderRadius: number
  /** The pressed look: pink to violet to cyan instead of violet to indigo to cyan. */
  active?: boolean
  style?: StyleProp<ViewStyle>
}

/** The mascot on its gradient tile: the tab bar button, the header and the welcome all use it. */
export function MascotTile({
  size,
  mascotSize,
  borderRadius,
  active = false,
  style,
}: MascotTileProps) {
  const colors = useColors()

  return (
    <LinearGradient
      colors={active ? colors.mascotGradients.active : colors.mascotGradients.idle}
      start={START}
      end={END}
      style={[
        { width: size, height: size, borderRadius, alignItems: "center", justifyContent: "center" },
        style,
      ]}
    >
      <Mascot size={mascotSize} />
    </LinearGradient>
  )
}
