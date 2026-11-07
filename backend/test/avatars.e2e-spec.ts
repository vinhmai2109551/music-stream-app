import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import { startTestServer, uniqueEmail, type TestServer } from "./helpers/test-server.js"

const PUBLIC_URL = "https://media.e2e.test"
const MEGABYTE = 1024 * 1024
const THROTTLE_LIMIT = 3

// The credentials are fake: presigning is a local computation and never contacts R2.
const R2_ENV = {
  R2_ACCOUNT_ID: "e2eaccount",
  R2_ACCESS_KEY_ID: "AKIAE2EEXAMPLE",
  R2_SECRET_ACCESS_KEY: "e2e-not-a-real-secret",
  R2_BUCKET: "e2e-bucket",
  R2_PUBLIC_URL: PUBLIC_URL,
}

interface Account {
  id: string
  token: string
}

async function createAccount(server: TestServer): Promise<Account> {
  const credentials = { email: uniqueEmail(), name: "Avatar tester", password: "password123" }
  const registered = await request(server.url).post("/api/auth/register").send(credentials)
  expect(registered.status).toBe(201)
  const body = registered.body as { accessToken: string; user: { id: string } }
  return { id: body.user.id, token: body.accessToken }
}

describe("Profile pictures (e2e)", () => {
  let server: TestServer
  let me: Account
  let other: Account
  const http = () => request(server.url)
  const auth = (account: Account) => ({ Authorization: `Bearer ${account.token}` })
  const presign = (body: object, account = me) =>
    http().post("/api/users/me/avatar/presign").set(auth(account)).send(body)
  const patch = (body: object, account = me) =>
    http().patch("/api/users/me").set(auth(account)).send(body)
  const avatarOf = (account: Account, file = "abc123.jpg") =>
    `${PUBLIC_URL}/avatars/${account.id}/${file}`

  beforeAll(async () => {
    server = await startTestServer(R2_ENV)
    me = await createAccount(server)
    other = await createAccount(server)
  })

  afterAll(async () => {
    await server.stop()
  })

  describe("POST /users/me/avatar/presign", () => {
    const valid = { contentType: "image/jpeg", sizeBytes: 120_000 }

    it("needs a signed-in user", async () => {
      await http().post("/api/users/me/avatar/presign").send(valid).expect(401)
      await http()
        .post("/api/users/me/avatar/presign")
        .set("Authorization", "Bearer not-a-token")
        .send(valid)
        .expect(401)
    })

    it("gives a normal user an upload URL inside their own folder", async () => {
      const response = await presign(valid).expect(200)
      const { uploadUrl, publicUrl, key } = response.body as Record<string, string>

      expect(Object.keys(response.body as object).sort()).toEqual(["key", "publicUrl", "uploadUrl"])
      expect(key).toMatch(new RegExp(`^avatars/${me.id}/[a-z0-9]+\\.jpg$`))
      expect(publicUrl).toBe(`${PUBLIC_URL}/${key}`)

      const url = new URL(uploadUrl)
      expect(url.host).toContain("e2eaccount.r2.cloudflarestorage.com")
      expect(url.pathname).toContain(key)
      expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/)
      expect((url.searchParams.get("X-Amz-SignedHeaders") ?? "").split(";")).toEqual(
        expect.arrayContaining(["content-length", "content-type"]),
      )
    })

    it("keeps each user's pictures apart and never reuses a key", async () => {
      const [mine, theirs, again] = await Promise.all([
        presign(valid),
        presign(valid, other),
        presign(valid),
      ])
      const key = (response: { body: unknown }) => (response.body as { key: string }).key

      expect(key(mine)).toContain(`avatars/${me.id}/`)
      expect(key(theirs)).toContain(`avatars/${other.id}/`)
      expect(key(mine)).not.toBe(key(again))
    })

    it.each([
      ["png", "image/png"],
      ["webp", "image/webp"],
    ])("accepts %s", async (extension, contentType) => {
      const response = await presign({ contentType, sizeBytes: 1000 }).expect(200)

      expect((response.body as { key: string }).key.endsWith(`.${extension}`)).toBe(true)
    })

    it("accepts exactly 2 MB", async () => {
      await presign({ contentType: "image/png", sizeBytes: 2 * MEGABYTE }).expect(200)
    })

    it.each([
      ["a gif", { contentType: "image/gif", sizeBytes: 1000 }],
      ["audio", { contentType: "audio/mpeg", sizeBytes: 1000 }],
      ["a pdf", { contentType: "application/pdf", sizeBytes: 1000 }],
      ["a picture over 2 MB", { contentType: "image/jpeg", sizeBytes: 2 * MEGABYTE + 1 }],
      ["a size of zero", { contentType: "image/jpeg", sizeBytes: 0 }],
      ["a fractional size", { contentType: "image/jpeg", sizeBytes: 1.5 }],
      ["a missing size", { contentType: "image/jpeg" }],
      ["a missing type", { sizeBytes: 1000 }],
      ["an unexpected field", { contentType: "image/jpeg", sizeBytes: 1000, key: "x" }],
    ])("rejects %s with 400", async (_name, body) => {
      await presign(body).expect(400)
    })

    it("does not open the admin endpoint to normal users", async () => {
      await http()
        .post("/api/uploads/presign")
        .set(auth(me))
        .send({ kind: "image", contentType: "image/png", sizeBytes: 100 })
        .expect(403)
      await http()
        .post("/api/uploads/presign")
        .set(auth(me))
        .send({ kind: "avatar", contentType: "image/png", sizeBytes: 100 })
        .expect(403)
    })
  })

  describe("PATCH /users/me with an avatarUrl", () => {
    it("accepts a picture in the user's own folder and shows it on the profile", async () => {
      const avatarUrl = avatarOf(me)

      const response = await patch({ avatarUrl, name: "New name" }).expect(200)
      expect(response.body).toMatchObject({ avatarUrl, name: "New name" })

      const profile = await http().get("/api/users/me").set(auth(me)).expect(200)
      expect(profile.body).toMatchObject({ avatarUrl, name: "New name" })
    })

    it.each([
      ["another user's picture", () => avatarOf(other)],
      ["a picture on another site", () => "https://example.com/avatars/me/abc123.jpg"],
      ["a look-alike host", () => `${PUBLIC_URL}.evil.com/avatars/${me.id}/abc123.jpg`],
      ["an admin upload in our bucket", () => `${PUBLIC_URL}/image/2026/10/abc123.jpg`],
      ["a path that climbs into another folder", () => `${avatarOf(me, "..")}/${other.id}/a.jpg`],
      ["a file that is not a picture", () => avatarOf(me, "abc123.mp3")],
      ["the user's folder itself", () => `${PUBLIC_URL}/avatars/${me.id}/`],
    ])("rejects %s with 400 and keeps the old avatar", async (_name, url) => {
      const before = await http().get("/api/users/me").set(auth(me)).expect(200)

      await patch({ avatarUrl: url() }).expect(400)

      const after = await http().get("/api/users/me").set(auth(me)).expect(200)
      expect((after.body as { avatarUrl: string | null }).avatarUrl).toBe(
        (before.body as { avatarUrl: string | null }).avatarUrl,
      )
    })

    it("still answers 200 when the old picture cannot be deleted (R2 is unreachable here)", async () => {
      await patch({ avatarUrl: avatarOf(me, "first1.jpg") }).expect(200)

      const second = avatarOf(me, "second2.png")
      const response = await patch({ avatarUrl: second }).expect(200)

      expect((response.body as { avatarUrl: string }).avatarUrl).toBe(second)
    })

    it("changing only the name never touches the avatar", async () => {
      const avatarUrl = avatarOf(me, "keep3.webp")
      await patch({ avatarUrl }).expect(200)

      const response = await patch({ name: "Only the name" }).expect(200)

      expect(response.body).toMatchObject({ name: "Only the name", avatarUrl })
    })

    it("needs a signed-in user", async () => {
      await http()
        .patch("/api/users/me")
        .send({ avatarUrl: avatarOf(me) })
        .expect(401)
    })
  })
})

