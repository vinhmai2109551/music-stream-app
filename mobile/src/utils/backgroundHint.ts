/**
 * Tells the user, once per app session, that a YouTube track stopped because the app was left.
 * The hint can only be read after they come back, so it waits for the app to be in front again.
 */
export class BackgroundHint {
  private pending = false
  private shown = false

  /** The app went to the background and a YouTube track that was playing had to pause. */
  onPausedInBackground(): void {
    if (!this.shown) this.pending = true
  }

  /** The app is in front again. Answers true exactly once: when the hint should be shown. */
  onForeground(): boolean {
    if (!this.pending || this.shown) return false
    this.pending = false
    this.shown = true
    return true
  }
}
