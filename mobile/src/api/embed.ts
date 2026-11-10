import { API_BASE_URL } from "./client"

/**
 * Address of the page that plays a YouTube video inside the app's WebView (served by our backend:
 * GET /embed/youtube-player). `undefined` while the API address is not configured, in which case
 * the player library falls back to its own default page.
 */
export const youtubePlayerPageUrl: string | undefined = API_BASE_URL
  ? `${API_BASE_URL}/embed/youtube-player`
  : undefined
