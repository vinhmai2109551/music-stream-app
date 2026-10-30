/**
 * Images bundled with the app. Everything else (covers, portraits, ...) comes from the API as
 * URLs. Metro needs literal require() calls.
 */
export const images = {
  onboarding: {
    launch: require("../../assets/images/onboarding/launch-bg.png"),
    premium: require("../../assets/images/onboarding/premium-bg.png"),
  },
  playlists: {
    /** Cover of a playlist that has none. */
    fallback: require("../../assets/images/covers/playlist-new.png"),
  },
  user: {
    /** Avatar of a user who has not set one. */
    avatar: require("../../assets/images/artists/user-ashley-scott.png"),
    aboutBanner: require("../../assets/images/artists/about-banner.png"),
  },
}
