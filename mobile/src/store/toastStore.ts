import { create } from "zustand"

const TOAST_DURATION_MS = 2200

type ToastState = {
  message: string | null
  /** `durationMs` is for messages that take longer to read. */
  show: (message: string, durationMs?: number) => void
}

let timer: ReturnType<typeof setTimeout> | null = null

/** App-wide toast, so stores and screens can both report something (rendered by ToastHost). */
export const useToastStore = create<ToastState>()((set) => ({
  message: null,
  show: (message, durationMs = TOAST_DURATION_MS) => {
    if (timer) clearTimeout(timer)
    set({ message })
    timer = setTimeout(() => set({ message: null }), durationMs)
  },
}))

export const showToast = (message: string, durationMs?: number): void =>
  useToastStore.getState().show(message, durationMs)
