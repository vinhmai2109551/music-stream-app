import { describe, expect, it } from "vitest"
import { checkFile, resolveContentType } from "./upload"

const MB = 1024 * 1024
const file = (name: string, type: string, size = 1000) => ({ name, type, size })

describe("resolveContentType", () => {
  it("takes the type the browser reports when the API knows it", () => {
    expect(resolveContentType(file("a.mp3", "audio/mpeg"), "audio")).toBe("audio/mpeg")
    expect(resolveContentType(file("a.png", "image/png"), "image")).toBe("image/png")
  })

  it("falls back to the extension when the browser reports another type", () => {
    expect(resolveContentType(file("song.m4a", "audio/x-m4a"), "audio")).toBe("audio/mp4")
    expect(resolveContentType(file("song.mp3", "audio/mp3"), "audio")).toBe("audio/mpeg")
    expect(resolveContentType(file("song.MP3", ""), "audio")).toBe("audio/mpeg")
    expect(resolveContentType(file("cover.JPEG", ""), "image")).toBe("image/jpeg")
  })

  it("is null for a type the API does not take", () => {
    expect(resolveContentType(file("a.wav", "audio/wav"), "audio")).toBeNull()
    expect(resolveContentType(file("a.gif", "image/gif"), "image")).toBeNull()
    expect(resolveContentType(file("noextension", ""), "audio")).toBeNull()
  })

  it("does not take an image as audio or the other way round", () => {
    expect(resolveContentType(file("a.png", "image/png"), "audio")).toBeNull()
    expect(resolveContentType(file("a.mp3", "audio/mpeg"), "image")).toBeNull()
  })
})

describe("checkFile", () => {
  it("accepts a file of the right type and size", () => {
    expect(checkFile(file("a.mp3", "audio/mpeg", 3 * MB), "audio")).toEqual({
      ok: true,
      contentType: "audio/mpeg",
    })
  })

  it("accepts a file of exactly the limit and refuses one byte more", () => {
    expect(checkFile(file("a.mp3", "audio/mpeg", 20 * MB), "audio").ok).toBe(true)
    expect(checkFile(file("a.mp3", "audio/mpeg", 20 * MB + 1), "audio").ok).toBe(false)
    expect(checkFile(file("a.png", "image/png", 5 * MB), "image").ok).toBe(true)
    expect(checkFile(file("a.png", "image/png", 5 * MB + 1), "image").ok).toBe(false)
  })

  it("explains why a file is refused", () => {
    const wrongType = checkFile(file("a.wav", "audio/wav"), "audio")
    const tooBig = checkFile(file("a.png", "image/png", 6 * MB), "image")
    const empty = checkFile(file("a.png", "image/png", 0), "image")

    expect(wrongType).toMatchObject({ ok: false, message: expect.stringContaining("mp3") })
    expect(tooBig).toMatchObject({ ok: false, message: expect.stringContaining("5 MB") })
    expect(empty).toMatchObject({ ok: false })
  })
})
