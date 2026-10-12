@AGENTS.md

# Music Stream — project guide

## Overview

Music streaming mobile app (Expo SDK 57, React Native, **100% TypeScript, strict mode**). Runs on Expo Go (Android + iOS), so no native modules that need a dev build. UI is ported from a Figma Make prototype (13 screens, tabs: Home · Search · Feed · Library, persistent mini player). Tasks are tracked in Jira project `SAM1`.

## Folder structure

```
src/
  app/          Expo Router routes only ((tabs)/, playlist/[id], artist/[id], player, comments, ...)
  components/   ui/ (Button, Chip, ...) and media/ (TrackRow, MiniPlayer, ...)
  theme/        colors, typography, spacing, radius, shadows — single source of truth
  data/         typed mock data (ids link tracks, artists, albums, playlists)
  types/        shared domain types
  store/        zustand stores (playerStore, libraryStore persisted with AsyncStorage)
  hooks/ utils/ constants/   (constants/audio.ts holds all sample MP3 URLs)
assets/images/  app icons and artwork
```

## Commands

```bash
npx expo start        # dev server
npm run typecheck     # tsc --noEmit
npm run lint          # eslint (expo lint)
npm run lint:fix
npm run format        # prettier --write .
npx expo install <pkg>  # always use this to add dependencies
```

Run `typecheck` and `lint` with zero errors before every commit.

## Coding conventions

- TypeScript only; no `any`; no `.js/.jsx` source files (config files excepted).
- Import via alias `@/*` → `src/*`.
- Style: no semicolons, double quotes, trailing commas, print width 100 (Prettier).
- No hard-coded colors, spacing or radii outside `src/theme/`.
- Keep components small (< ~250 lines); memoize list items; use `FlatList` for long lists.
- Images use `expo-image` with `contentFit="cover"`; animations use Reanimated.
- Touch targets ≥ 44pt with pressed feedback; handle loading / empty / error states.
- Truncate text with `numberOfLines` + ellipsis; respect safe areas.
- No secrets or personal data in the repo.

## Commit convention

Conventional Commits with the Jira key at the end:

```
feat(home): build Home screen [SAM1-48]
chore: repo hygiene, gitignore, lint and format setup [SAM1-13]
```

Commit at the end of each phase, then stop for review.
