/** Static image registry. Metro needs literal require() calls. */
export const images = {
  tracks: {
    flower: require("../../assets/images/covers/track-flower.png"),
    shape: require("../../assets/images/covers/track-shape-of-you.png"),
    blinding: require("../../assets/images/covers/track-blinding-lights.png"),
    levitating: require("../../assets/images/covers/track-levitating.png"),
    astronaut: require("../../assets/images/covers/track-astronaut.png"),
    dynamite: require("../../assets/images/covers/track-dynamite.png"),
    me: require("../../assets/images/covers/track-me.png"),
  },
  artists: {
    ryan: require("../../assets/images/artists/ryan-young.png"),
    jessica: require("../../assets/images/artists/jessica-gonzalez.png"),
    jennifer: require("../../assets/images/artists/jennifer-wilson.png"),
    elizabeth: require("../../assets/images/artists/elizabeth-hall.png"),
    anthony: require("../../assets/images/artists/anthony-taylor.png"),
    brian: require("../../assets/images/artists/brian-bailey.png"),
    pedro: require("../../assets/images/artists/pedro-moreno.png"),
    william: require("../../assets/images/artists/william-king.png"),
  },
  albums: {
    me: require("../../assets/images/covers/album-me.png"),
    magna: require("../../assets/images/covers/album-magna-nost.png"),
    proident: require("../../assets/images/covers/album-proident.png"),
  },
  playlists: {
    top50: require("../../assets/images/covers/playlist-top50-canada.png"),
    global: require("../../assets/images/covers/playlist-top50-global.png"),
    trending: require("../../assets/images/covers/playlist-top50-trending.png"),
    favorites: require("../../assets/images/covers/playlist-favorites.png"),
    fallback: require("../../assets/images/covers/playlist-new.png"),
  },
  categories: {
    indie: require("../../assets/images/covers/category-indie.png"),
  },
  feed: {
    flower: require("../../assets/images/feed/post-flower.png"),
    me: require("../../assets/images/feed/post-me.png"),
  },
  avatars: {
    sally: require("../../assets/images/artists/avatar-sally-rooney.png"),
    jason: require("../../assets/images/artists/avatar-jason-smith.png"),
    michael: require("../../assets/images/artists/avatar-michael-key.png"),
  },
  onboarding: {
    launch: require("../../assets/images/onboarding/launch-bg.png"),
    premium: require("../../assets/images/onboarding/premium-bg.png"),
  },
}