describe("Profile picture rate limit (e2e)", () => {
  let server: TestServer

  beforeAll(async () => {
    server = await startTestServer({
      ...R2_ENV,
      AVATAR_THROTTLE_LIMIT: String(THROTTLE_LIMIT),
      AVATAR_THROTTLE_TTL_SECONDS: "60",
    })
  })

  afterAll(async () => {
    await server.stop()
  })

  it("limits presigned URLs per user, not for everybody", async () => {
    const busy = await createAccount(server)
    const quiet = await createAccount(server)
    const presign = (account: Account) =>
      request(server.url)
        .post("/api/users/me/avatar/presign")
        .set("Authorization", `Bearer ${account.token}`)
        .send({ contentType: "image/jpeg", sizeBytes: 1000 })

    for (let call = 0; call < THROTTLE_LIMIT; call += 1) {
      await presign(busy).expect(200)
    }
    await presign(busy).expect(429)

    await presign(quiet).expect(200)
  })

  it("does not limit the rest of the profile", async () => {
    const account = await createAccount(server)

    for (let call = 0; call < THROTTLE_LIMIT + 2; call += 1) {
      await request(server.url)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${account.token}`)
        .send({ name: `Name ${call}` })
        .expect(200)
    }
  })
})

describe("Profile pictures without R2 configured (e2e)", () => {
  let server: TestServer
  let account: Account

  beforeAll(async () => {
    server = await startTestServer() // the test defaults leave every R2_* setting blank
    account = await createAccount(server)
  })

  afterAll(async () => {
    await server.stop()
  })

  it("presign answers 503 instead of crashing", async () => {
    await request(server.url)
      .post("/api/users/me/avatar/presign")
      .set("Authorization", `Bearer ${account.token}`)
      .send({ contentType: "image/png", sizeBytes: 100 })
      .expect(503)
  })

  it("any avatarUrl is accepted (development)", async () => {
    await request(server.url)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${account.token}`)
      .send({ avatarUrl: "https://example.com/me.png" })
      .expect(200)
  })
})
