# Screenshots

The main [README](../../README.md) shows these 15 images in its **Screenshots** section. Take them on a phone (or an emulator), save them **in this folder** with **exactly** the file names below, and the README picks them up. Until a file exists, its picture shows as a broken image on GitHub.

## How to take them

- **Format:** PNG, portrait, one screen per file, straight from the phone's screenshot button (no device frame, no editing). A width of 1080 px or more is fine; use the same phone for all of them so they line up in the table.
- **Account:** sign in with a demo account, never with a real person's. The seeded admin or a throw-away account both work; the name and the picture on Home are visible.
- **Data:** the backend must have the demo catalog (`SEED_ON_START=true` once, see the main README) and the pictures from `backend/local-images/` uploaded, otherwise tracks and artists show coloured tiles.
- **Theme:** all screenshots are in **light mode** except `home-dark.png`. Switch the phone's theme for that one and switch it back.
- **Keyboard and toasts:** close the keyboard unless the file says otherwise, and wait until any toast has disappeared.

## The files

| File                  | Screen                 | What it must show                                                                                     |
| --------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `launch.png`          | Launch                 | The first screen after starting the app, signed out                                                   |
| `login.png`           | Login                  | The login form with the Cloudflare check ticked ("Success!" or the widget) and both fields filled     |
| `home.png`            | Home                   | Top of Home, signed in: greeting, search bar, region chips and the first suggestion                   |
| `home-dark.png`       | Home in dark mode      | The same view as `home.png` with the phone in dark mode                                               |
| `playlist.png`        | Playlist Details       | An open playlist (for example **Top 50 – Việt Nam**) with its track list                              |
| `player.png`          | Play an Audio          | The player with a track playing: cover or YouTube video, seek bar and the control buttons             |
| `artist.png`          | Artist Profile         | An artist with followers, the Follow button, tracks and albums                                        |
| `search.png`          | Search                 | The search screen with a few letters typed and the suggestions under the bar (keyboard may stay open) |
| `search-results.png`  | Search Results         | The results after pressing search, with the **Tracks** tab selected                                   |
| `feed.png`            | Feed                   | The feed with at least one post                                                                       |
| `comments.png`        | Comments               | The comments sheet of a post with some comments and one reply showing                                 |
| `library.png`         | My Library             | The library with a few liked songs or albums (like some first)                                        |
| `my-playlists.png`    | My Playlists           | The list of your playlists (create one or two first, for example **Road trip**)                       |
| `premium.png`         | Premium Launch / Plans | The Premium screen with the three plans (open it from the banner at the bottom of Home)               |
| `premium-welcome.png` | Welcome to Premium     | The screen shown after **Subscribe now** (the purchase is simulated)                                  |

## Keeping this list and the README in step

Every picture the main README shows must be in the table above, and the other way round. If you add a picture to the README, add a row here; if you rename a file, rename it in both places.
