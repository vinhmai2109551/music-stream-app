/** Playback and player-screen tuning values. */
export const RESTART_THRESHOLD_SECONDS = 3
export const LOAD_TIMEOUT_MS = 15_000
export const AUDIO_UPDATE_INTERVAL_MS = 250
/** How often a YouTube player is asked for its position. */
export const YOUTUBE_POLL_INTERVAL_MS = 500
/** A YouTube player must be at least this many points wide and tall, and never covered. */
export const YOUTUBE_MIN_SIZE = 200
/** A track that cannot be played is skipped after this long, when another one follows. */
export const AUTO_SKIP_DELAY_MS = 3_000
/** A YouTube track waits this long for the player screen to open before it pauses. */
export const PLAYER_SCREEN_GRACE_MS = 2_500
/** Length of the lock screen skip buttons, in seconds. */
export const LOCK_SCREEN_SEEK_SECONDS = 15

export const WAVEFORM_BARS = 48
export const DISMISS_DISTANCE = 90

/** Placeholder social counters, as in the design prototype. */
export const BASE_LIKE_COUNT = 12_000
export const LIKE_COUNT_BUMP = 100
export const BASE_COMMENT_COUNT = 450
