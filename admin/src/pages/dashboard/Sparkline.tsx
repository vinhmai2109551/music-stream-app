interface Props {
  values: readonly number[]
  /** What the line shows, for people who cannot see it. */
  label: string
}

const WIDTH = 100
const HEIGHT = 28
const PAD = 3

/** A line of the last days, with no axes: it shows the shape, the number beside it gives the value. */
export function Sparkline({ values, label }: Props) {
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? WIDTH / (values.length - 1) : 0
  const y = (value: number) => HEIGHT - PAD - (value / max) * (HEIGHT - PAD * 2)
  const points = values.map((value, index) => `${(index * step).toFixed(2)},${y(value).toFixed(2)}`)
  const flat = values.every((value) => value === 0)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height={HEIGHT}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      {flat ? (
        <line
          x1="0"
          x2={WIDTH}
          y1={HEIGHT - PAD}
          y2={HEIGHT - PAD}
          stroke="var(--line)"
          strokeWidth="2"
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <>
          <polygon
            points={`0,${HEIGHT} ${points.join(" ")} ${WIDTH},${HEIGHT}`}
            fill="var(--chart-line)"
            opacity="0.12"
          />
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke="var(--chart-line)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
  )
}
