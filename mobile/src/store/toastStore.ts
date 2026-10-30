import { create } from "zustand"

const TOAST_DURATION_MS = 2200

type ToastState = {
  message: string | null
  show: (message: string) => void
}

let timer: ReturnType<typeof setTimeout> | null = null

/** App-wide toast, so stores and screens can both report something (rendered by ToastHost). */
export const useToastStore = create<ToastState>()((set) => ({
  message: null,
  show: (message) => {
    if (timer) clearTimeout(timer)
    set({ message })
    timer = setTimeout(() => set({ message: null }), TOAST_DURATION_MS)
  },
}))

export const showToast = (message: string): void => useToastStore.getState().show(message)
