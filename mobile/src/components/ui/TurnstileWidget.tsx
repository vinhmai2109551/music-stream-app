import { useMemo, useState } from "react"
import { Linking, Pressable, StyleSheet, View } from "react-native"
import { WebView, type WebViewMessageEvent } from "react-native-webview"
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes"
import { copy } from "@/constants/copy"
import { TURNSTILE, type TurnstileAction } from "@/constants/turnstile"
import { spacing } from "@/theme"
import { AppText } from "./AppText"
import { pressedStyle } from "./pressed"
import type { TurnstileMessage, TurnstileWidgetProps } from "./TurnstileWidget.types"

const text = copy.auth.turnstile
const CLOUDFLARE_ORIGIN = "https://challenges.cloudflare.com"

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
  // Changing the key reloads the page, which gives a brand-new challenge.
  const [reloadKey, setReloadKey] = useState(0)
  const [failed, setFailed] = useState(false)
  const source = useMemo(() => ({ html: widgetPage(action), baseUrl: TURNSTILE.baseUrl }), [action])

  if (!TURNSTILE.enabled) return null

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parse(event)
    if (!message) return
    if (message.type === "token") {
      setFailed(false)
      onToken(message.token)
      return
    }
    onToken(null)
    if (message.type === "error") setFailed(true)
  }

  // Only the widget page and Cloudflare may load inside the WebView; the widget's own links
  // (privacy, terms) open in the system browser instead of replacing the widget.
  const handleNavigation = (request: ShouldStartLoadRequest) => {
    const { url } = request
    if (
      url.startsWith(TURNSTILE.baseUrl) ||
      url.startsWith(CLOUDFLARE_ORIGIN) ||
      url === "about:blank"
    ) {
      return true
    }
    if (request.isTopFrame !== false && /^https?:/.test(url)) void Linking.openURL(url)
    return false
  }

  const retry = () => {
    setFailed(false)
    onToken(null)
    setReloadKey((key) => key + 1)
  }

  return (
    <View>
      <View accessibilityLabel={text.label} style={styles.frame}>
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
            setFailed(true)
          }}
          style={styles.webView}
        />
      </View>
      {failed ? (
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={({ pressed }) => [styles.retry, pressedStyle(pressed)]}
        >
          <AppText variant="caption" color="white">
            {text.failed}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { height: TURNSTILE.height, overflow: "hidden" },
  webView: { flex: 1, backgroundColor: "transparent" },
  retry: { paddingVertical: spacing.xs },
})
