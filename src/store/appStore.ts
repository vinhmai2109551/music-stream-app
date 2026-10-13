import { create } from "zustand"

type AppState = {
  /** True once the user has passed the Launch screen in this session (not persisted). */
  hasStarted: boolean
  start: () => void
}

export const useAppStore = create<AppState>()((set) => ({
  hasStarted: false,
  start: () => set({ hasStarted: true }),
}))
