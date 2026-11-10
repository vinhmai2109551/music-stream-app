const ACCESS_KEY = "music-stream-admin.accessToken"
const REFRESH_KEY = "music-stream-admin.refreshToken"

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Storage can be blocked (private window): the session then lasts until the page closes.
  }
}

// Kept in memory as well, so a blocked storage does not log the person out on the next request.
let memory: TokenPair | null = null

export const tokenStore = {
  get accessToken(): string | null {
    return read(ACCESS_KEY) ?? memory?.accessToken ?? null
  },
  get refreshToken(): string | null {
    return read(REFRESH_KEY) ?? memory?.refreshToken ?? null
  },
  save(pair: TokenPair): void {
    memory = pair
    write(ACCESS_KEY, pair.accessToken)
    write(REFRESH_KEY, pair.refreshToken)
  },
  clear(): void {
    memory = null
    write(ACCESS_KEY, null)
    write(REFRESH_KEY, null)
  },
}
