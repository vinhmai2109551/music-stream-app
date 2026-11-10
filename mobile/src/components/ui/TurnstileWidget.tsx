import { useEffect, useMemo, useState } from "react"
import { Linking, Pressable, StyleSheet, View } from "react-native"
import { WebView, type WebViewMessageEvent } from "react-native-webview"
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes"
import { TURNSTILE, type TurnstileAction } from "@/constants/turnstile"
import { sizes } from "@/theme"
import { decideNavigation } from "@/utils/turnstileNavigation"
import { AppText } from "./AppText"
import { pressedStyle } from "./pressed"
import type { TurnstileMessage, TurnstileWidgetProps } from "./TurnstileWidget.types"
import { useTranslation } from "@/i18n"

/**
 * The page the WebView loads. Turnstile has no native SDK, so the official script runs here and
 * posts the token back through `ReactNativeWebView.postMessage`. The page is loaded with
 * `baseUrl = TURNSTILE.baseUrl`, which is the hostname Cloudflare sees and reports to the backend.
 */
function widgetPage(action: TurnstileAction): string {
  const options = JSON.stringify({
    sitekey: TURNSTILE.siteKey,
    action,
    theme: "dark",
    size: "flexible",
  })
  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}#widget{display:flex;justify-content:center}</style>
<script src="${TURNSTILE.scriptUrl}?render=explicit&onload=onTurnstileLoad" async defer></script>
</head>
<body>
<div id="widget"></div>
<script>
  function send(message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); }
  window.onTurnstileLoad = function () {
    var options = ${options};
    options.callback = function (token) { send({ type: "token", token: token }); };
    options["expired-callback"] = function () { send({ type: "expired" }); };
    options["timeout-callback"] = function () { send({ type: "expired" }); };
    options["error-callback"] = function (code) { send({ type: "error", code: String(code) }); return true; };
    options["before-interactive-callback"] = function () { send({ type: "interactive" }); };
    options["after-interactive-callback"] = function () { send({ type: "interactive-done" }); };
    turnstile.render("#widget", options);
  };
  setTimeout(function () { if (!window.turnstile) send({ type: "error", code: "script" }); }, 15000);
</script>
</body>
</html>`
}

function parse(event: WebViewMessageEvent): TurnstileMessage | null {
  try {
    return JSON.parse(event.nativeEvent.data) as TurnstileMessage
  } catch {
    return null
  }
}

/** Cloudflare Turnstile on iOS / Android, rendered in a WebView. Renders nothing when disabled. */
export function TurnstileWidget({ action, onToken }: TurnstileWidgetProps) {
  const { t } = useTranslation()
  // Changing the key reloads the page, which gives a brand-new challenge.
  const [reloadKey, setReloadKey] = useState(0)
  // Why the check failed: Cloudflare's error code, or "script", "timeout", "webview". Null until it does.
  const [failure, setFailure] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)
  // The check is waiting for a tap: that can take as long as the person needs.
  const [interactive, setInteractive] = useState(false)
  const source = useMemo(() => ({ html: widgetPage(action), baseUrl: TURNSTILE.baseUrl }), [action])

  // Never leave the widget spinning for ever: when nothing has come of the check in a while, say so
  // and offer a retry.
  useEffect(() => {
    if (solved || interactive || failure !== null) return
    const timer = setTimeout(() => setFailure("timeout"), TURNSTILE.stallMs)
    return () => clearTimeout(timer)
  }, [reloadKey, solved, interactive, failure])

  if (!TURNSTILE.enabled) return null

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parse(event)
    if (!message) return
    switch (message.type) {
      case "token":
        setSolved(true)
        setFailure(null)
        onToken(message.token)
        return
      case "interactive":
        setInteractive(true)
        return
      case "interactive-done":
        setInteractive(false)
        return
      case "expired":
        setSolved(false)
        onToken(null)
        return
      case "error":
        setSolved(false)
        onToken(null)
        setFailure(message.code ?? "unknown")
        return
    }
  }

  const handleNavigation = (request: ShouldStartLoadRequest) => {
    const decision = decideNavigation(request, TURNSTILE.baseUrl)
    if (decision === "open-externally") void Linking.openURL(request.url)
    return decision === "allow"
  }

  const retry = () => {
    setFailure(null)
    setSolved(false)
    setInteractive(false)
    onToken(null)
    setReloadKey((key) => key + 1)
  }

  return (
    <View>
      <View accessibilityLabel={t("auth.turnstile.label")} style={styles.frame}>
        <WebView
          key={reloadKey}
          source={source}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          onMessage={handleMessage}
          onShouldStartLoadWithRequest={handleNavigation}
          onError={() => {
            onToken(null)
            setFailure("webview")
          }}
          style={styles.webView}
        />
      </View>
      {failure !== null ? (
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={({ pressed }) => [styles.retry, pressedStyle(pressed)]}
        >
          <AppText variant="caption" color="white">
            {t("auth.turnstile.failed")}
          </AppText>
          <AppText variant="caption" color="onDarkMuted">
            {`${t("auth.turnstile.errorCode")}: ${failure}`}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { height: TURNSTILE.height, overflow: "hidden" },
  webView: { flex: 1, backgroundColor: "transparent" },
  retry: { minHeight: sizes.minTouch, justifyContent: "center" },
})
