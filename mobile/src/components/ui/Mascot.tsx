import Svg, { Circle, Path, Rect } from "react-native-svg"
import { sizes, useColors } from "@/theme"

type MascotProps = {
  size?: number
}

const BODY_OPACITY = 0.96

/** The assistant's face: a small round robot with antenna, ear pads and rosy cheeks. Decorative. */
export function Mascot({ size = sizes.mascot }: MascotProps) {
  const colors = useColors()

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="M22 8V4" stroke={colors.mascotStem} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={22} cy={3} r={3} fill={colors.mascotPink} />
      <Rect
        x={7}
        y={10}
        width={30}
        height={27}
        rx={10}
        fill={colors.white}
        fillOpacity={BODY_OPACITY}
      />
      <Rect x={3} y={18} width={6} height={11} rx={3} fill={colors.mascotViolet} />
      <Rect x={35} y={18} width={6} height={11} rx={3} fill={colors.mascotCyan} />
      <Circle cx={16.5} cy={22} r={2.6} fill={colors.mascotInk} />
      <Circle cx={27.5} cy={22} r={2.6} fill={colors.mascotInk} />
      <Circle cx={17.3} cy={21.2} r={0.8} fill={colors.white} />
      <Circle cx={28.3} cy={21.2} r={0.8} fill={colors.white} />
      <Circle cx={12.5} cy={28} r={2.2} fill={colors.mascotCheek} />
      <Circle cx={31.5} cy={28} r={2.2} fill={colors.mascotCheek} />
      <Path
        d="M18 28.5c1 2.8 7 2.8 8 0"
        fill="none"
        stroke={colors.mascotInk}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  )
}
