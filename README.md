<div align="center">

# 🎵 Music Stream

**A cross-platform music streaming app built with Expo, React Native and TypeScript.**

Final project for the **Mobile Programming** course — Industrial University of Ho Chi Minh City (IUH)

![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-lightgrey)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Screens & Features](#screens--features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Branching Workflow](#branching-workflow)
- [Project Management](#project-management)
- [Author](#author)

## Overview

**Music Stream** is a mobile music streaming application that lets users discover music, follow artists, browse albums and playlists, play tracks with a full-featured player, and manage a personal library. It is developed as a final project for the Mobile Programming course at IUH, with a focus on mobile-first UI, clean architecture and smooth performance on both Android and iOS.

## Screens & Features

The app consists of 13 screens:

| #   | Screen              | Key features                                                                     |
| --- | ------------------- | -------------------------------------------------------------------------------- |
| 1   | **Launch**          | Branded welcome screen with the app tagline and call-to-action                   |
| 2   | **Premium**         | Subscription offer; unlocks premium state (persisted locally)                    |
| 3   | **Home**            | Greeting, search entry, suggestions, popular artists, albums and playlists       |
| 4   | **Search**          | Search tracks/artists, recent searches (add / remove / clear), browse categories |
| 5   | **Feed**            | Social feed of tracks shared by artists, with likes and comment counts           |
| 6   | **Comments**        | Threaded comments and replies on a feed post                                     |
| 7   | **Library**         | Liked tracks, liked albums/playlists, followed artists, user-created playlists   |
| 8   | **Playlist Detail** | Track list, like/unlike playlist, play/shuffle, rename and delete                |
| 9   | **Album Detail**    | Album tracks, like/unlike album, play all                                        |
| 10  | **Artist Profile**  | Bio, follower count, top tracks, albums, follow/unfollow                         |
| 11  | **Player**          | Play/pause, seek, next/previous, shuffle, repeat (off / all / one), like         |
| 12  | **Create Playlist** | Create a new playlist and add or remove tracks                                   |
| 13  | **Add to Playlist** | Bottom sheet to save a track into one of the user's playlists                    |

**Cross-cutting features**

- Audio playback powered by `expo-audio`
- Persistent library state (likes, follows, playlists, recent searches) via Zustand + AsyncStorage
- Reusable UI kit: `AppText`, `Button`, `Chip`, `IconButton`, `SearchBar`, `BottomSheet`, `Toast`, `Skeleton`, `EmptyState`
- Centralised design tokens (colors, typography, spacing, radius, shadows)
- File-based navigation with Expo Router and typed routes

> **Note:** The project is under active development. The foundation layer (theme, types, mock data, stores, base UI) is in place and screens are being delivered epic by epic — see [Project Management](#project-management).

## Screenshots

> Screenshots will be added as screens are completed. Place images in `docs/screenshots/` and update the table below.

|                 Launch                 |                Home                |                 Search                 |
| :------------------------------------: | :--------------------------------: | :------------------------------------: |
| ![Launch](docs/screenshots/launch.png) | ![Home](docs/screenshots/home.png) | ![Search](docs/screenshots/search.png) |

|                 Player                 |                 Library                  |                 Artist                 |
| :------------------------------------: | :--------------------------------------: | :------------------------------------: |
| ![Player](docs/screenshots/player.png) | ![Library](docs/screenshots/library.png) | ![Artist](docs/screenshots/artist.png) |

## Tech Stack

| Area         | Technology                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------- |
| Framework    | [Expo](https://expo.dev) SDK 57, React Native 0.86, React 19                                 |
| Language     | TypeScript                                                                                   |
| Navigation   | Expo Router (file-based, typed routes)                                                       |
| State        | Zustand with `persist` middleware                                                            |
| Storage      | `@react-native-async-storage/async-storage`                                                  |
| Audio        | `expo-audio`                                                                                 |
| Animation    | React Native Reanimated, Gesture Handler, Worklets                                           |
| UI & visuals | `expo-image`, `expo-linear-gradient`, `expo-blur`, `lucide-react-native`, `react-native-svg` |
| Typography   | Inter via `@expo-google-fonts/inter`                                                         |
| Code quality | ESLint (`eslint-config-expo`), Prettier, `tsc`                                               |

## Project Structure

```text
music-stream-app/
├── assets/
│   └── images/              # App icons, covers, artists, feed and onboarding art
├── src/
│   ├── app/                 # Expo Router routes (each file is a screen)
│   │   ├── _layout.tsx      # Root layout, fonts and splash handling
│   │   └── index.tsx        # Entry screen
│   ├── components/
│   │   └── ui/              # Reusable UI components
│   ├── constants/           # App-wide constants and copy
│   ├── data/                # Catalog, images and mock data
│   ├── hooks/               # Custom hooks (fonts, toast, ...)
│   ├── store/               # Zustand stores (player, library)
│   ├── theme/               # Design tokens
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Helpers (formatTime, formatCount, ...)
├── app.json                 # Expo configuration
├── eslint.config.js
├── tsconfig.json
└── package.json
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (LTS)
- npm
- [Expo Go](https://expo.dev/go) installed on your Android or iOS device (the phone and computer must be on the same network)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/vinhmai2109551/music-stream-app.git
cd music-stream-app

# 2. Install dependencies
npm install

# 3. Start the development server
npx expo start
```

### Run on a device

1. Run `npx expo start`.
2. Open **Expo Go** on your phone.
   - **Android:** scan the QR code from within Expo Go.
   - **iOS:** scan the QR code with the Camera app.
3. The app loads and hot-reloads as you edit the code.

Alternatively, press `a` (Android emulator), `i` (iOS simulator) or `w` (web) in the terminal.

## Available Scripts

| Script              | Command                | Description                    |
| ------------------- | ---------------------- | ------------------------------ |
| `npm start`         | `expo start`           | Start the development server   |
| `npm run android`   | `expo start --android` | Start and open on Android      |
| `npm run ios`       | `expo start --ios`     | Start and open on iOS          |
| `npm run web`       | `expo start --web`     | Start and open in the browser  |
| `npm run typecheck` | `tsc --noEmit`         | Type-check the project         |
| `npm run lint`      | `expo lint`            | Lint the source code           |
| `npm run lint:fix`  | `expo lint --fix`      | Lint and auto-fix issues       |
| `npm run format`    | `prettier --write .`   | Format all files with Prettier |

Run `npm run typecheck` and `npm run lint` before opening a pull request.

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

## Author

| Field      | Details                                         |
| ---------- | ----------------------------------------------- |
| **Name**   | Mai Lưu Hữu Vinh                                |
| **Class**  | DHKTPM19BTT                                     |
| **School** | Industrial University of Ho Chi Minh City (IUH) |

## License

This project is licensed under the terms of the [LICENSE](LICENSE) file.
