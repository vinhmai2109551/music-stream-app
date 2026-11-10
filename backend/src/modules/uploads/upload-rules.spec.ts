import { describe, expect, it } from "@jest/globals"
import {
  avatarKeyOf,
  buildAvatarKey,
  buildObjectKey,
  checkUpload,
  isUnderPublicUrl,
  UPLOAD_KINDS,
  UPLOAD_RULES,
  type UploadKind,
} from "./upload-rules.js"

const MEGABYTE = 1024 * 1024

describe("checkUpload", () => {
  describe("content type whitelist", () => {
    it.each([
      ["audio", "audio/mpeg", "mp3"],
      ["audio", "audio/mp4", "m4a"],
      ["audio", "audio/aac", "aac"],
      ["image", "image/jpeg", "jpg"],
      ["image", "image/png", "png"],
      ["image", "image/webp", "webp"],
    ] as [UploadKind, string, string][])("accepts %s %s as .%s", (kind, contentType, extension) => {
      expect(checkUpload(kind, contentType, 1000)).toEqual({ ok: true, contentType, extension })
    })

    it.each([
      ["audio", "audio/wav"],
      ["audio", "audio/ogg"],
      ["audio", "video/mp4"],
      ["audio", "application/octet-stream"],
      ["audio", "image/png"], // right family, wrong kind
      ["image", "image/gif"],
      ["image", "image/svg+xml"],
      ["image", "audio/mpeg"], // right family, wrong kind
      ["image", "application/pdf"],
      ["audio", ""],
      ["image", "png"],
    ] as [UploadKind, string][])("rejects %s %j", (kind, contentType) => {
      const result = checkUpload(kind, contentType, 1000)
      expect(result.ok).toBe(false)
    })

    it("lists the allowed types in the error message", () => {
      const result = checkUpload("audio", "audio/wav", 1000)
      expect(result).toEqual({
        ok: false,
        message: "audio uploads must be one of: audio/mpeg, audio/mp4, audio/aac",
      })
    })

    it("ignores letter case and surrounding spaces, and returns the normalized type", () => {
      expect(checkUpload("image", "  Image/PNG ", 1000)).toEqual({
        ok: true,
        contentType: "image/png",
        extension: "png",
      })
    })

    it("does not accept parameters such as a charset", () => {
      expect(checkUpload("audio", "audio/mpeg; charset=utf-8", 1000).ok).toBe(false)
    })
  })

  describe("size limits", () => {
    it("allows audio up to exactly 20 MB and rejects one byte more", () => {
      expect(UPLOAD_RULES.audio.maxBytes).toBe(20 * MEGABYTE)
      expect(checkUpload("audio", "audio/mpeg", 20 * MEGABYTE).ok).toBe(true)
      expect(checkUpload("audio", "audio/mpeg", 20 * MEGABYTE + 1)).toEqual({
        ok: false,
        message: "audio files can be at most 20 MB",
      })
    })

    it("allows images up to exactly 5 MB and rejects one byte more", () => {
      expect(UPLOAD_RULES.image.maxBytes).toBe(5 * MEGABYTE)
      expect(checkUpload("image", "image/jpeg", 5 * MEGABYTE).ok).toBe(true)
      expect(checkUpload("image", "image/jpeg", 5 * MEGABYTE + 1)).toEqual({
        ok: false,
        message: "image files can be at most 5 MB",
      })
    })

    it("a size fine for audio can be too big for an image", () => {
      expect(checkUpload("audio", "audio/mpeg", 6 * MEGABYTE).ok).toBe(true)
      expect(checkUpload("image", "image/png", 6 * MEGABYTE).ok).toBe(false)
    })

    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects size %s", (size) => {
      expect(checkUpload("audio", "audio/mpeg", size)).toEqual({
        ok: false,
        message: "sizeBytes must be a positive whole number",
      })
    })

    it("accepts a 1 byte file", () => {
      expect(checkUpload("image", "image/png", 1).ok).toBe(true)
    })
  })

  it("checks the type before the size", () => {
    const result = checkUpload("audio", "audio/wav", 999 * MEGABYTE)
    expect(result.ok === false && result.message).toContain("must be one of")
  })
})

describe("the avatar rule", () => {
  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ])("accepts %s as .%s", (contentType, extension) => {
    expect(checkUpload("avatar", contentType, 1000)).toEqual({ ok: true, contentType, extension })
  })

  it.each(["image/gif", "image/svg+xml", "audio/mpeg", "application/pdf", "video/mp4", ""])(
    "rejects %j",
    (contentType) => {
      expect(checkUpload("avatar", contentType, 1000).ok).toBe(false)
    },
  )

  it("lists the allowed types in the error message", () => {
    expect(checkUpload("avatar", "image/gif", 1000)).toEqual({
      ok: false,
      message: "avatar uploads must be one of: image/jpeg, image/png, image/webp",
    })
  })

  it("allows up to exactly 2 MB and rejects one byte more", () => {
    expect(UPLOAD_RULES.avatar.maxBytes).toBe(2 * MEGABYTE)
    expect(checkUpload("avatar", "image/jpeg", 2 * MEGABYTE).ok).toBe(true)
    expect(checkUpload("avatar", "image/jpeg", 2 * MEGABYTE + 1)).toEqual({
      ok: false,
      message: "avatar files can be at most 2 MB",
    })
  })

  it("is stricter than a normal image, which may be 5 MB", () => {
    expect(checkUpload("image", "image/jpeg", 3 * MEGABYTE).ok).toBe(true)
    expect(checkUpload("avatar", "image/jpeg", 3 * MEGABYTE).ok).toBe(false)
  })

  it("is not something an admin can ask for through the general endpoint", () => {
    expect(UPLOAD_KINDS).toEqual(["audio", "image"])
  })
})

