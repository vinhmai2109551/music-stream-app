import { describe, expect, it } from "@jest/globals"
import { createR2Presigner, PRESIGN_EXPIRES_SECONDS } from "./r2-presigner.js"

const presign = createR2Presigner({
  accountId: "acct123",
  accessKeyId: "AKIAEXAMPLE",
  secretAccessKey: "not-a-real-secret",
  bucket: "my-bucket",
})

describe("createR2Presigner", () => {
  it("signs a PUT URL on the account's R2 endpoint, valid for 5 minutes", async () => {
    const url = new URL(
      await presign({ key: "audio/2026/10/x.mp3", contentType: "audio/mpeg", sizeBytes: 1234 }),
    )

    expect(PRESIGN_EXPIRES_SECONDS).toBe(300)
    expect(url.protocol).toBe("https:")
    expect(url.host).toContain("acct123.r2.cloudflarestorage.com")
    expect(url.pathname).toContain("audio/2026/10/x.mp3")
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300")
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256")
    expect(url.searchParams.get("X-Amz-Credential")).toContain("AKIAEXAMPLE/")
    expect(url.searchParams.get("X-Amz-Credential")).toContain("/auto/s3/aws4_request")
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/)
  })

  it("signs the content type and length, so the uploaded file must match what was declared", async () => {
    const url = new URL(
      await presign({ key: "image/2026/10/x.png", contentType: "image/png", sizeBytes: 99 }),
    )

    const signedHeaders = url.searchParams.get("X-Amz-SignedHeaders") ?? ""
    expect(signedHeaders.split(";")).toEqual(
      expect.arrayContaining(["content-length", "content-type"]),
    )
  })

  it("does not add checksum parameters that R2 rejects", async () => {
    const url = new URL(
      await presign({ key: "image/2026/10/x.png", contentType: "image/png", sizeBytes: 99 }),
    )

    expect(
      [...url.searchParams.keys()].some((name) => name.toLowerCase().includes("checksum")),
    ).toBe(false)
  })

  it("produces a different signature for a different object", async () => {
    const request = { contentType: "image/png", sizeBytes: 99 }
    const a = await presign({ key: "image/2026/10/a.png", ...request })
    const b = await presign({ key: "image/2026/10/b.png", ...request })

    expect(new URL(a).searchParams.get("X-Amz-Signature")).not.toBe(
      new URL(b).searchParams.get("X-Amz-Signature"),
    )
  })
})
