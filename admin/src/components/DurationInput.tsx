import { Input } from "antd"
import { useState } from "react"
import { formatDuration, parseClock } from "@/lib/time"

interface Props {
  /** Seconds. Plugs into `Form.Item`. */
  value?: number | null
  onChange?: (seconds: number | undefined) => void
  disabled?: boolean
}

/** A length typed as `3:25` (or `205`, in seconds); the form keeps whole seconds. */
export function DurationInput({ value, onChange, disabled }: Props) {
  // While the person types, show what they typed; otherwise the value, so that a duration read
  // from an uploaded file appears here too.
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value ? formatDuration(value) : "")

  return (
    <Input
      value={shown}
      disabled={disabled}
      placeholder="3:25"
      addonAfter={value ? `${value} giây` : "phút:giây"}
      inputMode="numeric"
      onChange={(event) => {
        setDraft(event.target.value)
        const ms = parseClock(event.target.value)
        onChange?.(ms === null || ms < 1000 ? undefined : Math.round(ms / 1000))
      }}
      onBlur={() => setDraft(null)}
    />
  )
}
