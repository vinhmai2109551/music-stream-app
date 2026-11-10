import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { BadRequestException, Logger, ServiceUnavailableException } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import type { ObjectStorage } from "./object-storage.js"
import { UploadsService } from "./uploads.service.js"

const PUBLIC_URL = "https://media.unit.test"
const MEGABYTE = 1024 * 1024
const AVATAR_KEY = /^avatars\/user-1\/[a-z0-9]+\.(jpg|png|webp)$/

function config(env: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => env[key] } as unknown as ConfigService
}

function fakeStorage() {
  return {
    presignPut: jest.fn<ObjectStorage["presignPut"]>(
      async ({ key }) => `https://upload.test/${key}`,
    ),
    remove: jest.fn<ObjectStorage["remove"]>(async () => undefined),
  }
}

describe("UploadsService avatars", () => {
  let storage: ReturnType<typeof fakeStorage>
  let service: UploadsService

  beforeEach(() => {
    jest.restoreAllMocks()
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
    storage = fakeStorage()
    service = new UploadsService(config({ R2_PUBLIC_URL: PUBLIC_URL }), storage)
  })

  describe("presignAvatar", () => {
    it("signs an upload into the folder of the user and returns where it will be served", async () => {
      const result = await service.presignAvatar("user-1", {
        contentType: "image/jpeg",
        sizeBytes: 90_000,
      })

      expect(result.key).toMatch(AVATAR_KEY)
      expect(result.key.endsWith(".jpg")).toBe(true)
      expect(result.publicUrl).toBe(`${PUBLIC_URL}/${result.key}`)
      expect(result.uploadUrl).toBe(`https://upload.test/${result.key}`)
      expect(storage.presignPut).toHaveBeenCalledWith({
        key: result.key,
        contentType: "image/jpeg",
        sizeBytes: 90_000,
      })
    })

    it("uses a new key for every upload", async () => {
      const request = { contentType: "image/png", sizeBytes: 100 }
      const [a, b] = await Promise.all([
        service.presignAvatar("user-1", request),
        service.presignAvatar("user-1", request),
      ])

      expect(a.key).not.toBe(b.key)
    })

    it("accepts exactly 2 MB", async () => {
      await expect(
        service.presignAvatar("user-1", { contentType: "image/webp", sizeBytes: 2 * MEGABYTE }),
      ).resolves.toMatchObject({ key: expect.stringMatching(AVATAR_KEY) })
    })

    it.each([
      ["a type that is not a picture", { contentType: "audio/mpeg", sizeBytes: 100 }],
      ["a gif", { contentType: "image/gif", sizeBytes: 100 }],
      ["a picture over 2 MB", { contentType: "image/jpeg", sizeBytes: 2 * MEGABYTE + 1 }],
      ["a size of zero", { contentType: "image/jpeg", sizeBytes: 0 }],
    ])("rejects %s without signing anything", async (_name, request) => {
      await expect(service.presignAvatar("user-1", request)).rejects.toBeInstanceOf(
        BadRequestException,
      )
      expect(storage.presignPut).not.toHaveBeenCalled()
    })

    it("answers 503 when storage is not configured", async () => {
      const unconfigured = new UploadsService(config({}))

      await expect(
        unconfigured.presignAvatar("user-1", { contentType: "image/png", sizeBytes: 100 }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException)
    })
  })

  describe("assertAvatarOf", () => {
    const own = `${PUBLIC_URL}/avatars/user-1/abc123.jpg`

    it("accepts a picture the user uploaded", () => {
      expect(() => service.assertAvatarOf("user-1", own)).not.toThrow()
    })

    it("has nothing to check when the request carries no avatarUrl", () => {
      expect(() => service.assertAvatarOf("user-1", undefined)).not.toThrow()
    })

    it.each([
      ["another user's picture", `${PUBLIC_URL}/avatars/user-2/abc123.jpg`],
      ["an admin upload in the same bucket", `${PUBLIC_URL}/image/2026/10/abc123.jpg`],
      ["a picture on another site", "https://example.com/avatars/user-1/abc123.jpg"],
      ["a look-alike host", `${PUBLIC_URL}.evil.com/avatars/user-1/abc123.jpg`],
      ["a path that climbs out of the folder", `${PUBLIC_URL}/avatars/user-1/../user-2/abc123.jpg`],
    ])("rejects %s", (_name, url) => {
      expect(() => service.assertAvatarOf("user-1", url)).toThrow(BadRequestException)
    })

    it("tells the user where their pictures go", () => {
      expect(() => service.assertAvatarOf("user-1", "https://example.com/a.png")).toThrow(
        `${PUBLIC_URL}/avatars/user-1/`,
      )
    })

    it("accepts any address while no public bucket address is configured (development)", () => {
      const development = new UploadsService(config({}), storage)

      expect(() => development.assertAvatarOf("user-1", "https://example.com/a.png")).not.toThrow()
    })
  })

  describe("deleteAvatar", () => {
    it("deletes the object of the user's old avatar", async () => {
      await service.deleteAvatar("user-1", `${PUBLIC_URL}/avatars/user-1/abc123.jpg`)

      expect(storage.remove).toHaveBeenCalledWith("avatars/user-1/abc123.jpg")
    })

    it.each([
      ["no old avatar", null],
      ["an outside address", "https://example.com/avatars/user-1/abc123.jpg"],
      ["another user's picture", `${PUBLIC_URL}/avatars/user-2/abc123.jpg`],
      ["a file that is not an avatar", `${PUBLIC_URL}/audio/2026/10/abc123.mp3`],
    ])("leaves %s alone", async (_name, url) => {
      await service.deleteAvatar("user-1", url)

      expect(storage.remove).not.toHaveBeenCalled()
    })

    it("only logs when the delete fails, and never throws", async () => {
      storage.remove.mockRejectedValue(new Error("R2 is down"))
      const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)

      await expect(
        service.deleteAvatar("user-1", `${PUBLIC_URL}/avatars/user-1/abc123.jpg`),
      ).resolves.toBeUndefined()

      expect(warn).toHaveBeenCalledWith(expect.stringContaining("avatars/user-1/abc123.jpg"))
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("R2 is down"))
    })

    it("does nothing while storage is not configured", async () => {
      const unconfigured = new UploadsService(config({ R2_PUBLIC_URL: PUBLIC_URL }))

      await expect(
        unconfigured.deleteAvatar("user-1", `${PUBLIC_URL}/avatars/user-1/abc123.jpg`),
      ).resolves.toBeUndefined()
    })
  })
})
