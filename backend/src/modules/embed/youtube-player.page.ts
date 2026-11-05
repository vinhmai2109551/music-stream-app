import { createHash } from "node:crypto"

/**
 * The page the mobile app loads in its WebView to play an official YouTube video.
 *
 * `react-native-youtube-iframe` needs a page that speaks its protocol; by default it loads one
 * from the library author's GitHub Pages, which we neither control nor can pin. This is our own
 * copy, so a change there cannot break playback.
 *
 * The protocol, as the library uses it:
 * - The app opens `<page>?data=<encodeURI(JSON)>`; the JSON carries the video id (`videoId_s`),
 *   `start`, `end`, `controls_s`, `rel_s`, `loop_s`, `modestbranding_s`, `preventFullScreen_s`
 *   (1 = fullscreen allowed), `iv_load_policy`, `showClosedCaptions_s`, `cc_lang_pref_s`,
 *   `playerLang`, `color`, `list`, `listType`, `playlist`, `contentScale_s`, `allowWebViewZoom`.
 * - Page to app: `ReactNativeWebView.postMessage(JSON.stringify({ eventType, data }))` with
 *   `playerReady`, `playerStateChange`, `playerError`, `playerQualityChange`,
 *   `playbackRateChange` and `fullScreenChange`.
 * - App to page: a `message` event whose data is `JSON.stringify({ eventName, meta })` with
 *   `playVideo`, `pauseVideo`, `muteVideo`, `unMuteVideo`, `setVolume` and `setPlaybackRate`.
 * - Reading values (`getCurrentTime`, `seekTo`, ...) works by the app running scripts such as
 *   `player.getCurrentTime()` in the page, so `player` must be a global.
 */
const PLAYER_SCRIPT = `
var player;
(function () {
  var params = {};
  try {
    var query = window.location.search;
    var at = query.indexOf("data=");
    if (at >= 0) params = JSON.parse(decodeURIComponent(query.slice(at + 5))) || {};
  } catch (error) {
    params = {};
  }

  function send(eventType, data) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ eventType: eventType, data: data }));
    }
  }

  var scale = Number(params.contentScale_s) || 1;
  var viewport = document.querySelector('meta[name="viewport"]');
  viewport.setAttribute(
    "content",
    "width=device-width, initial-scale=" + scale + (params.allowWebViewZoom ? "" : ", maximum-scale=" + scale)
  );

  function defined(source) {
    var result = {};
    Object.keys(source).forEach(function (key) {
      var value = source[key];
      if (value !== undefined && value !== null && value !== "") result[key] = value;
    });
    return result;
  }

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("player", {
      width: "100%",
      height: "100%",
      videoId: params.videoId_s || "",
      playerVars: defined({
        playsinline: 1,
        rel: params.rel_s,
        loop: params.loop_s,
        controls: params.controls_s,
        fs: params.preventFullScreen_s,
        modestbranding: params.modestbranding_s,
        iv_load_policy: params.iv_load_policy,
        cc_load_policy: params.showClosedCaptions_s,
        cc_lang_pref: params.cc_lang_pref_s,
        hl: params.playerLang,
        color: params.color,
        start: params.start,
        end: params.end,
        list: params.list,
        listType: params.listType,
        playlist: params.playlist,
        origin: window.location.origin
      }),
      events: {
        onReady: function () { send("playerReady"); },
        onStateChange: function (event) { send("playerStateChange", event.data); },
        onError: function (event) { send("playerError", event.data); },
        onPlaybackQualityChange: function (event) { send("playerQualityChange", event.data); },
        onPlaybackRateChange: function (event) { send("playbackRateChange", event.data); }
      }
    });
  };

  var commands = {
    playVideo: function () { player.playVideo(); },
    pauseVideo: function () { player.pauseVideo(); },
    muteVideo: function () { player.mute(); },
    unMuteVideo: function () { player.unMute(); },
    setVolume: function (meta) { player.setVolume(meta.volume); },
    setPlaybackRate: function (meta) { player.setPlaybackRate(meta.playbackRate); }
  };

  function onAppMessage(event) {
    try {
      var message = JSON.parse(event.data);
      var run = commands[message.eventName];
      if (run && player && player.playVideo) run(message.meta || {});
    } catch (error) {
      // Not a message of ours.
    }
  }
  // iOS delivers the app's messages to window, older Android WebViews to document.
  window.addEventListener("message", onAppMessage);
  document.addEventListener("message", onAppMessage);

  function onFullScreenChange() {
    var element =
      document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
    send("fullScreenChange", Boolean(element));
  }
  ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange"].forEach(function (name) {
    document.addEventListener(name, onFullScreenChange);
  });

  var api = document.createElement("script");
  api.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(api);
})();
`

/** The video fills the whole (square) frame the app gives the WebView. */
const PLAYER_STYLE = `
html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
#player { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
`

const sha256 = (text: string): string =>
  `'sha256-${createHash("sha256").update(text).digest("base64")}'`

export interface YouTubePlayerPage {
  html: string
  /** Content-Security-Policy that lets the page run its own script and talk to YouTube only. */
  contentSecurityPolicy: string
}

/**
 * Builds the page and the policy together: the policy names the exact script and style of the
 * page by hash, so no `'unsafe-inline'` is needed and nothing injected into the page could run.
 */
export function buildYouTubePlayerPage(): YouTubePlayerPage {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>YouTube player</title>
<style>${PLAYER_STYLE}</style>
</head>
<body>
<div id="player"></div>
<script>${PLAYER_SCRIPT}</script>
</body>
</html>
`
  const contentSecurityPolicy = [
    "default-src 'none'",
    `script-src ${sha256(PLAYER_SCRIPT)} https://www.youtube.com https://s.ytimg.com`,
    `style-src ${sha256(PLAYER_STYLE)}`,
    "frame-src https://www.youtube.com",
    "img-src https://*.ytimg.com",
    "connect-src https://www.youtube.com",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ")
  return { html, contentSecurityPolicy }
}
