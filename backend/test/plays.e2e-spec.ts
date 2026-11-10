import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import {
  startTestServer,
  TEST_NAME_PREFIX,
  uniqueEmail,
  type TestServer,
} from "./helpers/test-server.js"

const IMAGE_URL = "https://media.e2e.test/covers/e2e.jpg"
const WINDOW_MINUTES = 30

interface PlayBody {
  plays: number
  counted: boolean
}

async function registerUser(server: TestServer, role: "USER" | "ADMIN" = "USER") {
  const credentials = { email: uniqueEmail(), name: "Play Tester", password: "password123" }
  await request(server.url).post("/api/auth/register").send(credentials).expect(201)
  if (role === "ADMIN") {
    await server.db.run(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [credentials.email])
  }
  const login = await request(server.url)
    .post("/api/auth/login")
    .send({ email: credentials.email, password: credentials.password })
    .expect(200)
  const body = login.body as { accessToken: string; user: { id: string } }
  return { token: body.accessToken, id: body.user.id }
}

/** An artist and a track to play. */
async function createTrack(server: TestServer, adminToken: string, title: string) {
  const auth = { Authorization: `Bearer ${adminToken}` }
  const artist = await request(server.url)
    .post("/api/artists")
    .set(auth)
    .send({ name: `${TEST_NAME_PREFIX}${title} Artist`, imageUrl: IMAGE_URL })
    .expect(201)
  const track = await request(server.url)
    .post("/api/tracks")
    .set(auth)
    .send({
      title: `${TEST_NAME_PREFIX}${title}`,
      artistId: (artist.body as { id: string }).id,
      coverUrl: IMAGE_URL,
      youtubeVideoId: "AAAAAAAAAAA",
      durationSec: 200,
    })
    .expect(201)
  return (track.body as { id: string }).id
}

describe("Counting plays (e2e)", () => {
  let server: TestServer
  let trackId: string
  let alice: { token: string; id: string }
  let bob: { token: string; id: string }
  const as = (token: string) => ({ Authorization: `Bearer ${token}` })
  const play = (id: string, token?: string) => {
    const call = request(server.url).post(`/api/tracks/${id}/play`)
    return token ? call.set(as(token)) : call
  }
  const playsOf = async (id: string) =>
    ((await request(server.url).get(`/api/tracks/${id}`).expect(200)).body as { plays: number })
      .plays
  const eventsOf = (userId: string, id: string) =>
    server.db.rows<{ id: string }>(
      `SELECT id FROM "PlayEvent" WHERE "userId" = $1 AND "trackId" = $2`,
      [userId, id],
    )

  beforeAll(async () => {
    server = await startTestServer({ PLAY_DEDUPE_MINUTES: String(WINDOW_MINUTES) })
    const admin = await registerUser(server, "ADMIN")
    trackId = await createTrack(server, admin.token, "Counted Song")
    alice = await registerUser(server)
    bob = await registerUser(server)
  })

  afterAll(async () => {
    await server.stop()
  })

  it("needs a login: 401 without a token", async () => {
    await play(trackId).expect(401)
    await play(trackId, "not-a-token").expect(401)
  })

  it("an unknown track is 404", async () => {
    await play("no-such-track", alice.token).expect(404)
  })

  it("the first listen is counted", async () => {
    const response = await play(trackId, alice.token).expect(200)

    expect(response.body).toEqual({ plays: 1, counted: true })
    expect(await playsOf(trackId)).toBe(1)
    expect(await eventsOf(alice.id, trackId)).toHaveLength(1)
  })

  it("the same user playing again inside the window is 200 but not counted", async () => {
    const again = await play(trackId, alice.token).expect(200)
    const andAgain = await play(trackId, alice.token).expect(200)

    expect(again.body).toEqual({ plays: 1, counted: false })
    expect(andAgain.body).toEqual({ plays: 1, counted: false })
    expect(await playsOf(trackId)).toBe(1)
    expect(await eventsOf(alice.id, trackId)).toHaveLength(1)
  })

  it("another user's listen of the same track is counted", async () => {
    const response = await play(trackId, bob.token).expect(200)

    expect(response.body).toEqual({ plays: 2, counted: true })
  })

  it("counts again once the window is over", async () => {
    await server.db.run(
      `UPDATE "PlayEvent" SET "createdAt" = "createdAt" - make_interval(mins => $1)
        WHERE "userId" = $2`,
      [WINDOW_MINUTES + 1, alice.id],
    )

    const response = await play(trackId, alice.token).expect(200)

    expect(response.body).toEqual({ plays: 3, counted: true })
    expect(await eventsOf(alice.id, trackId)).toHaveLength(2)
  })

  it("a different track by the same user is a separate listen", async () => {
    const admin = await registerUser(server, "ADMIN")
    const other = await createTrack(server, admin.token, "Other Song")

    const response = await play(other, alice.token).expect(200)

    expect(response.body).toEqual({ plays: 1, counted: true })
  })

  it("parallel calls of one user count exactly once", async () => {
    const carol = await registerUser(server)
    const admin = await registerUser(server, "ADMIN")
    const fresh = await createTrack(server, admin.token, "Parallel Song")

    const responses = await Promise.all(Array.from({ length: 6 }, () => play(fresh, carol.token)))

    const bodies = responses.map((response) => response.body as PlayBody)
    expect(responses.every((response) => response.status === 200)).toBe(true)
    expect(bodies.filter((body) => body.counted)).toHaveLength(1)
    expect(await playsOf(fresh)).toBe(1)
    expect(await eventsOf(carol.id, fresh)).toHaveLength(1)
  })

  it("deleting a user removes their play events, the count stays", async () => {
    const dave = await registerUser(server)
    await play(trackId, dave.token).expect(200)
    const before = await playsOf(trackId)

    await server.db.run(`DELETE FROM "User" WHERE id = $1`, [dave.id])

    expect(await eventsOf(dave.id, trackId)).toHaveLength(0)
    expect(await playsOf(trackId)).toBe(before)
  })
})

describe("Play endpoint rate limit (e2e)", () => {
  const LIMIT = 3
  let server: TestServer

  beforeAll(async () => {
    server = await startTestServer({ PLAY_THROTTLE_LIMIT: String(LIMIT) })
  })

  afterAll(async () => {
    await server.stop()
  })

  it("limits each user separately, not the whole IP", async () => {
    const admin = await registerUser(server, "ADMIN")
    const trackId = await createTrack(server, admin.token, "Limited Song")
    const [erin, frank] = [await registerUser(server), await registerUser(server)]
    const call = (token: string) =>
      request(server.url)
        .post(`/api/tracks/${trackId}/play`)
        .set({ Authorization: `Bearer ${token}` })

    const erinStatuses: number[] = []
    for (let i = 0; i < LIMIT + 1; i++) erinStatuses.push((await call(erin.token)).status)

    expect(erinStatuses).toEqual([200, 200, 200, 429])
    // Same IP, another account: still allowed.
    expect((await call(frank.token)).status).toBe(200)
  })

  it("an anonymous caller is turned away with 401, never counted against anyone", async () => {
    const statuses: number[] = []
    for (let i = 0; i < LIMIT + 2; i++) {
      statuses.push((await request(server.url).post("/api/tracks/anything/play")).status)
    }

    expect(statuses).toEqual(Array(LIMIT + 2).fill(401))
  })
})
