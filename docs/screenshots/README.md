# Screenshots

The main [README](../../README.md) shows these 20 images in its **Screenshots** section. Put them **in this folder** with **exactly** the file names below (including the extension: `.png` or `.jpg`) and the README picks them up. Until a file exists, its picture shows as a broken image on GitHub, so add all of them before you push.

## How to take them

- **Mobile app (12 files):** PNG, portrait, one screen per file, straight from the phone's screenshot button (no device frame, no editing). A width of 1080 px or more is fine; use the same phone for all of them so they line up in the table. The README shows them 220 px wide.
- **Admin web (4 files) and Swagger (1 file):** JPG of the browser window (about 1440 px wide), signed in as the admin; the README shows the admin pictures 420 px wide and Swagger 85% of the page width.
- **Diagrams (3 files):** PNG exported from the tool the diagram was drawn in, on a white background, wide enough to read (the ERD is shown at 95% of the page width).
- **Account:** sign in with a demo account, never with a real person's. The seeded admin or a throw-away account both work; the name and the picture on Home are visible.
- **Data:** the backend must have the demo catalog (`SEED_ON_START=true` once, see the main README) and the pictures from `backend/local-images/` uploaded, otherwise tracks and artists show coloured tiles.
- **Theme:** mobile screenshots are in **light mode** unless the row says otherwise.
- **Keyboard and toasts:** close the keyboard unless the row says otherwise, and wait until any toast has disappeared.

## The files

### Mobile app

| File                 | Screen          | What it must show                                                                                          |
| -------------------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| `login.png`          | Login           | The login form with the Cloudflare check ticked ("Success!" or the widget) and both fields filled          |
| `register.png`       | Register        | The registration form with the name, email and password fields filled                                      |
| `home.png`           | Home            | Top of Home, signed in: greeting, search bar, region chips, the first suggestions and the charts           |
| `my-playlist.png`    | My playlist     | One of your own playlists open, with the rename, delete, shuffle and play buttons                          |
| `search-results.png` | Search Results  | The results after pressing search, with the tabs All / Tracks / Albums / Artists and the "by mood" section |
| `artist.png`         | Artist Profile  | An artist with followers, the Follow button, top tracks and albums                                         |
| `album.png`          | Album details   | An open album with its track list, shuffle and play                                                        |
| `playlist.png`       | Playlist        | An editorial playlist (for example **Top 50 – Việt Nam**) with its likes and track list                    |
| `player.png`         | Play an Audio   | The player with a track playing: YouTube video or cover, lyrics button, seek bar and the controls          |
| `library.png`        | My Library      | The library with a few liked songs, albums, followed artists and playlists (like some first)               |
| `assistant.png`      | AI assistant    | A conversation where the assistant has found tracks or proposed a playlist (with "Đồng ý / Huỷ")           |
| `premium.png`        | Premium / Plans | The Premium screen with the three plans (open it from the banner at the bottom of Home)                    |

### Admin web and API documentation

| File                  | Screen    | What it must show                                                        |
| --------------------- | --------- | ------------------------------------------------------------------------ |
| `admin-dashboard.jpg` | Dashboard | The totals, the plays and new users charts and the top tracks            |
| `admin-artists.jpg`   | Artists   | The artists table with the search box and the buttons to create and edit |
| `admin-tracks.jpg`    | Tracks    | The tracks table with its filters, paging and the lyrics status column   |
| `admin-add-track.jpg` | Add track | The form with the audio and cover upload (or the YouTube link) filled in |
| `swagger.jpg`         | Swagger   | `http://localhost:3000/api/docs` with the groups of endpoints expanded   |

### Architecture and design

| File               | Diagram        | What it must show                                                                                |
| ------------------ | -------------- | ------------------------------------------------------------------------------------------------ |
| `architecture.png` | 3-tier         | Mobile and admin clients, the NestJS API, PostgreSQL with pgvector, R2 and the external services |
| `use-case.png`     | Use case       | The User and Admin actors with their use cases and the include / extend relations                |
| `erd.png`          | Database (ERD) | Users, artists, albums, tracks, playlists, likes, follows, plays, comments and feed posts        |

## Keeping this list and the README in step

Every picture the main README shows must be in the tables above, and the other way round. If you add a picture to the README, add a row here; if you rename a file, rename it in both places.
