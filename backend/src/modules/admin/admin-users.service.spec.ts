import { describe, expect, it, jest } from "@jest/globals"
import { Role } from "../../generated/prisma/enums.js"
import type { AdminUserView } from "../users/index.js"
import { AdminUsersService } from "./admin-users.service.js"
import type { SessionControl, UserAdministration } from "./ports.js"

const ME = "admin-1"
const OTHER = "user-2"

const view = (patch: Partial<AdminUserView> = {}): AdminUserView => ({
  id: OTHER,
  email: "other@example.com",
  name: "Other",
  avatarUrl: null,
  role: Role.USER,
  isPremium: false,
  isBanned: false,
  createdAt: new Date("2026-11-01T00:00:00Z"),
  ...patch,
})

function setup() {
  const users = {
    listForAdmin: jest.fn<UserAdministration["listForAdmin"]>(async () => ({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    })),
    changeAccess: jest.fn<UserAdministration["changeAccess"]>(async (_id, change) => view(change)),
    remove: jest.fn<UserAdministration["remove"]>(async () => undefined),
  }
  const sessions = {
    revokeAllSessions: jest.fn<SessionControl["revokeAllSessions"]>(async () => undefined),
  }
  return { service: new AdminUsersService(users, sessions), users, sessions }
}

const status = (error: unknown) => (error as { getStatus(): number }).getStatus()

describe("AdminUsersService.update", () => {
  it("bans another user and ends every session of theirs", async () => {
    const { service, users, sessions } = setup()

    const result = await service.update(ME, OTHER, { isBanned: true })

    expect(users.changeAccess).toHaveBeenCalledWith(OTHER, { isBanned: true })
    expect(sessions.revokeAllSessions).toHaveBeenCalledWith(OTHER)
    expect(result.isBanned).toBe(true)
  })

  it("does not end any session when a user is let in again", async () => {
    const { service, sessions } = setup()

    await service.update(ME, OTHER, { isBanned: false })

    expect(sessions.revokeAllSessions).not.toHaveBeenCalled()
  })

  it("does not end any session when only the role changes", async () => {
    const { service, users, sessions } = setup()

    await service.update(ME, OTHER, { role: Role.ADMIN })

    expect(users.changeAccess).toHaveBeenCalledWith(OTHER, { role: Role.ADMIN })
    expect(sessions.revokeAllSessions).not.toHaveBeenCalled()
  })

  it("refuses to let an admin ban themselves, touching nothing", async () => {
    const { service, users, sessions } = setup()

    const error = await service.update(ME, ME, { isBanned: true }).catch((e) => e)

    expect(status(error)).toBe(400)
    expect(users.changeAccess).not.toHaveBeenCalled()
    expect(sessions.revokeAllSessions).not.toHaveBeenCalled()
  })

  it("refuses to let an admin remove their own admin role", async () => {
    const { service, users } = setup()

    const error = await service.update(ME, ME, { role: Role.USER }).catch((e) => e)

    expect(status(error)).toBe(400)
    expect(users.changeAccess).not.toHaveBeenCalled()
  })

  it("refuses a self-ban hidden in a request that also keeps the admin role", async () => {
    const { service, users } = setup()

    const error = await service.update(ME, ME, { role: Role.ADMIN, isBanned: true }).catch((e) => e)

    expect(status(error)).toBe(400)
    expect(users.changeAccess).not.toHaveBeenCalled()
  })

  it("lets an admin repeat what is already true of their own account", async () => {
    const { service, users } = setup()

    await service.update(ME, ME, { role: Role.ADMIN, isBanned: false })

    expect(users.changeAccess).toHaveBeenCalledTimes(1)
  })

  it("refuses an empty change", async () => {
    const { service, users } = setup()

    const error = await service.update(ME, OTHER, {}).catch((e) => e)

    expect(status(error)).toBe(400)
    expect(users.changeAccess).not.toHaveBeenCalled()
  })

  it("ends no session when the change itself fails (unknown user)", async () => {
    const { service, users, sessions } = setup()
    users.changeAccess.mockRejectedValueOnce(new Error("Record not found"))

    await expect(service.update(ME, "nobody", { isBanned: true })).rejects.toThrow()

    expect(sessions.revokeAllSessions).not.toHaveBeenCalled()
  })
})

describe("AdminUsersService.remove", () => {
  it("deletes another user", async () => {
    const { service, users } = setup()

    await service.remove(ME, OTHER)

    expect(users.remove).toHaveBeenCalledWith(OTHER)
  })

  it("refuses to let an admin delete themselves", async () => {
    const { service, users } = setup()

    const error = await service.remove(ME, ME).catch((e) => e)

    expect(status(error)).toBe(400)
    expect(users.remove).not.toHaveBeenCalled()
  })
})

describe("AdminUsersService.list", () => {
  it("hands the filter to the users module", async () => {
    const { service, users } = setup()
    const filter = { page: 2, limit: 10, q: "an", role: Role.USER, banned: true }

    await service.list(filter)

    expect(users.listForAdmin).toHaveBeenCalledWith(filter)
  })
})
