# R2 upload list

Every file the seed refers to, as a path relative to the bucket root. The seeder links each one as `${R2_PUBLIC_URL}/<path>`, so the file name and folder must match exactly (lowercase, no spaces).

- Images are `.jpg`. Track ids follow `<artistId>-<slug>`.
- Nothing is uploaded by the seed itself; a file that is not in the bucket shows as a coloured tile with initials (or the video's picture, for a song).
- **Do not upload audio for the new catalog.** Those are commercial recordings: they play through the official YouTube embed, and the seed leaves their `audioUrl` empty.
- Only the original demo tracks (section below) are hosted on R2 as mp3. `durationSec` is approximate in the seed: update it to the real file length when you add real files.

## New catalog (Vietnam, Korea, Japan, China): nothing to upload

The 47 artists, their albums, the regional playlists and every song of the new catalog use the picture YouTube makes of their official videos (`https://i.ytimg.com/vi/<video id>/hq720.jpg`; `mqdefault.jpg` for the few videos without a large one). The choice of video is in `catalog/pictures.ts`: the most played song of the artist, skipping pictures with black bars; the album takes the next one. So no `artists/`, `covers/vietnam/`, `covers/korea/`, `covers/japan/`, `covers/china/`, `covers/albums/` or `covers/playlists/` file of the new catalog is needed, and `backend/local-images/` (generated pictures, not committed) is no longer used.

## Background playlist (Creative Commons)

The playlist **Phát nền – Background** has 8 tracks by Kevin MacLeod (CC BY) that are the only new-catalog tracks hosted in R2: 8 MP3 files, 8 covers, 1 artist picture and 1 playlist cover (18 files). The exact names, the sources and the licence of each track are in [LICENSED_AUDIO.md](./LICENSED_AUDIO.md); check the licence on the source page before uploading.

| Folder               | Files | Type |
| -------------------- | ----: | ---- |
| `audio/`             |     8 | MP3  |
| `covers/background/` |     8 | JPG  |
| `artists/`           |     1 | JPG  |
| `covers/playlists/`  |     1 | JPG  |

## Original mock media (unchanged)

Already referenced by the first seed (Ryan Young, Jessica Gonzalez, ...), including the 7 demo mp3 files. Listed so one document covers the whole bucket. The artwork source files are in `mobile/assets/images`.

| Folder     |  Files |
| ---------- | -----: |
| `artists/` |     12 |
| `audio/`   |      7 |
| `banners/` |      2 |
| `covers/`  |     14 |
| **Total**  | **35** |

### `artists/` (12)

```text
artists/ryan-young.png
artists/jessica-gonzalez.png
artists/jennifer-wilson.png
artists/elizabeth-hall.png
artists/anthony-taylor.png
artists/brian-bailey.png
artists/pedro-moreno.png
artists/william-king.png
artists/avatar-sally-rooney.png
artists/avatar-jason-smith.png
artists/avatar-michael-key.png
artists/user-ashley-scott.png
```

### `audio/` (7)

```text
audio/flower.mp3
audio/shape.mp3
audio/blinding.mp3
audio/levitating.mp3
audio/astronaut.mp3
audio/dynamite.mp3
audio/me.mp3
```

### `banners/` (2)

```text
banners/post-flower.png
banners/post-me.png
```

### `covers/` (14)

```text
covers/track-flower.png
covers/track-shape-of-you.png
covers/track-blinding-lights.png
covers/track-levitating.png
covers/track-astronaut.png
covers/track-dynamite.png
covers/track-me.png
covers/album-me.png
covers/album-magna-nost.png
covers/album-proident.png
covers/playlist-top50-canada.png
covers/playlist-top50-global.png
covers/playlist-top50-trending.png
covers/playlist-favorites.png
```
