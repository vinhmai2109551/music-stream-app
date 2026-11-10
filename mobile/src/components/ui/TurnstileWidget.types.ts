import type { TurnstileAction } from "@/constants/turnstile"

export type TurnstileWidgetProps = {
  /** Must match the action the backend expects for this endpoint. */
  action: TurnstileAction
  /** A fresh token once solved; null when it expired, failed or is being reloaded. */
  onToken: (token: string | null) => void
}

/** Messages the widget page posts back (native WebView only). */
export type TurnstileMessage =
  | { type: "token"; token: string }
  | { type: "expired" }
  | { type: "error"; code?: string }
  /** The check needs the person to tap it; the widget waits for them. */
  | { type: "interactive" }
  | { type: "interactive-done" }
