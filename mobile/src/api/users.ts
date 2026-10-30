import { api } from "./client"
import type { UpdateProfileInput, User } from "./types"

export const getProfile = () => api.get<User>("/users/me")

export const updateProfile = (input: UpdateProfileInput) => api.patch<User>("/users/me", input)

/** Activates Premium (demo: there is no payment). */
export const subscribe = () => api.post<User>("/users/me/subscribe")
