import { useLogout, useNotification } from "@refinedev/core"
import { useEffect } from "react"
import { onSessionExpired } from "@/api/http"

/**
 * When the API can no longer renew the session (the refresh token was refused), the person is sent
 * to the login page, whatever page they were on and whichever request found out.
 */
export function SessionWatcher() {
  const { mutate: logout } = useLogout()
  const { open } = useNotification()

  useEffect(
    () =>
      onSessionExpired(() => {
        open?.({
          type: "error",
          message: "Phiên đăng nhập đã hết hạn",
          description: "Vui lòng đăng nhập lại.",
        })
        logout()
      }),
    [logout, open],
  )

  return null
}
