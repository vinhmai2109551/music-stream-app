import { beforeAll, describe, expect, it, jest } from "@jest/globals"
import type { JwtService } from "@nestjs/jwt"
import { hash } from "bcryptjs"
import { Role } from "../../generated/prisma/enums.js"
import type { UsersService } from "../users/index.js"
import type { RefreshTokenService } from "./refresh-token.service.js"

// The service names its collaborators by class (for Nest), which would load the whole users and
// prisma modules - and, with them, a CommonJS package that Jest's ESM mode cannot load. Only the
// class names are needed here; the behaviour comes from the fakes below.
jest.unstable_mockModule("../users/index.js", () => ({ UsersService: class UsersService {} }))
jest.unstable_mockModule("./refresh-token.service.js", () => ({
  RefreshTokenService: class RefreshTokenService {},
}))
const { AuthService } = await import("./auth.service.js")

const PASSWORD = "password123"
const USER = {
  id: "u1",
  email: "a@example.com",
  name: "A",
  avatarUrl: null,
  role: Role.USER,
  isPremium: false,
}

let passwordHash = ""
beforeAll(async () => {
  passwordHash = await hash(PASSWORD, 4)
})

function setup(opts: { banned?: boolean; unknownToken?: boolean } = {}) {
  const users = {
    findCredentials: jest.fn(async (_email: string) => ({
      ...USER,
      passwordHash,
      isBanned: !!opts.banned,
    })),
    getAccessState: jest.fn(async (_id: string) => ({ role: Role.USER, isBanned: !!opts.banned })),
    getView: jest.fn(async (_id: string) => USER),
  }
  const jwt = { signAsync: jest.fn(async () => "access-token") }
  const tokens = {
    issue: jest.fn(async (_userId: string) => "refresh-token"),
    ownerOf: jest.fn(async (_raw: string) => (opts.unknownToken ? null : USER.id)),
    rotate: jest.fn(async (_raw: string) => ({ userId: USER.id, refreshToken: "next-token" })),
    revoke: jest.fn(async (_raw: string) => undefined),
    revokeAllOf: jest.fn(async (_userId: string) => undefined),
  }
  const service = new AuthService(
    users as unknown as UsersService,
    jwt as unknown as JwtService,
    tokens as unknown as RefreshTokenService,
  )
  return { service, users, tokens }
}

const status = (error: unknown) => (error as { getStatus(): number }).getStatus()

describe("AuthService.login", () => {
  it("logs a user in and does not leak the ban flag or the hash", async () => {
    const { service } = setup()

    const result = await service.login({ email: USER.email, password: PASSWORD })

    expect(result).toMatchObject({ accessToken: "access-token", refreshToken: "refresh-token" })
    expect(result.user).toEqual(USER)
  })

  it("answers 403 to a banned user with the right password, and issues no token", async () => {
    const { service, tokens } = setup({ banned: true })

    const error = await service.login({ email: USER.email, password: PASSWORD }).catch((e) => e)

    expect(status(error)).toBe(403)
    expect(error.message).toMatch(/banned/i)
    expect(tokens.issue).not.toHaveBeenCalled()
  })

  it("answers 401 to a banned user with the wrong password, so a stranger learns nothing", async () => {
    const { service } = setup({ banned: true })

    const error = await service
      .login({ email: USER.email, password: "wrong-password" })
      .catch((e) => e)

    expect(status(error)).toBe(401)
  })
})

describe("AuthService.refresh", () => {
  it("rotates the token of a user in good standing", async () => {
    const { service, tokens } = setup()

    const result = await service.refresh("old-token")

    expect(tokens.rotate).toHaveBeenCalledWith("old-token")
    expect(result).toEqual({ accessToken: "access-token", refreshToken: "next-token" })
  })

  it("answers 403 to a banned user (not 401), and rotates nothing", async () => {
    const { service, tokens } = setup({ banned: true })

    const error = await service.refresh("old-token").catch((e) => e)

    expect(status(error)).toBe(403)
    expect(tokens.rotate).not.toHaveBeenCalled()
  })

  it("takes the new token back when a ban lands between the check and the rotation", async () => {
    const { service, tokens, users } = setup()
    users.getAccessState
      .mockResolvedValueOnce({ role: Role.USER, isBanned: false }) // before the rotation
      .mockResolvedValueOnce({ role: Role.USER, isBanned: true }) // after it

    const error = await service.refresh("old-token").catch((e) => e)

    expect(status(error)).toBe(403)
    expect(tokens.rotate).toHaveBeenCalledTimes(1)
    expect(tokens.revokeAllOf).toHaveBeenCalledWith(USER.id)
  })

  it("leaves a token nobody owns to the rotation, which answers 401", async () => {
    const { service, tokens, users } = setup({ unknownToken: true })

    await service.refresh("unknown")

    // No owner, so no check before the rotation; only the one after it (the real rotation throws 401).
    expect(users.getAccessState).toHaveBeenCalledTimes(1)
    expect(tokens.rotate).toHaveBeenCalledWith("unknown")
  })
})

describe("AuthService.revokeAllSessions", () => {
  it("revokes every refresh token of the user", async () => {
    const { service, tokens } = setup()

    await service.revokeAllSessions("u1")

    expect(tokens.revokeAllOf).toHaveBeenCalledWith("u1")
  })
})
