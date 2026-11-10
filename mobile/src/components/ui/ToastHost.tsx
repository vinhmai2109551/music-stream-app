import { useToastStore } from "@/store/toastStore"
import { Toast } from "./Toast"

/** Mount once, near the root: shows whatever `showToast()` was last asked to show. */
export function ToastHost() {
  const message = useToastStore((state) => state.message)
  return message ? <Toast message={message} /> : null
}
