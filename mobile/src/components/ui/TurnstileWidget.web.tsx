import { useEffect, useRef, useState, type CSSProperties } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { TURNSTILE } from "@/constants/turnstile"
import { sizes } from "@/theme"
import { AppText } from "./AppText"
import { pressedStyle } from "./pressed"
import type { TurnstileWidgetProps } from "./TurnstileWidget.types"
import { useTranslation } from "@/i18n"

/** The part of the Turnstile browser API this view uses. */
interface TurnstileApi {
  render(
    element: HTMLElement,
    options: {
      sitekey: string
      action: string
      theme: "dark"
      size: "flexible"
      callback: (token: string) => void
      "expired-callback": () => void
      "timeout-callback": () => void
      "error-callback": () => boolean
    },
  ): string
  remove(widgetId: string): void
}

type TurnstileWindow = Window & { turnstile?: TurnstileApi }

let apiPromise: Promise<TurnstileApi> | null = null

/** Loads Cloudflare's script once for the whole app. */
function loadTurnstile(): Promise<TurnstileApi> {
  apiPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const win = window as TurnstileWindow
    if (win.turnstile) return resolve(win.turnstile)
    const script = document.createElement("script")
    script.src = `${TURNSTILE.scriptUrl}?render=explicit`
    script.async = true
    script.onload = () => (win.turnstile ? resolve(win.turnstile) : reject(new Error("no api")))
    script.onerror = () => {
      apiPromise = null
      script.remove()
      reject(new Error("Turnstile script failed to load"))
    }
    document.head.appendChild(script)
  })
  return apiPromise
}

const HOST_STYLE: CSSProperties = { width: "100%", minHeight: TURNSTILE.height }

/** Cloudflare Turnstile on Expo web, using the browser API directly. Renders nothing when disabled. */
export function TurnstileWidget({ action, onToken }: TurnstileWidgetProps) {
  const { t } = useTranslation()
  const hostRef = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)
  const [reloadKey, setReloadKey] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    if (!TURNSTILE.enabled || !hostRef.current) return
    const host = hostRef.current
    let widgetId: string | null = null
    let api: TurnstileApi | null = null
    let cancelled = false

    loadTurnstile()
      .then((loaded) => {
        if (cancelled) return
        api = loaded
        widgetId = loaded.render(host, {
          sitekey: TURNSTILE.siteKey,
          action,
          theme: "dark",
          size: "flexible",
          callback: (token) => {
            setFailed(false)
            onTokenRef.current(token)
          },
          "expired-callback": () => onTokenRef.current(null),
          "timeout-callback": () => onTokenRef.current(null),
          "error-callback": () => {
            onTokenRef.current(null)
            setFailed(true)
            return true
          },
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      if (api && widgetId) api.remove(widgetId)
    }
  }, [action, reloadKey])

  if (!TURNSTILE.enabled) return null

  const retry = () => {
    setFailed(false)
    onToken(null)
    setReloadKey((key) => key + 1)
  }

  return (
    <View>
      <View accessibilityLabel={t("auth.turnstile.label")}>
        <div ref={hostRef} style={HOST_STYLE} />
      </View>
      {failed ? (
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={({ pressed }) => [styles.retry, pressedStyle(pressed)]}
        >
          <AppText variant="caption" color="white">
            {t("auth.turnstile.failed")}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  retry: { minHeight: sizes.minTouch, justifyContent: "center" },
})
