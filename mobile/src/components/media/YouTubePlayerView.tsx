import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react"
import { StyleSheet, View, type LayoutChangeEvent } from "react-native"
import type { WebViewProps } from "react-native-webview"
import YoutubeIframe, {
  type InitialPlayerParams,
  type YoutubeIframeProps,
  type YoutubeIframeRef,
} from "react-native-youtube-iframe"
import { YOUTUBE_MIN_SIZE } from "@/constants/player"
import { usePlayerStore } from "@/store/playerStore"
import { colors, radius, shadows, sizes } from "@/theme"
import { youTubeSource } from "@/utils/youtubeSource"

// The package types its component with React.VFC, which React 19 no longer has.
const Player = YoutubeIframe as ComponentType<YoutubeIframeProps>

/**
 * Fixes two things in the page the player runs in (hosted by the library's author):
 * - it lays the video out 16:9, so the player is made to fill the square;
 * - its play / pause / mute handler is out of date: it expects the plain text "playVideo" while the
 *   library sends JSON, so those commands would never reach the video.
 */
const PLAYER_PAGE_SCRIPT = `
  var style = document.createElement("style");
  style.textContent = ".container { height: 100vh !important; padding-bottom: 0 !important; }";
  document.head.appendChild(style);
  window.addEventListener("message", function (event) {
    try {
      var message = JSON.parse(event.data);
      var commands = { playVideo: "playVideo", pauseVideo: "pauseVideo", muteVideo: "mute", unMuteVideo: "unMute" };
      var command = commands[message.eventName];
      if (command && window.player) window.player[command]();
    } catch (error) {}
  });
  true;
`

const WEB_VIEW_PROPS: WebViewProps = {
  injectedJavaScript: PLAYER_PAGE_SCRIPT,
  onError: () => youTubeSource.handleLoadFailure(),
  onHttpError: () => youTubeSource.handleLoadFailure(),
}

/**
 * The official YouTube player of the current track, in the place of the cover.
 * It stays square, at least 200 x 200 and never covered, as YouTube requires of an embedded
 * player. `youTubeSource` decides what it plays; this view only draws it and reports back.
 */
export function YouTubePlayerView() {
  const view = useSyncExternalStore(youTubeSource.subscribeView, youTubeSource.getViewState)
  const playerRef = useRef<YoutubeIframeRef>(null)
  const [size, setSize] = useState(0)
  // A new player starts at the beginning, so it is told where the track was left.
  const [params] = useState<InitialPlayerParams>(() => ({
    controls: false,
    rel: false,
    preventFullScreen: true,
    start: Math.floor(usePlayerStore.getState().progress),
  }))

  const measured = size > 0
  useEffect(() => {
    const player = playerRef.current
    if (!measured || !player) return
    youTubeSource.attach(player)
    return () => youTubeSource.detach()
  }, [measured, view.instance])

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setSize(Math.floor(Math.min(width, height)))
  }

  return (
    <View style={styles.shadow}>
      <View accessibilityLabel="Video player" style={styles.frame} onLayout={onLayout}>
        {measured && view.videoId && (
          <Player
            key={view.instance}
            ref={playerRef}
            width={size}
            height={size}
            videoId={view.videoId}
            play={view.playing}
            initialPlayerParams={params}
            webViewProps={WEB_VIEW_PROPS}
            onReady={() => youTubeSource.handleReady()}
            onChangeState={(state) => youTubeSource.handleState(state)}
            onError={(error) => youTubeSource.handleError(error)}
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shadow: {
    width: "100%",
    maxWidth: sizes.playerArtworkMax,
    maxHeight: "100%",
    minWidth: YOUTUBE_MIN_SIZE,
    minHeight: YOUTUBE_MIN_SIZE,
    aspectRatio: 1,
    alignSelf: "center",
    ...shadows.card,
  },
  frame: {
    flex: 1,
    overflow: "hidden",
    borderRadius: radius.card,
    backgroundColor: colors.black,
  },
})
