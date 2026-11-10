# Music Stream Admin

The admin web of Music Stream: manage the catalog (tracks, artists, albums, feed), the accounts, and
the lyrics of the songs. Vite + React 19 + TypeScript (strict) + [Refine](https://refine.dev) +
Ant Design 5. It only talks to the REST API in `backend/`; it has no database of its own.

| Page        | What it does                                                                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard   | Totals, plays of the last 14 days, new users of the last 14 days, top 5 tracks, DeepL quota                                                                     |
| Bài hát     | List (cover, artist, length, plays, source, lyrics status), search, filters; create / edit / show / delete. A track plays from **YouTube** or an **audio file** |
| Lời bài hát | `/tracks/:id/lyrics`: paste lyrics, **tap-sync** them to the song, fine-tune every line, preview, import / export LRC, see the translation                      |
| Nghệ sĩ     | CRUD, avatar upload, region, the tracks of the artist                                                                                                           |
| Album       | CRUD, cover upload, choose and order the tracks                                                                                                                 |
| Người dùng  | Search, filter, ban / unban, change role, delete. No actions on your own account                                                                                |
| Feed        | List, create, delete posts                                                                                                                                      |
| Cài đặt     | Account, dark mode, API address, DeepL quota                                                                                                                    |

The interface is in Vietnamese, with a dark / light switch, and works on a phone (the sidebar becomes
a drawer).

## Run it

You need the API first (from the repository root): `docker compose up -d --build db api`.

```bash
cd admin
cp .env.example .env     # VITE_API_URL, VITE_TURNSTILE_SITE_KEY
npm install
npm run dev              # http://localhost:5173
```

### With Docker

From the repository root, the `admin` service builds the site and serves it with nginx:

```bash
docker compose up -d --build            # db + api + admin
```

Admin: <http://localhost:5173> · API: <http://localhost:3000/api> · Swagger: <http://localhost:3000/api/docs>.

`VITE_API_URL` and `VITE_TURNSTILE_SITE_KEY` are baked into the bundle **at build time** (a static
site cannot read the environment of its container). The browser, not Docker, calls the API, so the
value is the address of the API as the browser sees it. To build for another address:

```bash
ADMIN_API_URL=https://api.example.com/api ADMIN_TURNSTILE_SITE_KEY=0x4AAA... \
  docker compose up -d --build admin
```

(or put those two variables in a `.env` file next to `docker-compose.yml`). The address of the admin
web must be listed in `CORS_ORIGINS` of `backend/.env` (`http://localhost:5173` is there by default).

## Logging in

Only accounts with the `ADMIN` role get in; any other account is told "Không có quyền admin".

The seed creates one: with `SEED_ON_START=true` the API makes the admin account from
`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `backend/.env` (by default `admin@musicstream.local`)
when it starts. Set `SEED_ON_START=true` for one start, then back to `false`. To make an existing
user an admin, use another admin (Người dùng → Cấp admin) or SQL: `UPDATE "User" SET role = 'ADMIN' WHERE email = '...'`.

- **Turnstile.** When `backend/.env` has `TURNSTILE_SECRET_KEY`, the login needs a Turnstile token.
  Put the matching **Site Key** in `VITE_TURNSTILE_SITE_KEY` and the widget appears (Cloudflare's test
  pair `1x00000000000000000000AA` / `1x0000000000000000000000000000000AA` always passes). With the
  key empty there is no widget; the API then must not have a secret key either.
  If you set `TURNSTILE_ALLOWED_HOSTNAMES`, add the hostname of the admin web to it.
- **Banned accounts** cannot log in or refresh (403 with a clear message) and their open sessions
  end at once. An admin cannot ban, demote or delete themselves.
- **Sessions.** The access token lives 15 minutes; the refresh token rotates on every use. Several
  requests that meet an expired token together share **one** refresh (a second one would present an
  already used token and log you out). If the refresh is refused you are sent to the login page.

## Uploading files

Covers, avatars and audio go **straight to Cloudflare R2** with a presigned URL (the API checks the
type and size, the browser sends the bytes with `PUT`). So:

1. `backend/.env` needs the `R2_*` settings, or `POST /uploads/presign` answers `503`.
2. The bucket needs a CORS rule that lets the admin web `PUT`:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Limits (checked in the browser first): audio mp3 / m4a / aac up to 20 MB, images jpeg / png / webp up
to 5 MB. The length of an audio file is read from the file itself.

The API only accepts cover / audio / picture URLs that point into the bucket (`R2_PUBLIC_URL`), so
even a YouTube track needs an uploaded cover. Editing a track, artist or album sends **only the
fields you changed**: the demo data has pictures outside the bucket, and sending one back unchanged
would be refused.

## The lyrics editor

Open it from the lyrics button of a track (`/tracks/:id/lyrics`). The lyrics are saved with the source
`manual`: **only save lyrics you wrote or have the right to store.**

1. **Lời** - paste the text (one line per line, a blank line between verses), pick the language, _Áp dụng_.
2. **Đồng bộ (Tap-sync)** - play the song and mark the start of every line.

   | Key         | Does                                                 |
   | ----------- | ---------------------------------------------------- |
   | `Space`     | Marks the start of the next line (it is highlighted) |
   | `Backspace` | Takes back the last mark                             |
   | `R`         | Starts over                                          |
   | `←` / `→`   | Moves the song by 3 seconds                          |

   The buttons do the same. Blank lines are never tapped: they get the time of the next line. A mark
   must be later than the one before it. When every line has a mark the song is synced.

3. **Tinh chỉnh** - a table of `mm:ss.xx | text`: type a time, `−0.1s` / `+0.1s`, play from a line,
   edit the text. _Xem trước_ runs the lyrics along with the music like the app does.
4. **Nhập LRC / Xuất LRC** - `[mm:ss.xx]text`; repeated tags, `[offset:]` and the info tags are understood.
5. **Xem bản dịch** - the translation (DeepL) of the **saved** lyrics next to the original. A language
   is translated once, then served from the database; the first time spends DeepL allowance.
6. **Lưu lời** - checks first: timings rising, as many as lines, none negative, no more than 500 lines.

The player is the audio file when the track has one, else the YouTube IFrame API. Some videos do not
allow embedding; then use an audio file.

## Scripts

| Script              | What it does                                                                       |
| ------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload on port 5173                                            |
| `npm run build`     | Type-check, then build to `dist/`                                                  |
| `npm run typecheck` | `tsc -b`                                                                           |
| `npm run lint`      | ESLint (and Prettier as a rule)                                                    |
| `npm test`          | Vitest: the pure logic (LRC, tap-sync, upload rules, data provider, token refresh) |
| `npm run format`    | Prettier                                                                           |

> On Windows run them from PowerShell or cmd. Git Bash can hand Node a path with a different drive
> letter case (`t:` / `T:`), which makes Vitest load itself twice and fail with "failed to find the runner".

## How it is built

```text
admin/src/
├── api/          http.ts (fetch + token refresh), tokens.ts, upload.ts, resources.ts, types.ts
├── providers/    dataProvider, authProvider, i18nProvider (Refine)
├── layout/       header, title, session watcher
├── components/   image / audio upload, searchable selects, track list editor, tags
├── pages/        dashboard, tracks, lyrics, artists, albums, users, feed, settings, login
├── lib/          pure logic: lrc, tap-sync, time, youtube, lyrics-text / -validation, diff
└── theme/        dark / light mode
```

- **Data provider.** The lists of the API are paged with `page` / `limit` and answer
  `{ items, total }`, which is what Refine's table wants. `resources.ts` holds, for each resource, its
  path, its filters and the field names: the API answers `cover`, `duration`, `image` but accepts
  `coverUrl`, `durationSec`, `imageUrl`, and refuses a body with any unknown field.
- **No `console.log`, no `any`** (ESLint enforces both).

## Known limits

- The tokens are kept in `localStorage`; an XSS bug would expose them. There is no Content Security
  Policy in `nginx.conf` because its allowed origins (API, R2, YouTube, Cloudflare) depend on where you deploy.
- The tracks table asks the API for the lyrics status of the page it shows (one extra call per page).
- The first load is about 1 MB (320 KB gzipped); the dashboard (charts) and the lyrics editor are
  loaded when they are opened.
- The interactive screens (tap-sync with a real song, uploads to R2) depend on the browser, the
  bucket's CORS rule and the video's embedding settings; the logic behind them is unit tested, the
  screens themselves are not.
