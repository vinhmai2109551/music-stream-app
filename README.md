<div align="center">

# 🎵 Music Stream

**A cross-platform music streaming app built with Expo, React Native and TypeScript.**

Final project for the **Mobile Programming** course — Industrial University of Ho Chi Minh City (IUH)

![Expo](https://img.shields.io/badge/Expo-SDK%2058-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-lightgrey)
[![CI](https://github.com/vinhmai2109551/music-stream-app/actions/workflows/ci.yml/badge.svg)](https://github.com/vinhmai2109551/music-stream-app/actions/workflows/ci.yml)

</div>

---

## Table of Contents

- [🎵 Music Stream](#-music-stream)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Screens \& Features](#screens--features)
  - [Screenshots](#screenshots)
    - [📱 Mobile app](#-mobile-app)
    - [🖥️ Admin web](#️-admin-web)
    - [📘 API documentation](#-api-documentation)
    - [🧩 Architecture and design](#-architecture-and-design)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Run on a device](#run-on-a-device)
  - [Backend](#backend)
  - [Admin web](#admin-web)
  - [Languages and translation (DeepL)](#languages-and-translation-deepl)
  - [Playback architecture](#playback-architecture)
  - [Release builds (EAS)](#release-builds-eas)
  - [Known limitations](#known-limitations)
  - [Testing and CI](#testing-and-ci)
  - [Available Scripts](#available-scripts)
  - [Branching Workflow](#branching-workflow)
  - [Project Management](#project-management)
  - [Team](#team)
  - [License](#license)

## Overview

**Music Stream** is a mobile music streaming application that lets users discover music, follow artists, browse albums and playlists, play tracks with a full-featured player, and manage a personal library. It is developed as a final project for the Mobile Programming course at IUH, with a focus on mobile-first UI, clean architecture and smooth performance on both Android and iOS.

## Screens & Features

The app consists of the 13 screens of the design:

| #   | Screen                 | Key features                                                                                                                 |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Launch**             | Branded welcome screen with the app tagline; leads to login or register (login has a Cloudflare check)                       |
| 2   | **Home**               | Greeting, search entry, region filter, suggestions, charts, trending albums, popular artists                                 |
| 3   | **Playlist Details**   | Track list, like / unlike, play, add a track to one of your playlists (the album and artist pages work the same way)         |
| 4   | **Play an Audio**      | Play / pause, seek, next / previous, shuffle, repeat (off / all / one), like, comments; official YouTube video or audio file |
| 5   | **Artist Profile**     | Bio, follower count, top tracks, albums, follow / unfollow                                                                   |
| 6   | **Search**             | Suggestions while typing, recent searches (add / remove / clear)                                                             |
| 7   | **Search Results**     | Tabs All / Tracks / Albums / Artists                                                                                         |
| 8   | **Feed**               | Posts of tracks shared by artists, endless scrolling, pull to refresh, likes and comment counts                              |
| 9   | **Comments**           | Comments of a track or a post: newest first, endless scrolling, replies (one level), likes, writing                          |
| 10  | **My Library**         | Liked songs, albums, followed artists and a way into the user's playlists                                                    |
| 11  | **My Playlists**       | The user's playlists and a button to create one                                                                              |
| 12  | **Premium Launch**     | Premium offer reached from a banner on Home (hidden once Premium)                                                            |
| 13  | **Subscription Plans** | Three plans and a welcome screen; the purchase is simulated (see [Known limitations](#known-limitations))                    |

**Cross-cutting features**

- Two playback sources: audio files from our own storage (`expo-audio`) and official YouTube videos (embedded player) — see [Playback architecture](#playback-architecture)
- Region filter on Home (Vietnam, K-Pop, J-Pop, C-Pop)
- **AI assistant** (`/assistant`), opened from the mascot button in the middle of the tab bar or from the account sheet: a chat whose answer streams in word by word (Server-Sent Events through `expo/fetch`), with a Stop button, the tracks / artists / playlists it finds shown as the app's own rows, "Đồng ý / Huỷ" before it changes your library, and a list of past conversations (open, start new, delete). It is hidden when the server answers `503` (no key, or switched off) — see [Backend](#backend)
- **Search by meaning and recommendations**: the search results add a "Theo tâm trạng" section with tracks found by meaning ("nhạc buồn ngày mưa"), Home adds "Dành cho bạn" and "Vì bạn đã nghe", and the Player lists "Bài tương tự". Each section is hidden when the server answers `503` (no embedding key) — see [Backend](#backend)
- **Five languages** (Vietnamese, English, Korean, Japanese, Simplified Chinese): the app follows the phone, the choice is made in **Account → Language** and applied at once; the texts are translated with DeepL while developing — see [Languages and translation](#languages-and-translation-deepl)
- **Lyrics and their translation** in the Player: the original lyrics, a "Dịch sang …" button, the translation beside the original or alone, labelled "Bản dịch tự động"
- Persistent library state (likes, follows, playlists, recent searches) via Zustand + AsyncStorage
- Reusable UI kit: `AppText`, `Button`, `Chip`, `IconButton`, `SearchBar`, `BottomSheet`, `Toast`, `Skeleton`, `EmptyState`
- Centralised design tokens (colors, typography, spacing, radius, shadows)
- File-based navigation with Expo Router and typed routes
- Light and dark theme that follows the phone's setting; every text colour reaches WCAG AA contrast in both (checked by a test)
- Sign-in protected by Cloudflare Turnstile, rate limits per endpoint group, and refresh tokens that rotate with a short grace period (see [Behaviour worth knowing](#behaviour-worth-knowing))
- Plays are counted once per user and track in a time window; comments are read page by page
- Tested: Jest unit and component tests for the app, Jest end-to-end tests for the API against a real PostgreSQL, and a GitHub Actions workflow that runs them (see [Testing and CI](#testing-and-ci))

> **Note:** The 13 screens are in place (Launch, Home, Playlist / Album / Artist details, Player, Search with results, Feed with comments, Library, My Playlists, Premium launch and plans). Remaining work is tracked in [Project Management](#project-management).

## Screenshots

### 📱 Mobile app

_Built with Expo and React Native for Android and iOS, with a light and dark theme that follows the phone and five languages._

<table>
  <tr><th align="center" width="25%">Login</th><th align="center" width="25%">Register</th><th align="center" width="25%">Home</th><th align="center" width="25%">My playlist</th></tr>
  <tr><td align="center"><img src="docs/screenshots/login.png" width="220" alt="Login"/></td><td align="center"><img src="docs/screenshots/register.png" width="220" alt="Register"/></td><td align="center"><img src="docs/screenshots/home.png" width="220" alt="Home"/></td><td align="center"><img src="docs/screenshots/my-playlist.png" width="220" alt="My playlist"/></td></tr>
  <tr><td align="center"><em>Email and password, protected by Cloudflare Turnstile</em></td><td align="center"><em>Create an account in a few seconds</em></td><td align="center"><em>Greeting, region chips, suggestions and charts</em></td><td align="center"><em>Your own playlist: rename, delete, shuffle and play</em></td></tr>
  <tr><th align="center" width="25%">Search results</th><th align="center" width="25%">Artist profile</th><th align="center" width="25%">Album</th><th align="center" width="25%">Playlist</th></tr>
  <tr><td align="center"><img src="docs/screenshots/search-results.png" width="220" alt="Search results"/></td><td align="center"><img src="docs/screenshots/artist.png" width="220" alt="Artist profile"/></td><td align="center"><img src="docs/screenshots/album.png" width="220" alt="Album"/></td><td align="center"><img src="docs/screenshots/playlist.png" width="220" alt="Playlist"/></td></tr>
  <tr><td align="center"><em>Tabs All / Tracks / Albums / Artists plus "by mood" results</em></td><td align="center"><em>Followers, Follow button, top tracks and albums</em></td><td align="center"><em>Track list, shuffle and play</em></td><td align="center"><em>Chart playlist with likes and play</em></td></tr>
  <tr><th align="center" width="25%">Player</th><th align="center" width="25%">My library</th><th align="center" width="25%">AI assistant</th><th align="center" width="25%">Premium</th></tr>
  <tr><td align="center"><img src="docs/screenshots/player.png" width="220" alt="Player"/></td><td align="center"><img src="docs/screenshots/library.png" width="220" alt="My library"/></td><td align="center"><img src="docs/screenshots/assistant.png" width="220" alt="AI assistant"/></td><td align="center"><img src="docs/screenshots/premium.png" width="220" alt="Premium"/></td></tr>
  <tr><td align="center"><em>Official YouTube video, lyrics, seek, shuffle and repeat</em></td><td align="center"><em>Liked songs, albums, followed artists and playlists</em></td><td align="center"><em>Streaming chat that finds tracks and builds playlists</em></td><td align="center"><em>Plans and a simulated subscription</em></td></tr>
</table>

### 🖥️ Admin web

_Vite + React + Refine + Ant Design, used by the administrator to manage artists, albums, tracks, feed posts and users._

<table>
  <tr><th align="center" width="50%">Dashboard</th><th align="center" width="50%">Artists</th></tr>
  <tr><td align="center"><img src="docs/screenshots/admin-dashboard.jpg" width="420" alt="Dashboard"/></td><td align="center"><img src="docs/screenshots/admin-artists.jpg" width="420" alt="Artists"/></td></tr>
  <tr><td align="center"><em>Users, tracks, plays and charts at a glance</em></td><td align="center"><em>List, search, create and edit artists</em></td></tr>
  <tr><th align="center" width="50%">Tracks</th><th align="center" width="50%">Add a track</th></tr>
  <tr><td align="center"><img src="docs/screenshots/admin-tracks.jpg" width="420" alt="Tracks"/></td><td align="center"><img src="docs/screenshots/admin-add-track.jpg" width="420" alt="Add a track"/></td></tr>
  <tr><td align="center"><em>Manage the catalog with filters and paging</em></td><td align="center"><em>Upload audio and cover to Cloudflare R2 or link a YouTube video</em></td></tr>
</table>

### 📘 API documentation

_Every endpoint of the NestJS API is documented with Swagger at `http://localhost:3000/api/docs`._

<p align="center"><img src="docs/screenshots/swagger.jpg" width="85%" alt="Swagger"/></p>

### 🧩 Architecture and design

<table>
  <tr><th align="center" width="50%">3-tier architecture</th><th align="center" width="50%">Use case diagram</th></tr>
  <tr><td align="center"><img src="docs/screenshots/architecture.png" width="420" alt="3-tier architecture"/></td><td align="center"><img src="docs/screenshots/use-case.png" width="420" alt="Use case diagram"/></td></tr>
  <tr><td align="center"><em>Mobile and admin clients, NestJS API, PostgreSQL + pgvector and external services</em></td><td align="center"><em>User and Admin actors with include / extend relations</em></td></tr>
</table>

<p align="center"><b>Database (ERD)</b><br/><img src="docs/screenshots/erd.png" width="95%" alt="ERD"/><br/><em>Core tables: users, artists, albums, tracks, playlists, likes, follows, plays, comments and feed posts</em></p>

## Tech Stack

| Area         | Technology                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | [Expo](https://expo.dev) SDK 58, React Native 0.88, React 19                                                                                                                          |
| Language     | TypeScript                                                                                                                                                                            |
| Navigation   | Expo Router (file-based, typed routes)                                                                                                                                                |
| State        | Zustand with `persist` middleware                                                                                                                                                     |
| Storage      | `@react-native-async-storage/async-storage`                                                                                                                                           |
| Audio        | `expo-audio` (files from R2), `react-native-youtube-iframe` + `react-native-webview` (YouTube)                                                                                        |
| Animation    | React Native Reanimated, Gesture Handler, Worklets                                                                                                                                    |
| UI & visuals | `expo-image`, `expo-linear-gradient`, `expo-blur`, `lucide-react-native`, `react-native-svg`                                                                                          |
| Typography   | Inter via `@expo-google-fonts/inter`                                                                                                                                                  |
| Code quality | ESLint (`eslint-config-expo`), Prettier, `tsc`                                                                                                                                        |
| Testing      | Jest (`jest-expo`) and React Native Testing Library for the app; Jest and supertest for the API                                                                                       |
| Backend      | NestJS 12 (ESM), Prisma 7, PostgreSQL 16 with pgvector, Cloudflare R2 for files                                                                                                       |
| Search & AI  | Vectors in pgvector (`gemini-embedding-2`, 768 numbers) for search by meaning and recommendations; the assistant is Gemini (Interactions API). Both sit behind provider-neutral ports |
| Languages    | `i18next`, `react-i18next`, `expo-localization` in the app; DeepL (`deepl-node`) from the backend only                                                                                |
| Admin web    | Vite, React 19, [Refine](https://refine.dev) with Ant Design 5, Recharts, Vitest (`admin/`)                                                                                           |
| Security     | Cloudflare Turnstile on login, `@nestjs/throttler` rate limits, JWT access + rotating refresh tokens, banning of accounts                                                             |
| Build & CI   | GitHub Actions (`.github/workflows/ci.yml`), EAS Build (`mobile/eas.json`)                                                                                                            |

## Project Structure

```text
music-stream-app/
├── mobile/                  # Expo app (this is what runs on the phone)
│   ├── assets/images/       # App icons, covers, artists, feed and onboarding art
│   ├── src/
│   │   ├── app/             # Expo Router routes (each file is a screen)
│   │   ├── components/      # ui/ (base components) and media/ (track rows, player, ...)
│   │   ├── constants/       # App-wide constants
│   │   ├── data/            # Catalog, images and mock data
│   │   ├── hooks/           # Custom hooks (fonts, toast, audio engine, ...)
│   │   ├── i18n/            # i18next setup; locales/vi.json is the source of every text
│   │   ├── __tests__/       # Jest tests, mocks and helpers (not part of the routes)
│   │   ├── store/           # Zustand stores (player, library)
│   │   ├── theme/           # Design tokens
│   │   ├── types/           # Shared TypeScript types
│   │   └── utils/           # Helpers (formatTime, formatCount, ...)
│   ├── .env.example         # Copy to .env and fill in
│   ├── app.json             # Expo configuration (name, ids, version, theme)
│   ├── eas.json             # EAS Build profiles: development, preview, production
│   └── package.json
├── backend/                 # NestJS API: modular monolith + Prisma + PostgreSQL
├── admin/                   # Admin web: Vite + React + Refine + Ant Design (see "Admin web")
├── docker-compose.yml       # PostgreSQL + API (with a healthcheck) + the admin web
├── docs/screenshots/        # Screenshots used by this README
├── .github/workflows/       # CI
└── README.md
```

Each part has its own `package.json` and `package-lock.json` (no npm workspaces), so install and run commands are executed inside the part's folder.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (LTS)
- npm
- [Expo Go](https://expo.dev/go) installed on your Android or iOS device (the phone and computer must be on the same network)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/vinhmai2109551/music-stream-app.git
cd music-stream-app/mobile

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env

# 4. Start the development server
npx expo start
```

### Run on a device

1. Run `npx expo start` inside the `mobile/` folder.
2. Open **Expo Go** on your phone.
   - **Android:** scan the QR code from within Expo Go.
   - **iOS:** scan the QR code with the Camera app.
3. The app loads and hot-reloads as you edit the code.

Alternatively, press `a` (Android emulator), `i` (iOS simulator) or `w` (web) in the terminal.

## Backend

The API is a **modular monolith**: one deployable NestJS app, one PostgreSQL database, but every
domain is a self-contained module that owns its tables and exposes a small public API.

```mermaid
flowchart LR
  Mobile[Mobile app] --> API
  Admin[Admin web] --> API
  subgraph API[NestJS API]
    direction TB
    admin --> users
    admin --> auth
    admin --> tracks
    admin --> artists
    admin --> albums
    admin --> lyrics
    auth --> users
    artists --> follows
    artists --> uploads
    tracks --> artists
    tracks --> likes
    tracks --> uploads
    albums --> tracks
    albums --> artists
    albums --> likes
    albums --> uploads
    playlists --> tracks
    playlists --> likes
    playlists --> users
    comments --> users
    users --> uploads
    embeddings --> tracks
    embeddings --> artists
    search --> embeddings
    search --> tracks
    search --> artists
    recommendations --> embeddings
    recommendations --> tracks
    recommendations --> likes
    feed --> tracks
    feed --> artists
    feed --> comments
    lyrics --> tracks
    lyrics --> translation
  end
  API --> DB[(PostgreSQL)]
  API -.-> R2[(Cloudflare R2)]
```

- An arrow means "uses the public API of" (`modules/<name>/index.ts`). The graph has no cycles.
- ESLint rejects imports that reach into another module's internals.
- Run it with Docker (applies the migrations on start; loads the demo data when `SEED_ON_START=true`, see below):

```bash
cp backend/.env.example backend/.env   # then edit the secrets
docker compose up -d --build
```

API: `http://localhost:3000/api` · Swagger: `http://localhost:3000/api/docs` · health: `http://localhost:3000/api/health`. The docs list every route, so in production mode (which the Docker image runs in) they are off unless `SWAGGER_ENABLED=true` is set in `backend/.env`; in production the API also refuses to start without `CORS_ORIGINS`, or with a `JWT_SECRET` shorter than 32 characters or still `change-me…`.

`backend/.env.example` ships `SEED_ON_START=false`, which is what production wants: with `true` every start overwrites the demo artists, tracks and playlists with the versions in the code and recreates the admin account. For a first run (or development) set it to `true`: the demo catalog and the admin account (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `backend/.env`) are created, then set it back to `false`.

`GET /api/health` answers `200 { status: "ok", database: "up" }` when the API reaches its database and `503 { status: "error", database: "down" }` otherwise (no login, not rate limited). The `api` service of `docker-compose.yml` uses it as its healthcheck (`docker compose ps` shows `healthy`); on a hosting platform point the health check path at it.

Without Docker for the API (database still in Docker): `docker compose up -d db`, then in `backend/`:
`npm install`, `npm run prisma:migrate`, `npm run prisma:seed`, `npm run start:dev`.

**The database image is `pgvector/pgvector:pg16`** (PostgreSQL 16 plus the `vector` extension that semantic search uses; CI uses the same image). The first migration of this feature runs `CREATE EXTENSION vector`, so a host that does not ship pgvector cannot run it. If you already have a volume made by the older `postgres:16-alpine` image, the data is kept (same major version, same volume), but that image was Alpine and this one is Debian, whose text sorting differs, so rebuild the indexes once after switching:

```bash
docker compose pull db && docker compose up -d db
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "REINDEX DATABASE $POSTGRES_DB"'
cd backend && npm run prisma:deploy     # applies the pgvector migration
```

(Back up first if the data matters: `docker compose exec db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > backup.dump`.) A fresh volume needs none of this.

**Text embeddings** (used by the semantic features that follow) need `EMBEDDING_PROVIDER=gemini` and an `EMBEDDING_API_KEY` in `backend/.env` (a key from [Google AI Studio](https://aistudio.google.com/apikey); the model is `gemini-embedding-2`, 768-number vectors). Without them those features answer `503` and are hidden in the app; everything else works. `EMBEDDING_PROVIDER=fake` is a deterministic offline stand-in for development and tests, refused in production. A new or edited track or artist gets its vector in the background; to catch up on everything (after the first seed, after `npm run ai:enrich`, or when the model changes) run `npm run ai:embed` in `backend/` (`-- --force` makes every vector again). It only does the work that is left, 64 texts at a time, retries a rate limit for a few seconds, and is safe to run again. Google's free tier allows 100 texts a minute, so a first run over a whole catalog can stop with a 429: run it again a minute later and it continues where it stopped. Content sent through Google's free tier may be used by Google to improve its products.

```mermaid
flowchart LR
  subgraph Index["Indexing: ai:embed, and in the background when a track changes"]
    T["Track or artist: title, artist, genres, mood, tags, description (never lyrics)"] --> X["One text per row (embedding-text.ts)"]
    X --> H{"Text or model changed?"}
    H -- no --> S["Skipped"]
    H -- yes --> E["Gemini embedding: 768 numbers"]
    E --> V[("pgvector: HNSW index, cosine")]
  end
  subgraph Read["Reading"]
    Q["Question: nhạc buồn ngày mưa"] --> QE["Embed the question"]
    QE --> N["Nearest vectors"]
    V --> N
    Q --> K["Search by words (searchName, no accents)"]
    N --> F["Reciprocal rank fusion"]
    K --> F
    F --> R["Search by meaning"]
    V --> TV["Taste vector of liked and played tracks, then MMR"]
    TV --> REC["For you, Because you listened, Similar tracks"]
  end
```

**Help texts for the assistant** live in `backend/src/modules/ai/knowledge/*.md` (what the app does and does not do; edit them like any document). `npm run ai:embed` also cuts them into chunks of about 500 characters (50 overlap, never across a heading), stores one vector per chunk in `KnowledgeChunk` and, on the next run, remakes only the chunks whose text changed. `KNOWLEDGE_DIR` points to another folder. Write only what is true of the app: the assistant quotes these files as its answer.

**The AI assistant** (`backend/src/modules/ai`) is a chat with a language model (Gemini through the Interactions API, behind a provider-neutral `LlmClient`). It needs `GEMINI_API_KEY` (or `EMBEDDING_API_KEY`, one Google AI Studio key does both); without a key every `/api/ai/*` endpoint answers `503` and the app hides the feature. The key stays on the server.

| Endpoint                                  | What it does                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `POST /api/ai/conversations`              | New conversation (an empty one is given again; at most 50 per user, then `409`)      |
| `GET /api/ai/conversations`               | The user's conversations, most recently used first                                   |
| `GET /api/ai/conversations/:id/messages`  | What was said (the latest 500)                                                       |
| `DELETE /api/ai/conversations/:id`        | Deletes it (`409` while an answer is being written)                                  |
| `POST /api/ai/conversations/:id/messages` | Sends `{ text }` (1 to 2000 characters) and streams the answer as Server-Sent Events |
| `GET /api/ai/usage`                       | `{ used, limit }` of today                                                           |

The answer is `text/event-stream`: `text_delta` `{ text }` pieces, then `done` `{ messageId, truncated }` or `error` `{ code, message }`. Anything that can be refused is an ordinary JSON error before the stream starts: `404` (not your conversation), `409` (the previous answer is still being written), `429` (more than 12 messages a minute, or the daily limit of `AI_DAILY_MESSAGE_LIMIT`, 30, counted per day of Vietnam time in its own table so that deleting a conversation gives nothing back), `503`. A rate limit of the model is retried once, then shown as "Trợ lý đang quá tải, thử lại sau ít phút"; a failed or cancelled answer is not kept and not counted. Closing the connection cancels the request to the model. Only the last 20 messages go to the model. `AI_PROVIDER=fake` is an echo for tests and offline development (refused in production). The "an answer is being written" lock is in memory, which is right for one API instance; behind several, make it a database lock first.

**What the assistant can do (tools).** The model never touches data itself: it asks the server to run a tool, at most 6 per message, and the server checks every argument and acts only for the signed-in user.

| Tool                                                                        | Kind   | What it does                                                                                                                                                              |
| --------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search_catalog`                                                            | read   | Hybrid search (words + meaning) of tracks, artists, albums or playlists                                                                                                   |
| `get_track`, `get_artist`, `get_album`, `get_playlist`                      | read   | Details; a playlist is an editorial one or the user's own                                                                                                                 |
| `get_my_library`                                                            | read   | Liked tracks, followed artists, the user's playlists with their ids                                                                                                       |
| `recommend_tracks`, `similar_tracks`                                        | read   | Personal and similar tracks (see Recommendations)                                                                                                                         |
| `search_help`                                                               | read   | Looks up the help texts and returns the source to cite                                                                                                                    |
| `play_tracks`                                                               | app    | Sends the app a `client_action` event (up to 50 tracks); changes nothing                                                                                                  |
| `create_playlist`, `add_tracks_to_playlist`, `like_tracks`, `follow_artist` | change | Only **proposed**: the server stores a pending action (10 minutes), sends `action_required` and ends the stream; nothing happens until `POST /api/ai/actions/:id/confirm` |

`/reject` turns it down. Both answers stream the rest of the assistant's reply, like a message does (`tool_result` first). They count as one message of the daily limit (at the limit a confirmed change is still made and reported, without a model reply) and the 12 per minute limit, counted per endpoint. A proposal is valid for the person who got it (`404` for anyone else), once (`409`), and for 10 minutes (`410`); writing a new message instead ends it. Only one change is proposed per round, only to the user's **own** playlists (an admin's assistant too), at most 50 tracks per call. SSE events: `text_delta`, `tool_call`, `tool_result` (with the `display` cards), `action_required`, `client_action`, `done` (`awaitingAction`), `error`.

```mermaid
sequenceDiagram
  participant App as Mobile app
  participant API as API (messages of a conversation)
  participant Agent as Agent loop
  participant LLM as Gemini (Interactions API)
  participant Tool as Tools
  participant Svc as Services (search, tracks, playlists, likes)
  App->>API: text (the answer streams back as SSE)
  API->>Agent: the last 20 messages
  loop at most 6 tool calls
    Agent->>LLM: messages and the list of tools
    LLM-->>Agent: text, or a tool call
    Agent->>Tool: arguments checked, acting for the signed-in user
    Tool->>Svc: read, or only propose a change
    Svc-->>Tool: result
    Tool-->>Agent: result and the cards for the app
  end
  Agent-->>App: text_delta, tool_result, action_required, client_action, done
  App->>API: POST /ai/actions/:id/confirm (only then is the change made)
```

**Measuring the search.** `npm run ai:eval` (in `backend/`, after `prisma:seed` and `ai:embed`) runs the ~30 Vietnamese and English questions of `backend/eval/search-queries.json` (each with the tracks a person accepts as a good answer) through the search by words, the search by meaning and the two merged, prints Recall@10, MRR@10 and nDCG@10 for each, and writes `backend/eval/results.md` (per kind of query and per query, and the queries where merging is worse than the better list). It refuses to run with the offline `fake` provider (its numbers would say nothing about meaning), with tracks that have no vector, or with a track id that is not in the database. The labels were chosen from titles, artists, languages and the catalog metadata, which is also the text of the vectors, so mood questions favour the vector search a little.

**From an empty database to a measured search** (in `backend/`, with `EMBEDDING_PROVIDER=gemini` and a key in `.env`):

```bash
npm run prisma:seed   # the catalog (or SEED_ON_START=true once)
npm run ai:enrich     # optional: proposes genres, moods, tags and a description for each track in src/seed/catalog/metadata.json; a person reviews it
npm run ai:embed      # vectors for tracks, artists and the help texts; only what changed, safe to run again
npm run ai:eval       # Recall@10, MRR@10 and nDCG@10 of the three searches -> eval/results.md
```

Results of `ai:eval` (2026-11-10: 33 questions, 122 tracks, `gemini-embedding-2`; the full report with every question is `backend/eval/results.md`, made by the command, so run it again after changing the metadata or the model):

| Search                     | Recall@10 | MRR@10 | nDCG@10 |
| -------------------------- | --------: | -----: | ------: |
| By words                   |     0.273 |  0.273 |   0.273 |
| By meaning                 |     0.635 |  0.705 |   0.611 |
| Merged (what the app uses) |     0.635 |  0.720 |   0.622 |

What the numbers say: the search by words finds titles perfectly (nDCG 1.000) and artists almost (0.800, it misses a nickname such as 'đen vâu'), and nothing else (0.000 on mood, occasion and genre questions); the search by meaning finds genres well (0.831) and moods less well (0.423), and occasions worst (0.191); merging keeps the exact matches of the first and the meaning of the second, so it is never behind the better of the two on title and artist questions and a little ahead overall. The labels were chosen from the same metadata the vectors are made of, so mood and genre scores are a little optimistic, and 33 questions are enough to compare the three searches but not to promise a figure.

### Behaviour worth knowing

All settings below are optional environment variables with the defaults shown (see `backend/.env.example`).

| Topic                      | Behaviour                                                                                                                                                                                                                                                                                                                                                                           | Settings                                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Rate limits**            | Three independent groups, counted per IP (play: per user): login + register `5/min` (each call can be a password guess), refresh `30/min` (a healthy app refreshes by itself), `POST /tracks/:id/play` `60/min`. Over the limit: `429`.                                                                                                                                             | `AUTH_THROTTLE_*`, `REFRESH_THROTTLE_*`, `PLAY_THROTTLE_*` (`LIMIT`, `TTL_SECONDS`)                                               |
| **Cloudflare Turnstile**   | `POST /auth/login` needs a `turnstileToken` from the Turnstile widget on the login screen (a WebView on iOS / Android, Cloudflare's script on web). The server checks it with Siteverify before comparing the password: missing or failed `400`, Cloudflare unreachable `503`. Without a secret key the check is skipped (development only; production refuses to start).           | `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES`; mobile: `EXPO_PUBLIC_TURNSTILE_SITE_KEY`, `EXPO_PUBLIC_TURNSTILE_HOSTNAME` |
| **Reverse proxy**          | `TRUST_PROXY=1` makes Express read the visitor's IP from the proxy's `X-Forwarded-For`, so the limits count real visitors behind Railway / Render. Use `0` / `false` when the API is reachable directly, otherwise a client could write that header itself and dodge the limit.                                                                                                     | `TRUST_PROXY` (`1`)                                                                                                               |
| **Counting plays**         | `POST /tracks/:id/play` needs a login. The same user replaying the same track within the window answers `200 { plays, counted: false }` and changes nothing. Each counted listen is a `PlayEvent` row (also the base of a future "recently played" list). An unknown track is `404`.                                                                                                | `PLAY_DEDUPE_MINUTES` (`30`)                                                                                                      |
| **Tracks without a file**  | `audioUrl` is optional (`null`). Commercial tracks only have a `youtubeVideoId`; the seed fills `audioUrl` just for the original demo tracks that are in the bucket. A track must have at least one of the two, or creating / updating it is `400`.                                                                                                                                 |                                                                                                                                   |
| **Comments**               | `GET /comments?trackId=` (or `postId=`) returns top-level comments, newest first, with `cursor` / `limit` (20, max 50): `{ items, nextCursor, total }`. Each comment carries its 3 newest replies (oldest first) and `repliesCount`; `GET /comments/:id/replies?cursor=&limit=` loads older ones. Replies are one level deep: answering a reply attaches to the top-level comment.  |                                                                                                                                   |
| **Banned accounts**        | `User.isBanned`, set by an admin. A banned user gets `403` on login (after the password is checked, so strangers learn nothing) and on refresh; banning revokes all their refresh tokens; an access token they still hold is refused (`401`) because the guard reads role and ban from the database on every request (one primary-key read), so a ban or a demotion counts at once. |                                                                                                                                   |
| **Refresh token rotation** | Every refresh replaces the token. Presenting a replaced token again is treated as theft and revokes the whole login (`401`), **except** during the grace period: the app may have been killed before it saved the new token, so a token replaced less than 10 s ago gets another new token of the same login.                                                                       | `REFRESH_REUSE_GRACE_SECONDS` (`10`; `0` turns it off)                                                                            |

## Admin web

`admin/` is a separate web app (Vite, React 19, Refine, Ant Design 5) for the people who run the
service: catalog, accounts, lyrics. It only calls the API; every endpoint it uses is `@Auth(Role.ADMIN)`.

```mermaid
flowchart LR
  Browser[Admin web<br/>nginx, port 5173] -->|"REST + Bearer token<br/>(refresh on 401, one at a time)"| API[NestJS API]
  Browser -->|"PUT file (presigned URL)"| R2[(Cloudflare R2)]
  API -->|"presign"| R2
  API --> DB[(PostgreSQL)]
  Browser -.->|"IFrame API (tap-sync of a YouTube track)"| YT[YouTube]
  Browser -.->|"login check"| TS[Cloudflare Turnstile]
```

- **What it does:** dashboard (totals, plays and new users of the last 14 days, top tracks, DeepL quota),
  tracks / artists / albums / feed, accounts (search, ban, role, delete), and the **lyrics editor**
  (paste, tap-sync with `Space`, fine-tune by 0.1 s, preview, LRC import / export, translation).
- **Backend endpoints made for it** (module `admin`, which owns no table and only calls other modules
  through their public API): `GET /admin/stats`, `GET /admin/users?q=&role=&banned=&page=&limit=`,
  `PATCH /admin/users/:id` `{ role?, isBanned? }`, `DELETE /admin/users/:id`,
  `GET /admin/tracks/lyrics-status?ids=a,b,c` (one call for a whole page of the tracks table). An admin
  cannot ban, demote or delete themselves (`400`); banning also revokes every refresh token of the user.
  The users list is paged like the other lists (`page` / `limit`, answer `{ items, total, ... }`).
- **Run it:** `docker compose up -d --build` starts `db`, `api` and `admin` (<http://localhost:5173>), or
  `cd admin && npm install && npm run dev`. Log in with the seed admin (`SEED_ADMIN_EMAIL` /
  `SEED_ADMIN_PASSWORD`, created when `SEED_ON_START=true`). Uploads need the `R2_*` settings and a CORS
  rule on the bucket that allows `PUT` from the admin origin. Everything is explained in
  [`admin/README.md`](admin/README.md).
- **Apply the migration** that adds `User.isBanned` before using it: `cd backend && npm run prisma:deploy`
  (the Docker API does it on start).

## Languages and translation (DeepL)

The app speaks five languages: Vietnamese (`vi`, the language every text is written in), English
(`en-US`), Korean (`ko`), Japanese (`ja`) and Simplified Chinese (`zh-Hans`). DeepL translates two
different things, and only the **backend** ever talks to it: the key lives in `backend/.env`, never
in `mobile/` (nothing in the app calls DeepL, and a value in `mobile/.env` must not be there).

| What                 | When                                                            | Where                        |
| -------------------- | --------------------------------------------------------------- | ---------------------------- |
| The texts of the app | While you develop, with a script; the result is committed       | `mobile/src/i18n/`           |
| The lyrics of a song | When a person asks for a translation, then kept in the database | `backend/src/modules/lyrics` |

DeepL's free plan allows **500 000 characters a month**, so nothing is translated twice (see below).
Read DeepL's terms before sending text that is not yours: the free plan may store what it receives.

### The texts of the app

`mobile/src/i18n/locales/vi.json` is the source; keys are grouped by screen (`auth.login.title`) and
`t("…")` is type-checked against it. `en-US.json`, `ko.json`, `ja.json` and `zh-Hans.json` are
written by the script; do not edit them by hand. The app starts in the language of the phone (Vietnamese when it has
none of the five), remembers a choice made in **Account → Language**, and changes every text at once.
A text a language does not have yet is shown in Vietnamese, then English.

```bash
cd backend
npm run i18n:translate -- --dry-run   # what would be translated and how many characters; calls nobody
npm run i18n:translate                # translate the new and the changed texts
npm run i18n:translate -- --check     # fail if a translation is missing or out of date; calls nobody (CI runs it)
npm run i18n:translate -- --lang=ko   # only some languages
cd ../mobile && npm run i18n:check    # the i18n Jest tests (keys, {{placeholders}}, language store), offline
```

- **Only what changed is sent.** `translate/lock.json` (committed) records which Vietnamese text each
  translation was made from; a second run with an unchanged `vi.json` sends 0 characters.
- **`{{name}}` and `{{count}}` survive.** They are wrapped in XML tags (`tag_handling=xml`) so DeepL leaves
  them alone, and every answer is checked afterwards; one that lost a placeholder is not used and is tried again next time.
- **Brand names stay as they are** (`translate/keep-list.json`: Music Stream, Premium, YouTube, …).
- **Corrections by hand** go in `translate/overrides/<language>.json` (same shape as `vi.json`). An overridden text is never
  translated again, and an override like `"followers_one"` adds a plural form (`en-US` has some).
- To add a text: write it in `vi.json`, use `t("group.key")`, run `npm run i18n:translate`, commit the files.

### The lyrics of a song

All endpoints need a login. The lyrics are text that may be stored: your own, or licensed. The demo
data has three short texts written for the project (`source: "demo"`, and the first line says they are not the real
lyrics). The AI assistant has no tool for lyrics and the track views never carry them.

| Endpoint                                         | What it does                                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/tracks/:id/lyrics`                     | The original lyrics: `{ language, lines, timingsMs, source }`. A track without lyrics answers `404` with `code: "LYRICS_NOT_FOUND"`                          |
| `GET /api/tracks/:id/lyrics/translation?lang=ko` | The translation, one element per original line (blank lines stay blank, in place). Kept in the database: the first request translates, the next ones read it |
| `PUT /api/tracks/:id/lyrics`                     | Writes (replaces) the lyrics; **admin only**. At most 500 lines, 500 characters a line, 20 000 in all                                                        |

- A translation belongs to a _version_ of the lyrics (a hash of the text). Replacing the lyrics deletes the old translations.
- Lyrics already in the language asked for are returned as they are (`provider: "original"`), without calling DeepL.
- Requests that arrive at the same moment for the same song and language share one call; the unique key
  `(lyrics, language, version)` settles the case of two servers.
- It is rate limited per user (`LYRICS_TRANSLATE_THROTTLE_*`, 10 a minute) and stops translating at
  `LYRICS_TRANSLATION_STOP_AT_PERCENT` (90) of the month's allowance, so the rest is left for the app's texts;
  translations already kept can still be read. Without a key the translation endpoint answers `503 TRANSLATION_NOT_CONFIGURED`
  and the app stops offering the button; the original lyrics keep working.
- No lyrics provider is connected. `LyricsSource` (`modules/lyrics/ports.ts`) is the interface to implement for one
  (provide it as `LYRICS_SOURCE`); until then lyrics come in through the admin endpoint or the seed.
- In the app the lyrics button is in the player, between comments and share. The translation is only asked for when the
  person presses "Dịch sang …", can be shown beside the original or alone, and carries the label "Bản dịch tự động".

### Settings

| Variable                                          | Default    | Meaning                                                                                                       |
| ------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| `DEEPL_API_KEY`                                   | –          | DeepL key (a free key ends with `:fx`). Required in production; blank in development switches translating off |
| `DEEPL_MAX_RETRIES`                               | `3`        | Retries for a `429`, a `5xx` or a network failure (the SDK backs off)                                         |
| `TRANSLATION_PROVIDER`                            | deepl      | `fake` calls nobody and writes `[<language>] <text>` (tests, offline; refused in production)                  |
| `LYRICS_TRANSLATE_THROTTLE_LIMIT`, `_TTL_SECONDS` | `10`, `60` | Translations a user may ask for per window                                                                    |
| `LYRICS_TRANSLATION_STOP_AT_PERCENT`              | `90`       | No new lyrics are translated from this share of the monthly allowance on                                      |

`GET /api/translation/usage` (admin) shows `{ used, limit, percent }` of the allowance; the log warns from 80%.
DeepL's `456` (allowance used up) pauses translating for 15 minutes without calling it again. Only counts are logged,
never a text or the key.

## Playback architecture

Every track can carry two places to play from: `youtubeVideoId` (the official video, from the artist's own channel) and `audioUrl` (an audio file in our Cloudflare R2 bucket). The player picks one **per track**, and never plays anything else in its place.

```mermaid
flowchart TD
  Store["playerStore<br/>queue · current track · play / pause · seek"] --> Controller[PlaybackController]
  Controller -->|"track has youtubeVideoId"| YT[YouTubeSource]
  Controller -->|"only audioUrl"| R2S[R2AudioSource]
  Controller -->|"neither"| None["'Bài này chưa có nguồn phát'<br/>then the next track"]
  YT --> View["YouTubePlayerView<br/>official IFrame player on the Player screen"]
  R2S --> Audio["expo-audio<br/>background playback + lock screen"]
  Audio -.-> R2[(Cloudflare R2)]
  View -.-> YouTube[(YouTube)]
```

- `playerStore` is the source of truth (queue, shuffle, repeat, position). `PlaybackController` applies it to the source that fits the track and reports position, duration and errors back.
- Both sources implement the same `PlaybackSource` interface (`load`, `play`, `pause`, `seekTo`, `getPosition`, `getDuration`, `onEnded`, `onError`), so queue, next / previous, shuffle and repeat work the same for a queue that mixes them.
- A YouTube track shows the official player in place of the cover on the Player screen (square, at least 200 × 200, never covered). The seek bar and buttons are the app's own; the position is read from the player every 500 ms.
- When a track cannot be played:

| Situation                                                        | What happens                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| YouTube refuses the embed (error 101 / 150) or the video is gone | Toast "Bài này không phát được trong app", button "Mở trên YouTube"; if the track has an R2 file it plays that instead, otherwise the player skips after 3 s |
| Offline / the load never finishes                                | Error with a "Thử lại" button                                                                                                                                |
| No `youtubeVideoId` and the R2 file is missing (404)             | "Bài này chưa có nguồn phát", then the next track. No substitute audio is played                                                                             |

**Why two sources.** Music we do not own is never downloaded, extracted or re-streamed: it is played only through YouTube's official embedded player, which keeps the ads, attribution and rights-holder control that YouTube's terms require (so the player must stay visible and unobscured). The R2 bucket holds only audio we have the right to host (original or licensed demo tracks), which is what allows background playback and lock screen controls.

**Why YouTube tracks stop in the background.** YouTube's terms allow a video to be played only in its official embedded player, which must stay visible (at least 200 × 200, not covered, no audio-only mode, no hidden player), and the app may not extract the audio. That player is a web page inside a WebView, and iOS and Android suspend a WebView when the app leaves the screen, so the video cannot keep playing; the app pauses it and, once per session, says so when the user comes back. Audio files from R2 are played by `expo-audio`, which is allowed to run in the background and shows lock screen controls.

**Music that does play in the background.** The playlist **Phát nền – Background** has 8 tracks by Kevin MacLeod (CC BY) hosted in R2, without a YouTube video. Tracks like these are marked with a headphones badge in lists and on the player. Their sources, licences and the files to upload are in [`backend/src/seed/LICENSED_AUDIO.md`](backend/src/seed/LICENSED_AUDIO.md).

**The YouTube player page is ours.** The WebView loads `GET /api/embed/youtube-player` from the backend (the app passes it as `baseUrlOverride`), not a page from the library author's GitHub Pages. It speaks the protocol of `react-native-youtube-iframe` (play, pause, mute, volume, rate, `player.getCurrentTime()`, `seekTo`, state and error events), fills the square frame, and is served with a Content-Security-Policy that allows only `youtube.com` and `ytimg.com` and names its own script by hash. YouTube refuses embeds that send no referrer, so the page keeps `Referrer-Policy: strict-origin-when-cross-origin`. Use an **https** API address in release builds.

## Release builds (EAS)

The app id is `com.vinhmai.musicstream` on both platforms (`app.json`); `version` is the number users see, `android.versionCode` / the iOS build number are raised by EAS on every production build (`autoIncrement`). The app follows the phone's light / dark setting (`userInterfaceStyle: "automatic"`).

`mobile/eas.json` has three profiles; all of them read the API address and the other `EXPO_PUBLIC_*` values from the `env` of `eas.json`, because `mobile/.env` is not part of a cloud build:

| Profile       | What it builds                                                       | API address (`EXPO_PUBLIC_API_URL`)                              |
| ------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `development` | A development client for your own phone (internal distribution)      | your computer, `http://192.168.1.x:3000/api`                     |
| `preview`     | An **APK** you can install on any Android phone and send to testers  | the deployed backend, `https://music-stream-api.example.com/api` |
| `production`  | A store build (AAB on Android, IPA on iOS), build number auto-raised | the deployed backend (same placeholder)                          |

**Before the first build, fill in `eas.json`:**

1. `EXPO_PUBLIC_API_URL`: the address of your deployed backend, **https**, ending in `/api` (a release build refuses plain `http`; the player page and every request go through it).
2. `EXPO_PUBLIC_MEDIA_BASE_URL`: the public address of the R2 bucket.
3. `EXPO_PUBLIC_TURNSTILE_SITE_KEY` and `EXPO_PUBLIC_TURNSTILE_HOSTNAME`: your Cloudflare Turnstile widget (the placeholder test key only works with the test secret key). Add the hostname to the widget on Cloudflare and, if you set it, to `TURNSTILE_ALLOWED_HOSTNAMES` of the backend.
4. The `development` profile needs `expo-dev-client` (`npx expo install expo-dev-client`), which is not installed yet.

**Build** (needs an Expo account; nothing here is done for you):

```bash
npm install --global eas-cli
cd mobile
eas login
eas init                                        # links the project, writes extra.eas.projectId into app.json
eas build --platform android --profile preview  # APK, the link appears when the build ends
eas build --platform all --profile production   # store builds (asks for Apple / Google credentials)
```

The backend must be deployed first (any host that runs the Docker image or `npm run build && npm run start` and has a PostgreSQL database). Set its environment as in `backend/.env.example`: with `NODE_ENV=production` it refuses to start without the R2 settings and `TURNSTILE_SECRET_KEY`, and set `TRUST_PROXY` to the number of proxies in front of it.

## Known limitations

- **YouTube tracks do not play with the screen off.** The embedded player has to stay visible, so closing the Player screen does not stop the video: it moves into a floating 200 × 200 card above the mini player (YouTube's minimum size; its × stops playback). The track pauses when the app goes to the background. Audio files from R2 keep playing with the screen off (see the playlist **Phát nền – Background**).
- **Premium is simulated.** "Subscribe now" only sets the account's `isPremium` flag on the server (`POST /users/me/subscribe`); there is no payment, no billing period and no way to cancel.
- **Commercial music plays only through YouTube's official embed.** The app never downloads, extracts or re-streams it, so those tracks have no `audioUrl`; the only audio hosted by us is music we may host (the original demo tracks and the Creative Commons playlist).
- **No lock screen / notification controls for YouTube tracks** (the video is not an audio session of the app).
- **Ads can appear** on YouTube tracks; they are shown by YouTube and cannot be skipped by the app.
- **The floating card covers part of the screen** while a YouTube track is current. The player lives above all screens (`YouTubeHost`), so the Player screen is a normal pushed screen, not a native modal (a native modal would hide the video on iOS).
- **Lock screen buttons of R2 tracks:** play / pause and ±15 s. Next / previous are not offered because `expo-audio` only provides them for its native playlist, not for a single player.
- **Expo Go:** background audio on iOS is part of Expo Go; on Android, the foreground service and lock screen controls come from the `expo-audio` config plugin in `app.json`, which Expo Go does not apply. If they do not show up on an Android phone, use a development build (`npx expo run:android` or EAS Build).
- **Pictures of the new catalog are video pictures.** Artists, albums, regional playlists and songs show the picture YouTube makes of their official videos (nothing is hosted by us, so nothing has to be uploaded); the choice is in `backend/src/seed/catalog/pictures.ts`. They are video frames, not portraits, and a video that is removed loses its picture (the app then shows a coloured tile with initials). Only the Background playlist (Kevin MacLeod) and the original demo data have pictures in R2.
- **Search by words ignores accents** (`son tung` finds `Sơn Tùng`) through a normalized `searchName` column kept in step by the API; a row changed by hand in SQL keeps its old `searchName` until it is renamed through the API. The match is a substring match without a trigram index, which is fine at this catalog size.
- **Recommendations** (`GET /api/recommendations/for-you`, `/recommendations/because-you-listened`, `/tracks/:id/similar`) build a taste vector from the vectors of the tracks a user liked (weight 3) and played in the last 30 days (fading), skip what they already know, and pick a varied list (MMR, at most three tracks per artist). A user with no history gets the most played tracks. `similar` and `because-you-listened` answer `503` without embeddings and the app then hides those sections.
- **Search by meaning** (`GET /api/search/semantic?q=nhạc buồn ngày mưa`) merges the search by words with the nearest vectors (reciprocal rank fusion). It needs the embeddings above; without a provider it answers `503`, and when the provider fails at that moment it answers with the search by words alone and `degraded: true`. There is no similarity cutoff yet, so a question matching nothing still returns the nearest tracks.
- **The AI assistant needs a key and has limits.** Without `GEMINI_API_KEY` (or `EMBEDDING_API_KEY`) it answers `503` and the app hides it. A user has `AI_DAILY_MESSAGE_LIMIT` (30) messages a day and 12 a minute, and only the last 20 messages go to the model. The "answer being written" lock is in memory, which is right for one API instance. Text sent through Google's free tier may be used by Google.
- **The assistant knows what a song is like, not what it says.** No tool reads lyrics and it is told never to write them out; it sees the genres, moods, tags and description of a track. Its answers and the search by meaning are only as good as that metadata (`ai:enrich` proposes it, a person has to review it) and can be generic or wrong.
- **Lyrics are demo texts.** The three tracks that have lyrics carry text written for this project (`source: "demo"`). Real lyrics are protected: they can only be entered by an administrator (`PUT /api/tracks/:id/lyrics`) or come from a licensed source that implements `LyricsSource`; the app never fetches lyrics from the web.
- **Translations are made by a machine.** DeepL's free plan gives 500 000 characters a month, shared by the app texts and the lyrics; lyrics stop being translated at 90% of it, and the original lyrics stay readable whenever translating is off, busy or used up. A machine translation of a song loses rhyme and nuance, which is why it is labelled. DeepL's free plan may store what it receives.
- **Not everything is translated.** Messages the server writes (the assistant's replies and its errors) and the permission text in `app.json` are in Vietnamese only. A wrong machine translation of an app text is fixed in `mobile/src/i18n/translate/overrides/<language>.json`.
- Some videos forbid embedding; they fall back to the R2 file or are reported as above.

## Testing and CI

| Where      | Command                  | What it runs                                                                                                                                                                      |
| ---------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mobile/`  | `npm test`               | Jest unit and component tests (the player, the API client, the stores, helpers, the track row, the login screen, the theme)                                                       |
| `mobile/`  | `npm test -- --coverage` | The same with a coverage table for `src/utils` and `src/store` (the build fails under 80%; it is about 96% today)                                                                 |
| `backend/` | `npm test`               | Unit tests of the configuration, pagination, Turnstile, health and the other small pieces                                                                                         |
| `admin/`   | `npm test`               | Vitest unit tests of the pure logic (LRC, tap-sync, lyrics checks, upload rules, data provider, token refresh); on Windows run from PowerShell or cmd                             |
| `backend/` | `npm run test:e2e`       | Builds the API, then runs end-to-end specs against a real PostgreSQL (needs `docker compose up -d db`; it creates its own `*_e2e` database and never touches the development one) |

Every push and pull request into `main` and `dev` runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml): three jobs in parallel, **Backend** (Prisma generate and migrate on a PostgreSQL service, lint, types, unit and e2e tests), **Mobile** (lint, types, tests with coverage) and **Admin** (lint, types, unit tests, production build). npm downloads are cached per `package-lock.json`.

## Available Scripts

Run these from the `mobile/` folder.

| Script               | Command                   | Description                           |
| -------------------- | ------------------------- | ------------------------------------- |
| `npm start`          | `expo start`              | Start the development server          |
| `npm run android`    | `expo start --android`    | Start and open on Android             |
| `npm run ios`        | `expo start --ios`        | Start and open on iOS                 |
| `npm run web`        | `expo start --web`        | Start and open in the browser         |
| `npm run typecheck`  | `tsc --noEmit`            | Type-check the project                |
| `npm run lint`       | `expo lint`               | Lint the source code                  |
| `npm run lint:fix`   | `expo lint --fix`         | Lint and auto-fix issues              |
| `npm run format`     | `prettier --write .`      | Format all files with Prettier        |
| `npm test`           | `jest`                    | Run the tests                         |
| `npm run test:watch` | `jest --watch`            | Run the tests again on every change   |
| `npm run i18n:check` | `jest src/__tests__/i18n` | Check the translation files (offline) |

Run `npm run typecheck`, `npm run lint` and `npm test` before opening a pull request. The scripts of `backend/` (`start:dev`, `typecheck`, `lint`, `test`, `test:e2e`, `prisma:migrate`, `prisma:seed`, `i18n:translate`) are listed in [Backend](#backend).

## Branching Workflow

Development follows a three-tier flow:

```text
Vinh  ──►  dev  ──►  main
(feature)  (integration)  (stable)
```

- **`Vinh`** — personal working branch where all features and fixes are developed.
- **`dev`** — integration branch; `Vinh` is merged here through a pull request after review.
- **`main`** — stable branch; only tested code from `dev` is merged here.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) and reference the Jira issue key, for example:

```text
feat(foundation): add theme tokens, types, mock data, stores and base UI [SAM1-24]
```

## Project Management

Tasks, epics and progress are tracked in **Jira** under project key **`SAM1`**. Every commit and pull request references its Jira issue (e.g. `SAM1-13`) for traceability.

## Team

| Member               | Student ID | Role                     | Main work                                                                                                                                                           |
| -------------------- | ---------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mai Lưu Hữu Vinh** | 21095551   | Team lead, backend       | NestJS API and PostgreSQL / Prisma schema, AI assistant and search by meaning (Gemini, pgvector), Cloudflare R2 and DeepL, Docker, GitHub Actions CI, Jira planning |
| **Bùi Hoàng Giang**  | 20088591   | Mobile developer         | Expo / React Native screens (Home, Search, Player, Library, Feed), design tokens, light and dark theme, five languages                                              |
| **Trần Đức Cảnh**    | 23721611   | Admin web, testing, docs | Admin web (Refine + Ant Design), unit and end-to-end tests, use case and ERD diagrams, report, slides and demo video                                                |

**Class:** DHKTPM19BTT · **Instructor:** Nguyễn Minh Hải · **School:** Industrial University of Ho Chi Minh City (IUH)

## License

This project is licensed under the terms of the [LICENSE](LICENSE) file.
