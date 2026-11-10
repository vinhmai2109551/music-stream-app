import { useEffect, useState } from "react"
import type { MediaController } from "./media"

const TICK_MS = 100

/**
 * The position of the song in ms, read from the player about ten times a second while `active`;
 * -1 when there is no player. Reading it is what makes the highlighted line follow the music.
 */
export function useClock(controller: MediaController | null, active: boolean): number {
  const [now, setNow] = useState(-1)

  useEffect(() => {
    if (!controller || !active) return
    const read = () => setNow(controller.getTimeMs())
    read()
    const timer = window.setInterval(read, TICK_MS)
    return () => window.clearInterval(timer)
  }, [controller, active])

  return controller && active ? now : -1
}
