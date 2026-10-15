import { create } from "zustand"

export type AuthIntent = "login" | "register"

type AppState = {
  /** True once the user has passed the Launch screen in this session (not persisted). */
  hasStarted: boolean
  /** Which auth screen opens first after Launch. */
  authIntent: AuthIntent
  start: (intent?: AuthIntent) => void
}

export const useAppStore = create<AppState>()((set) => ({
  hasStarted: false,
  authIntent: "login",
  start: (intent = "login") => set({ hasStarted: true, authIntent: intent }),
}))
