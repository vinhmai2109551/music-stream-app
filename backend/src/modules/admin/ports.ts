import type { DailyCount, Page } from "../../shared/index.js"
import type { AccessChange, AdminUserFilter, AdminUserView } from "../users/index.js"

/** The accounts, as the admin services need them. The users module satisfies it as it is. */
export interface UserAdministration {
  listForAdmin(filter: AdminUserFilter): Promise<Page<AdminUserView>>
  changeAccess(id: string, change: AccessChange): Promise<AdminUserView>
  remove(id: string): Promise<void>
}

export const USER_ADMINISTRATION = Symbol("USER_ADMINISTRATION")

/** The logins that are open. The auth module satisfies it as it is. */
export interface SessionControl {
  /** Ends every login of a user: none of their refresh tokens can refresh again. */
  revokeAllSessions(userId: string): Promise<void>
}

export const SESSION_CONTROL = Symbol("SESSION_CONTROL")

export interface TopTrack {
  id: string
  title: string
  artist: string
  coverUrl: string
  plays: number
}

/** Where the numbers of the dashboard come from (see `ModulesDashboardSource`). */
export interface DashboardSource {
  counts(): Promise<{
    tracks: number
    artists: number
    albums: number
    users: number
    /** The plays of all tracks added up. */
    plays: number
  }>
  /** Listens per day over the last `days` days; days without any may be missing. */
  playsByDay(days: number, timeZone: string): Promise<DailyCount[]>
  /** Accounts made per day over the last `days` days; days without any may be missing. */
  newUsersByDay(days: number, timeZone: string): Promise<DailyCount[]>
  /** The most played tracks, best first. */
  topTracks(limit: number): Promise<TopTrack[]>
}

export const DASHBOARD_SOURCE = Symbol("DASHBOARD_SOURCE")