describe("buildAvatarKey", () => {
  it("is avatars/{userId}/{id}.{ext}", () => {
    expect(buildAvatarKey({ userId: "usr1", extension: "jpg", id: "clx1abc" })).toBe(
      "avatars/usr1/clx1abc.jpg",
    )
  })

  it("puts different users in different folders", () => {
    const a = buildAvatarKey({ userId: "usr1", extension: "png", id: "x" })
    const b = buildAvatarKey({ userId: "usr2", extension: "png", id: "x" })
    expect(a.split("/")[1]).not.toBe(b.split("/")[1])
  })
})

describe("avatarKeyOf", () => {
  const base = "https://pub-abc.r2.dev"
  const own = `${base}/avatars/usr1/clx1abc.jpg`

  it("returns the key of the user's own avatar", () => {
    expect(avatarKeyOf(own, base, "usr1")).toBe("avatars/usr1/clx1abc.jpg")
    expect(avatarKeyOf(`${base}/avatars/usr1/a9.webp`, `${base}/`, "usr1")).toBe(
      "avatars/usr1/a9.webp",
    )
  })

  it("works with a path prefix on the public address", () => {
    const prefixed = "https://cdn.example.com/media"
    expect(avatarKeyOf(`${prefixed}/avatars/usr1/x.png`, prefixed, "usr1")).toBe(
      "avatars/usr1/x.png",
    )
    expect(avatarKeyOf("https://cdn.example.com/avatars/usr1/x.png", prefixed, "usr1")).toBeNull()
  })

  it.each([
    ["another user's avatar", `${base}/avatars/usr2/clx1abc.jpg`],
    ["a folder that only starts like the user id", `${base}/avatars/usr10/clx1abc.jpg`],
    ["an admin upload", `${base}/image/2026/10/clx1abc.jpg`],
    ["audio", `${base}/audio/2026/10/clx1abc.mp3`],
    ["an outside host", "https://example.com/avatars/usr1/clx1abc.jpg"],
    ["a look-alike host", `${base}.evil.com/avatars/usr1/clx1abc.jpg`],
    ["a path that climbs out of the folder", `${base}/avatars/usr1/../usr2/clx1abc.jpg`],
    ["an encoded climb", `${base}/avatars/usr1/%2e%2e/usr2/clx1abc.jpg`],
    ["a nested path", `${base}/avatars/usr1/sub/clx1abc.jpg`],
    ["a file type that is not a picture", `${base}/avatars/usr1/clx1abc.mp3`],
    ["a query string", `${own}?x=1`],
    ["a fragment", `${own}#x`],
    ["the folder itself", `${base}/avatars/usr1/`],
    ["the bucket root", base],
    ["not a url", "not a url"],
    ["an empty string", ""],
  ])("returns null for %s", (_name, url) => {
    expect(avatarKeyOf(url, base, "usr1")).toBeNull()
  })
})

describe("buildObjectKey", () => {
  const id = "clx1abc2d0000"

  it("is {kind}/{yyyy}/{mm}/{id}.{ext}", () => {
    const now = new Date(Date.UTC(2026, 9, 30, 12))
    expect(buildObjectKey({ kind: "audio", extension: "mp3", id, now })).toBe(
      "audio/2026/10/clx1abc2d0000.mp3",
    )
  })

  it("pads single-digit months", () => {
    const now = new Date(Date.UTC(2027, 0, 5))
    expect(buildObjectKey({ kind: "image", extension: "webp", id, now })).toBe(
      "image/2027/01/clx1abc2d0000.webp",
    )
  })

  it("uses UTC, so the last minute of a month stays in that month", () => {
    const now = new Date("2026-11-30T23:59:59.999Z")
    expect(buildObjectKey({ kind: "image", extension: "png", id, now })).toContain("/2026/11/")
  })
})

describe("isUnderPublicUrl", () => {
  const base = "https://pub-abc.r2.dev"

  it.each([
    "https://pub-abc.r2.dev/audio/2026/10/x.mp3",
    "https://pub-abc.r2.dev/a",
    "HTTPS://PUB-ABC.R2.DEV/audio/x.mp3", // scheme and host are case-insensitive
  ])("accepts %s", (url) => {
    expect(isUnderPublicUrl(url, base)).toBe(true)
  })

  it.each([
    "https://other.example.com/audio/x.mp3",
    "http://pub-abc.r2.dev/audio/x.mp3", // different scheme
    "https://pub-abc.r2.dev.evil.com/audio/x.mp3", // look-alike host
    "https://pub-abc.r2.dev@evil.com/audio/x.mp3", // credentials trick
    "https://pub-abc.r2.dev", // the bucket root is not a file
    "not a url",
    "",
  ])("rejects %j", (url) => {
    expect(isUnderPublicUrl(url, base)).toBe(false)
  })

  it("works whether or not the configured address ends with a slash", () => {
    expect(isUnderPublicUrl("https://pub-abc.r2.dev/x.png", `${base}/`)).toBe(true)
  })

  it("supports a custom domain with a path prefix", () => {
    const prefixed = "https://cdn.example.com/media"
    expect(isUnderPublicUrl("https://cdn.example.com/media/audio/x.mp3", prefixed)).toBe(true)
    expect(isUnderPublicUrl("https://cdn.example.com/other/x.mp3", prefixed)).toBe(false)
    expect(isUnderPublicUrl("https://cdn.example.com/media-private/x.mp3", prefixed)).toBe(false)
  })
})
