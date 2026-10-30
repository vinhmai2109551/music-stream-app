/** A play only counts after this many seconds of actually listening. */
export const PLAY_THRESHOLD_SECONDS = 30

/** Position updates arrive about every 250 ms; a bigger step forward is a seek, not listening. */
const MAX_LISTEN_STEP_SECONDS = 2
/** A jump back this far means the track started over (repeat one) or the user restarted it. */
const RESTART_JUMP_SECONDS = 5

/**
 * Decides when one play of a track has been listened to long enough to count.
 * Feed it the playback position; it answers `true` exactly once per play.
 * Only time actually played adds up: skipping ahead does not.
 */
export class PlayCounter {
  private listened = 0
  private lastPosition: number | null = null
  private counted = false

  /** Starts a new play (another track, or the same one started again). */
  reset(): void {
    this.listened = 0
    this.lastPosition = null
    this.counted = false
  }

  /** Call with the playback position (seconds) whenever it changes while playing. */
  update(position: number): boolean {
    const last = this.lastPosition
    this.lastPosition = position
    if (last === null) return false

    const step = position - last
    if (step <= -RESTART_JUMP_SECONDS) {
      // The track began again: that is a new play.
      this.listened = 0
      this.counted = false
      return false
    }
    if (step > 0 && step <= MAX_LISTEN_STEP_SECONDS) this.listened += step

    if (!this.counted && this.listened >= PLAY_THRESHOLD_SECONDS) {
      this.counted = true
      return true
    }
    return false
  }
}
