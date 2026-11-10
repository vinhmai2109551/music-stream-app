import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import {
  startTestServer,
  TEST_NAME_PREFIX,
  uniqueEmail,
  type TestServer,
} from "./helpers/test-server.js"

const IMAGE_URL = "https://media.e2e.test/covers/e2e.jpg"
const ROOT_COUNT = 25
const REPLY_PREVIEW = 3

interface CommentBody {
  id: string
  text: string
  parentId: string | null
  trackId: string | null
  postId: string | null
  liked: boolean
  likesCount: number
  replies?: CommentBody[]
  repliesCount?: number
}

interface CursorPage {
  items: CommentBody[]
  nextCursor: string | null
  total?: number
}

describe("Comments: cursor pagination and one-level replies (e2e)", () => {
  let server: TestServer
  let trackId: string
  let otherTrackId: string
  let user: { token: string; id: string }
  let other: { token: string; id: string }
  /** Root comments in the order they were written (oldest first). */
  const roots: CommentBody[] = []
  const as = (token: string) => ({ Authorization: `Bearer ${token}` })
  const http = () => request(server.url)

  const register = async (role: "USER" | "ADMIN" = "USER") => {
    const credentials = { email: uniqueEmail(), name: "Commenter", password: "password123" }
    await http().post("/api/auth/register").send(credentials).expect(201)
    if (role === "ADMIN") {
      await server.db.run(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [credentials.email])
    }
    const login = await http()
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password })
      .expect(200)
    const body = login.body as { accessToken: string; user: { id: string } }
    return { token: body.accessToken, id: body.user.id }
  }

  const createTrack = async (adminToken: string, title: string): Promise<string> => {
    const artist = await http()
      .post("/api/artists")
      .set(as(adminToken))
      .send({ name: `${TEST_NAME_PREFIX}${title} Artist`, imageUrl: IMAGE_URL })
      .expect(201)
    const track = await http()
      .post("/api/tracks")
      .set(as(adminToken))
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

  /** Writes a comment, then stamps it so the order is exact: `secondsAfterStart` after the epoch. */
  const write = async (
    token: string,
    body: object,
    secondsAfterStart: number,
  ): Promise<CommentBody> => {
    const response = await http().post("/api/comments").set(as(token)).send(body).expect(201)
    const comment = response.body as CommentBody
    await server.db.run(
      `UPDATE "Comment" SET "createdAt" = TIMESTAMP '2026-01-01 00:00:00' + make_interval(secs => $1)
        WHERE id = $2`,
      [secondsAfterStart, comment.id],
    )
    return comment
  }

  const list = async (query: string, token?: string): Promise<CursorPage> => {
    const call = http().get(`/api/comments?${query}`)
    return (await (token ? call.set(as(token)) : call).expect(200)).body as CursorPage
  }
  const texts = (page: CursorPage) => page.items.map((item) => item.text)

  beforeAll(async () => {
    server = await startTestServer()
    const admin = await register("ADMIN")
    trackId = await createTrack(admin.token, "Comment Song")
    otherTrackId = await createTrack(admin.token, "Other Comment Song")
    user = await register()
    other = await register()

    for (let i = 1; i <= ROOT_COUNT; i++) {
      roots.push(await write(user.token, { trackId, text: `c${i}` }, i))
    }
  })

  afterAll(async () => {
    await server.stop()
  })

  describe("top-level comments", () => {
    it("come newest first, a page at a time, and cover every comment exactly once", async () => {
      const first = await list(`trackId=${trackId}&limit=10`)
      expect(texts(first)).toEqual(
        Array.from({ length: 10 }, (_, i) => `c${ROOT_COUNT - i}`), // c25 ... c16
      )
      expect(first.nextCursor).toBe(roots[ROOT_COUNT - 10].id)
      expect(first.total).toBe(ROOT_COUNT)

      const second = await list(`trackId=${trackId}&limit=10&cursor=${first.nextCursor}`)
      expect(texts(second)).toEqual(Array.from({ length: 10 }, (_, i) => `c${ROOT_COUNT - 10 - i}`))

      const last = await list(`trackId=${trackId}&limit=10&cursor=${second.nextCursor}`)
      expect(texts(last)).toEqual(["c5", "c4", "c3", "c2", "c1"])
      expect(last.nextCursor).toBeNull()
    })

    it("the page is exactly full: no empty next page is announced", async () => {
      const page = await list(`trackId=${trackId}&limit=${ROOT_COUNT}`)

      expect(page.items).toHaveLength(ROOT_COUNT)
      expect(page.nextCursor).toBeNull()
    })

    it("limit defaults to 20 and is capped at 50", async () => {
      const page = await list(`trackId=${trackId}`)
      expect(page.items).toHaveLength(20)
      expect(page.nextCursor).not.toBeNull()

      await http().get(`/api/comments?trackId=${trackId}&limit=51`).expect(400)
      await http().get(`/api/comments?trackId=${trackId}&limit=0`).expect(400)
    })

    it("a comment written while reading does not shift the next page", async () => {
      const first = await list(`trackId=${trackId}&limit=5`)
      const late = await write(other.token, { trackId, text: "late" }, ROOT_COUNT + 100)

      const second = await list(`trackId=${trackId}&limit=5&cursor=${first.nextCursor}`)

      expect(texts(second)).toEqual(["c20", "c19", "c18", "c17", "c16"])
      expect((await list(`trackId=${trackId}&limit=1`)).items[0].id).toBe(late.id)
      await server.db.run(`DELETE FROM "Comment" WHERE id = $1`, [late.id])
    })

    it("an unknown cursor is 400", async () => {
      await http().get(`/api/comments?trackId=${trackId}&cursor=nope`).expect(400)
    })

    it("only the comments of the asked track are returned", async () => {
      await write(user.token, { trackId: otherTrackId, text: "elsewhere" }, 1)

      expect(texts(await list(`trackId=${otherTrackId}`))).toEqual(["elsewhere"])
      expect(texts(await list(`trackId=${trackId}&limit=50`))).not.toContain("elsewhere")
    })

    it("exactly one of trackId and postId is required", async () => {
      await http().get("/api/comments").expect(400)
      await http().get(`/api/comments?trackId=${trackId}&postId=x`).expect(400)
    })

    it("work for feed posts too", async () => {
      const artist = await server.db.rows<{ artistId: string }>(
        `SELECT "artistId" FROM "Track" WHERE id = $1`,
        [trackId],
      )
      const postId = `e2e-post-${Date.now()}`
      await server.db.run(
        `INSERT INTO "FeedPost" (id, "artistId", "trackId", "artworkUrl") VALUES ($1, $2, $3, $4)`,
        [postId, artist[0].artistId, trackId, IMAGE_URL],
      )
      await write(user.token, { postId, text: "p1" }, 1)
      await write(user.token, { postId, text: "p2" }, 2)

      const page = await list(`postId=${postId}&limit=1`)

      expect(texts(page)).toEqual(["p2"])
      expect(texts(await list(`postId=${postId}&limit=1&cursor=${page.nextCursor}`))).toEqual([
        "p1",
      ])
    })
  })

  describe("replies", () => {
    let thread: CommentBody
    const replies: CommentBody[] = []

    beforeAll(async () => {
      thread = roots[0]
      for (let i = 1; i <= 5; i++) {
        replies.push(
          await write(other.token, { trackId, text: `r${i}`, parentId: thread.id }, 1000 + i),
        )
      }
    })

    it("a top-level comment carries its 3 newest replies, oldest first, and the total", async () => {
      const page = await list(`trackId=${trackId}&limit=50`)
      const item = page.items.find((candidate) => candidate.id === thread.id)

      expect(item?.repliesCount).toBe(5)
      expect(page.total).toBe(ROOT_COUNT + 5) // replies count too
      expect(item?.replies?.map((reply) => reply.text)).toEqual(["r3", "r4", "r5"])
      expect(item?.replies).toHaveLength(REPLY_PREVIEW)
      // Replies are not listed again as top-level comments.
      expect(texts(page).some((text) => text.startsWith("r"))).toBe(false)
      expect(item?.replies?.every((reply) => reply.parentId === thread.id)).toBe(true)
    })

    it("a comment without replies has an empty list and a zero count", async () => {
      const page = await list(`trackId=${trackId}&limit=50`)
      const item = page.items.find((candidate) => candidate.id === roots[1].id)

      expect(item?.replies).toEqual([])
      expect(item?.repliesCount).toBe(0)
    })

    it("GET /comments/:id/replies pages through them, newest first", async () => {
      const first = (await http().get(`/api/comments/${thread.id}/replies?limit=2`).expect(200))
        .body as CursorPage
      expect(texts(first)).toEqual(["r5", "r4"])

      const second = (
        await http()
          .get(`/api/comments/${thread.id}/replies?limit=2&cursor=${first.nextCursor}`)
          .expect(200)
      ).body as CursorPage
      expect(texts(second)).toEqual(["r3", "r2"])

      const last = (
        await http()
          .get(`/api/comments/${thread.id}/replies?limit=2&cursor=${second.nextCursor}`)
          .expect(200)
      ).body as CursorPage
      expect(texts(last)).toEqual(["r1"])
      expect(last.nextCursor).toBeNull()
    })

    it("the oldest reply on screen is the cursor to get the ones before it", async () => {
      const shown = (await list(`trackId=${trackId}&limit=50`)).items.find(
        (candidate) => candidate.id === thread.id,
      )
      const oldestShown = shown?.replies?.[0]

      const older = (
        await http().get(`/api/comments/${thread.id}/replies?cursor=${oldestShown?.id}`).expect(200)
      ).body as CursorPage

      expect(texts(older)).toEqual(["r2", "r1"])
      expect(older.nextCursor).toBeNull()
    })

    it("replies of an unknown comment are 404, of a reply an empty page", async () => {
      await http().get("/api/comments/nope/replies").expect(404)
      const page = (await http().get(`/api/comments/${replies[0].id}/replies`).expect(200))
        .body as CursorPage
      expect(page.items).toEqual([])
    })

    it("answering a reply attaches the new comment to the top-level comment", async () => {
      const nested = await http()
        .post("/api/comments")
        .set(as(user.token))
        .send({ trackId, text: "to a reply", parentId: replies[0].id })
        .expect(201)

      expect((nested.body as CommentBody).parentId).toBe(thread.id)
      const all = (await http().get(`/api/comments/${thread.id}/replies?limit=50`).expect(200))
        .body as CursorPage
      expect(all.items).toHaveLength(6)
      expect(all.items.every((reply) => reply.parentId === thread.id)).toBe(true)
    })

    it("a reply to a comment of another track is 400", async () => {
      await http()
        .post("/api/comments")
        .set(as(user.token))
        .send({ trackId: otherTrackId, text: "wrong place", parentId: thread.id })
        .expect(400)
    })

    it("liked and likesCount are personal, also inside the preview", async () => {
      await http().put(`/api/comments/${replies[4].id}/like`).set(as(user.token)).expect(200)

      const mine = await list(`trackId=${trackId}&limit=50`, user.token)
      const theirs = await list(`trackId=${trackId}&limit=50`, other.token)
      const find = (page: CursorPage) =>
        page.items
          .find((candidate) => candidate.id === thread.id)
          ?.replies?.find((reply) => reply.id === replies[4].id)

      expect(find(mine)).toMatchObject({ liked: true, likesCount: 1 })
      expect(find(theirs)).toMatchObject({ liked: false, likesCount: 1 })
    })

    it("deleting a top-level comment deletes its replies; a deleted cursor is 400", async () => {
      const gone = roots[10]
      await http().delete(`/api/comments/${gone.id}`).set(as(user.token)).expect(204)

      await http().get(`/api/comments?trackId=${trackId}&cursor=${gone.id}`).expect(400)
      await http().get(`/api/comments/${gone.id}/replies`).expect(404)
    })
  })
})
