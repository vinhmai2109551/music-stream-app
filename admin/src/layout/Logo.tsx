import { useId } from "react"

interface Props {
  size?: number
  /** The four bars move like an equalizer (used while the pointer is on the logo). */
  live?: boolean
}

/** The mark of Music Stream Admin: four sound bars on the gradient of the app's premium screens. */
export function Logo({ size = 32, live = false }: Props) {
  const gradient = useId()
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      className={live ? "logo logo--live" : "logo"}
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22D3EE" />
          <stop offset="0.55" stopColor="#6D4AE8" />
          <stop offset="1" stopColor="#D946EF" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradient})`} />
      <g fill="#FFFFFF">
        <rect className="logo__bar logo__bar--1" x="6.5" y="13" width="3.6" height="11" rx="1.8" />
        <rect className="logo__bar logo__bar--2" x="11.9" y="8" width="3.6" height="16" rx="1.8" />
        <rect className="logo__bar logo__bar--3" x="17.3" y="11" width="3.6" height="13" rx="1.8" />
        <rect className="logo__bar logo__bar--4" x="22.7" y="15" width="3.6" height="9" rx="1.8" />
      </g>
    </svg>
  )
}
