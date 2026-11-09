import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import { startTestServer, TEST_NAME_PREFIX, type TestServer } from "./helpers/test-server.js"
import {
  call,
  decide,
  namesOf,
  newConversation,
  registerUser,
  sendMessage,
  textOf,
  type SseEvent,
} from "./helpers/ai-client.js"

const MEDIA = "https://media.example.com"
const START_TIMEOUT_MS = 60_000

interface Line {
  id: string
  role: string
  text: string
  tool?: {
    name: string
    ok: boolean | null
    display?: { tracks?: { id: string; liked: boolean }[]; playlists?: { id: string }[] }
    action?: { id: string; status: string; summary: string }
  }
}

describe("AI assistant tools (e2e)", () => {
  let server: TestServer
  let alice: { token: string; id: string }
  let bob: { token: string; id: string }
  let admin: { token: string; id: string }
  const trackIds: string[] = []
  let artistId = ""
  const http = () => request(server.url)
  const as = (token: string) => ({ Authorization: `Bearer ${token}` })
  const lines = async (token: string, conversationId: string) =>
    (
      await http()
        .get(`/api/ai/conversations/${conversationId}/messages`)
        .set(as(token))
        .expect(200)
    ).body as Line[]
  const usage = async (token: string) =>
    ((await http().get("/api/ai/usage").set(as(token)).expect(200)).body as { used: number }).used
  const action = (sent: { events: SseEvent[] }) =>
    sent.events.find((event) => event.event === "action_required")?.data as
      { actionId: string; summary: string; tool: string; expiresAt: string } | undefined
  const playlistsOf = (ownerId: string) =>
    server.db.rows<{ id: string; name: string; tracks: number }>(
      `SELECT p.id, p.name, count(pt."trackId")::int AS tracks FROM "Playlist" p
       LEFT JOIN "PlaylistTrack" pt ON pt."playlistId" = p.id
       WHERE p."ownerId" = $1 GROUP BY p.id, p.name ORDER BY p."createdAt"`,
      [ownerId],
    )

  beforeAll(async () => {
    server = await startTestServer({
      AI_PROVIDER: "fake",
      EMBEDDING_PROVIDER: "fake",
      AI_DAILY_MESSAGE_LIMIT: "200",
    })
    admin = await registerUser(server, "ADMIN")
    alice = await registerUser(server)
    bob = await registerUser(server)

    artistId = (
      (
        await http()
          .post("/api/artists")
          .set(as(admin.token))
          .send({
            name: `${TEST_NAME_PREFIX}Tools Band`,
            imageUrl: `${MEDIA}/a.jpg`,
            region: "VIETNAM",
          })
          .expect(201)
      ).body as { id: string }
    ).id
    for (const title of ["Mưa Tools Một", "Mưa Tools Hai", "Mưa Tools Ba"]) {
      const created = await http()
        .post("/api/tracks")
        .set(as(admin.token))
        .send({
          title,
          artistId,
          coverUrl: `${MEDIA}/c.jpg`,
          youtubeVideoId: "Llw9Q6akRo4",
          durationSec: 200,
          description: "Nhạc buồn ngày mưa nhẹ nhàng.",
        })
        .expect(201)
      trackIds.push((created.body as { id: string }).id)
    }
  }, START_TIMEOUT_MS * 2)

  afterAll(async () => {
    await server.stop()
  })

  describe("reading", () => {
    it("searches the catalog, shows the cards, and the conversation keeps them", async () => {
      const conversation = await newConversation(server, alice.token)

      const sent = await sendMessage(
        server,
        alice.token,
        conversation,
        call("search_catalog", { query: "Mưa Tools" }),
      )

      expect(sent.status).toBe(200)
      const names = namesOf(sent)
      expect(names.indexOf("tool_call")).toBeLessThan(names.indexOf("tool_result"))
      expect(names[names.length - 1]).toBe("done")
      const result = sent.events.find((e) => e.event === "tool_result")!.data as {
        ok: boolean
        name: string
        display: { tracks: { id: string }[] }
      }
      expect(result).toMatchObject({ ok: true, name: "search_catalog" })
      expect(result.display.tracks.map((t) => t.id).sort()).toEqual([...trackIds].sort())
      expect(textOf(sent)).toContain("Kết quả công cụ: search_catalog: ok")

      const saved = await lines(alice.token, conversation)
      expect(saved.map((l) => l.role)).toEqual(["user", "assistant", "tool", "assistant"])
      expect(saved[2].tool?.display?.tracks).toHaveLength(3)
    })

    it("shows a card fresh: a track liked since is shown as liked", async () => {
      const conversation = await newConversation(server, bob.token)
      await sendMessage(server, bob.token, conversation, call("get_track", { id: trackIds[0] }))
      await http().put(`/api/likes/tracks/${trackIds[0]}`).set(as(bob.token)).expect(200)

      const saved = await lines(bob.token, conversation)

      expect(saved.find((l) => l.role === "tool")?.tool?.display?.tracks?.[0]).toMatchObject({
        id: trackIds[0],
        liked: true,
      })
    })

    it("gives an error to the model, not a failure, for an id that does not exist", async () => {
      const conversation = await newConversation(server, alice.token)

      const sent = await sendMessage(
        server,
        alice.token,
        conversation,
        call("get_track", { id: "ghost" }),
      )

      expect(sent.events.find((e) => e.event === "tool_result")?.data).toMatchObject({ ok: false })
      expect(namesOf(sent)[namesOf(sent).length - 1]).toBe("done")
      expect(textOf(sent)).toContain("get_track: lỗi")
    })

    it("knows the library of the user, and only theirs", async () => {
      const carol = await registerUser(server)
      const conversation = await newConversation(server, carol.token)
      await http()
        .post("/api/playlists")
        .set(as(carol.token))
        .send({ name: "Của Carol" })
        .expect(201)

      const sent = await sendMessage(server, carol.token, conversation, call("get_my_library", {}))

      const result = sent.events.find((e) => e.event === "tool_result")!.data as {
        display: { playlists: { name: string }[] }
      }
      expect(result.display.playlists.map((p) => p.name)).toEqual(["Của Carol"])
    })

    it("looks up help texts and similar tracks without failing when nothing is indexed", async () => {
      const conversation = await newConversation(server, alice.token)

      const help = await sendMessage(
        server,
        alice.token,
        conversation,
        call("search_help", { question: "Premium" }),
      )
      const similar = await sendMessage(
        server,
        alice.token,
        conversation,
        call("similar_tracks", { trackId: trackIds[0] }),
      )

      expect(help.events.find((e) => e.event === "tool_result")?.data).toMatchObject({ ok: true })
      expect(similar.events.find((e) => e.event === "tool_result")?.data).toMatchObject({
        ok: true,
      })
    })
  })

  describe("playing", () => {
    it("sends the app a client_action with the tracks, in order", async () => {
      const conversation = await newConversation(server, alice.token)
      const ids = [trackIds[2], trackIds[0]]

      const sent = await sendMessage(
        server,
        alice.token,
        conversation,
        call("play_tracks", { trackIds: ids }),
      )

      const play = sent.events.find((e) => e.event === "client_action")!.data as {
        action: string
        trackIds: string[]
        tracks: { id: string }[]
      }
      expect(play.action).toBe("play_tracks")
      expect(play.trackIds).toEqual(ids)
      expect(play.tracks.map((t) => t.id)).toEqual(ids)
      expect(namesOf(sent).indexOf("client_action")).toBeLessThan(
        namesOf(sent).indexOf("tool_result"),
      )
    })

    it("opening the conversation again shows the card but sends no action", async () => {
      const conversation = await newConversation(server, alice.token)
      await sendMessage(
        server,
        alice.token,
        conversation,
        call("play_tracks", { trackIds: [trackIds[0]] }),
      )

      const saved = await lines(alice.token, conversation)

      expect(saved.some((l) => l.tool?.name === "play_tracks")).toBe(true)
      expect(JSON.stringify(saved)).not.toContain("client_action")
    })

    it("refuses tracks that do not exist, and more than 50", async () => {
      const conversation = await newConversation(server, alice.token)

      const ghost = await sendMessage(
        server,
        alice.token,
        conversation,
        call("play_tracks", { trackIds: [trackIds[0], "ghost"] }),
      )
      const many = await sendMessage(
        server,
        alice.token,
        conversation,
        call("play_tracks", { trackIds: Array.from({ length: 51 }, (_, i) => `id${i}`) }),
      )

      for (const sent of [ghost, many]) {
        expect(namesOf(sent)).not.toContain("client_action")
        expect(sent.events.find((e) => e.event === "tool_result")?.data).toMatchObject({
          ok: false,
        })
      }
    })
  })

  describe("a change that needs a yes", () => {
    const create = (name: string, ids: string[]) => call("create_playlist", { name, trackIds: ids })

    it("is proposed first: nothing is created, and the stream ends waiting", async () => {
      const dave = await registerUser(server)
      const conversation = await newConversation(server, dave.token)

      const sent = await sendMessage(
        server,
        dave.token,
        conversation,
        create("Chạy bộ", trackIds.slice(0, 2)),
      )

      const proposal = action(sent)!
      expect(proposal.tool).toBe("create_playlist")
      expect(proposal.summary).toContain("Chạy bộ")
      expect(proposal.summary).toContain("2 bài")
      expect(sent.events[sent.events.length - 1]).toMatchObject({
        event: "done",
        data: { awaitingAction: true },
      })
      expect(await playlistsOf(dave.id)).toEqual([])
      const minutes = (new Date(proposal.expiresAt).getTime() - Date.now()) / 60_000
      expect(minutes).toBeGreaterThan(9)
      expect(minutes).toBeLessThanOrEqual(10)

      const saved = await lines(dave.token, conversation)
      expect(saved.find((l) => l.role === "tool")?.tool).toMatchObject({
        name: "create_playlist",
        ok: null,
        action: { id: proposal.actionId, status: "PENDING" },
      })
    })

    it("is made after a yes, which counts as a message: the answer after it is a model call", async () => {
      const erin = await registerUser(server)
      const conversation = await newConversation(server, erin.token)
      const proposal = action(
        await sendMessage(
          server,
          erin.token,
          conversation,
          create("Mưa chiều", trackIds.slice(0, 2)),
        ),
      )!
      expect(await usage(erin.token)).toBe(1)

      const confirmed = await decide(server, erin.token, proposal.actionId, "confirm")

      expect(confirmed.status).toBe(200)
      expect(confirmed.events[0]).toMatchObject({
        event: "tool_result",
        data: {
          ok: true,
          name: "create_playlist",
          action: { id: proposal.actionId, status: "CONFIRMED" },
        },
      })
      expect(textOf(confirmed)).toContain("create_playlist: ok")
      expect(namesOf(confirmed)[namesOf(confirmed).length - 1]).toBe("done")
      expect(await playlistsOf(erin.id)).toEqual([
        expect.objectContaining({ name: "Mưa chiều", tracks: 2 }),
      ])
      expect(await usage(erin.token)).toBe(2)

      const saved = await lines(erin.token, conversation)
      expect(saved.find((l) => l.role === "tool")?.tool).toMatchObject({
        ok: true,
        action: { status: "CONFIRMED" },
      })
    })

    it("can be answered once only", async () => {
      const frank = await registerUser(server)
      const conversation = await newConversation(server, frank.token)
      const proposal = action(
        await sendMessage(server, frank.token, conversation, create("Một lần", [trackIds[0]])),
      )!
      await decide(server, frank.token, proposal.actionId, "confirm")

      expect((await decide(server, frank.token, proposal.actionId, "confirm")).status).toBe(409)
      expect((await decide(server, frank.token, proposal.actionId, "reject")).status).toBe(409)
      expect(await playlistsOf(frank.id)).toHaveLength(1)
    })

    it("is not made after a no, and the assistant goes on", async () => {
      const gina = await registerUser(server)
      const conversation = await newConversation(server, gina.token)
      const proposal = action(
        await sendMessage(server, gina.token, conversation, create("Không", [trackIds[0]])),
      )!

      const rejected = await decide(server, gina.token, proposal.actionId, "reject")

      expect(rejected.status).toBe(200)
      expect(rejected.events[0]).toMatchObject({
        event: "tool_result",
        data: { ok: false, action: { status: "REJECTED" } },
      })
      expect(namesOf(rejected)[namesOf(rejected).length - 1]).toBe("done")
      expect(await playlistsOf(gina.id)).toEqual([])
      const saved = await lines(gina.token, conversation)
      expect(saved.find((l) => l.role === "tool")?.tool).toMatchObject({
        ok: false,
        action: { status: "REJECTED" },
      })
    })

    it("belongs to the user who got the proposal: nobody else can answer it", async () => {
      const heidi = await registerUser(server)
      const conversation = await newConversation(server, heidi.token)
      const proposal = action(
        await sendMessage(server, heidi.token, conversation, create("Của Heidi", [trackIds[0]])),
      )!

      expect((await decide(server, bob.token, proposal.actionId, "confirm")).status).toBe(404)
      expect((await decide(server, admin.token, proposal.actionId, "confirm")).status).toBe(404)
      expect((await decide(server, heidi.token, "ghost", "confirm")).status).toBe(404)
      expect(await playlistsOf(heidi.id)).toEqual([])
      expect(await playlistsOf(bob.id)).toEqual([])
    })

    it("is gone after 10 minutes, and the conversation goes on", async () => {
      const ivan = await registerUser(server)
      const conversation = await newConversation(server, ivan.token)
      const proposal = action(
        await sendMessage(server, ivan.token, conversation, create("Quá hạn", [trackIds[0]])),
      )!
      await server.db.run(
        `UPDATE "AiPendingAction" SET "expiresAt" = now() - interval '1 minute' WHERE id = $1`,
        [proposal.actionId],
      )

      const late = await decide(server, ivan.token, proposal.actionId, "confirm")

      expect(late.status).toBe(410)
      expect(await playlistsOf(ivan.id)).toEqual([])
      const rows = await server.db.rows<{ status: string }>(
        `SELECT status FROM "AiPendingAction" WHERE id = $1`,
        [proposal.actionId],
      )
      expect(rows[0].status).toBe("EXPIRED")
      // The model must have a result for its call, or it refuses the next message.
      expect(textOf(await sendMessage(server, ivan.token, conversation, "tiếp tục"))).toBe(
        "Bạn nói: tiếp tục",
      )
    })

    it("is over when the person writes something else instead", async () => {
      const judy = await registerUser(server)
      const conversation = await newConversation(server, judy.token)
      const proposal = action(
        await sendMessage(server, judy.token, conversation, create("Bỏ qua", [trackIds[0]])),
      )!

      const next = await sendMessage(server, judy.token, conversation, "thôi chuyện khác")

      expect(next.status).toBe(200)
      expect(textOf(next)).toBe("Bạn nói: thôi chuyện khác")
      const rows = await server.db.rows<{ status: string }>(
        `SELECT status FROM "AiPendingAction" WHERE id = $1`,
        [proposal.actionId],
      )
      expect(rows[0].status).toBe("EXPIRED")
      expect((await decide(server, judy.token, proposal.actionId, "confirm")).status).toBe(409)
      const saved = await lines(judy.token, conversation)
      expect(saved.find((l) => l.tool)?.tool?.action?.status).toBe("EXPIRED")
    })

    it("likes tracks and follows an artist after a yes", async () => {
      const karl = await registerUser(server)
      const conversation = await newConversation(server, karl.token)

      const like = action(
        await sendMessage(
          server,
          karl.token,
          conversation,
          call("like_tracks", { trackIds: trackIds.slice(0, 2) }),
        ),
      )!
      expect(
        await server.db.rows(`SELECT 1 FROM "TrackLike" WHERE "userId" = $1`, [karl.id]),
      ).toHaveLength(0)
      await decide(server, karl.token, like.actionId, "confirm")
      const follow = action(
        await sendMessage(server, karl.token, conversation, call("follow_artist", { artistId })),
      )!
      expect(
        await server.db.rows(`SELECT 1 FROM "Follow" WHERE "userId" = $1`, [karl.id]),
      ).toHaveLength(0)
      await decide(server, karl.token, follow.actionId, "confirm")

      expect(
        await server.db.rows(`SELECT 1 FROM "TrackLike" WHERE "userId" = $1`, [karl.id]),
      ).toHaveLength(2)
      expect(
        await server.db.rows(`SELECT 1 FROM "Follow" WHERE "userId" = $1`, [karl.id]),
      ).toHaveLength(1)
    })

    it("adds tracks to the user's own playlist only", async () => {
      const lena = await registerUser(server)
      const conversation = await newConversation(server, lena.token)
      const mine = (
        await http()
          .post("/api/playlists")
          .set(as(lena.token))
          .send({ name: "Của Lena" })
          .expect(201)
      ).body as { id: string }
      const theirs = (
        await http().post("/api/playlists").set(as(bob.token)).send({ name: "Của Bob" }).expect(201)
      ).body as { id: string }

      const own = action(
        await sendMessage(
          server,
          lena.token,
          conversation,
          call("add_tracks_to_playlist", { playlistId: mine.id, trackIds: trackIds.slice(0, 2) }),
        ),
      )!
      await decide(server, lena.token, own.actionId, "confirm")
      const stranger = await sendMessage(
        server,
        lena.token,
        conversation,
        call("add_tracks_to_playlist", { playlistId: theirs.id, trackIds: [trackIds[0]] }),
      )

      expect((await playlistsOf(lena.id))[0]).toMatchObject({ name: "Của Lena", tracks: 2 })
      expect(action(stranger)).toBeUndefined()
      expect(stranger.events.find((e) => e.event === "tool_result")?.data).toMatchObject({
        ok: false,
      })
      expect((await playlistsOf(bob.id)).find((p) => p.id === theirs.id)?.tracks).toBe(0)
    })

    it("does not let an ADMIN's assistant add to somebody else's playlist either", async () => {
      const mia = await registerUser(server)
      const hers = (
        await http().post("/api/playlists").set(as(mia.token)).send({ name: "Của Mia" }).expect(201)
      ).body as { id: string }
      const conversation = await newConversation(server, admin.token)

      const sent = await sendMessage(
        server,
        admin.token,
        conversation,
        call("add_tracks_to_playlist", { playlistId: hers.id, trackIds: [trackIds[0]] }),
      )

      expect(action(sent)).toBeUndefined()
      expect(sent.events.find((e) => e.event === "tool_result")?.data).toMatchObject({ ok: false })
      expect((await playlistsOf(mia.id))[0].tracks).toBe(0)
    })

    it("is not proposed for tracks that do not exist, or for more than 50", async () => {
      const nina = await registerUser(server)
      const conversation = await newConversation(server, nina.token)

      const ghost = await sendMessage(
        server,
        nina.token,
        conversation,
        create("Ma", [trackIds[0], "ghost"]),
      )
      const many = await sendMessage(
        server,
        nina.token,
        conversation,
        create(
          "Nhiều",
          Array.from({ length: 51 }, (_, i) => `id${i}`),
        ),
      )

      expect(action(ghost)).toBeUndefined()
      expect(action(many)).toBeUndefined()
      expect(await playlistsOf(nina.id)).toEqual([])
    })

    it("goes away with its conversation", async () => {
      const olga = await registerUser(server)
      const conversation = await newConversation(server, olga.token)
      const proposal = action(
        await sendMessage(server, olga.token, conversation, create("Xoá", [trackIds[0]])),
      )!
      // The proposal waits, so the conversation is not "busy".

      await http().delete(`/api/ai/conversations/${conversation}`).set(as(olga.token)).expect(204)

      expect(
        await server.db.rows(`SELECT 1 FROM "AiPendingAction" WHERE id = $1`, [proposal.actionId]),
      ).toHaveLength(0)
      expect((await decide(server, olga.token, proposal.actionId, "confirm")).status).toBe(404)
    })
  })

  describe("at the daily limit and after a failure", () => {
    it("gives the model a result for a call whose result was lost", async () => {
      const pat = await registerUser(server)
      const conversation = await newConversation(server, pat.token)
      await sendMessage(server, pat.token, conversation, call("get_track", { id: trackIds[0] }))
      // A failure between the call and its result leaves the call alone.
      await server.db.run(
        `DELETE FROM "AiMessage" WHERE "conversationId" = $1 AND content::text LIKE '%tool_result%'`,
        [conversation],
      )
      const before = await server.db.rows<{ n: number }>(
        `SELECT count(*)::int AS n FROM "AiMessage" WHERE "conversationId" = $1 AND content::text LIKE '%tool_result%'`,
        [conversation],
      )
      expect(before[0].n).toBe(0)

      const next = await sendMessage(server, pat.token, conversation, "tiếp tục nhé")

      expect(next.status).toBe(200)
      const after = await server.db.rows<{ n: number }>(
        `SELECT count(*)::int AS n FROM "AiMessage" WHERE "conversationId" = $1 AND content::text LIKE '%tool_result%'`,
        [conversation],
      )
      expect(after[0].n).toBe(1)
    })

    it("keeps the other results of a round with the change until it is answered", async () => {
      const quinn = await registerUser(server)
      const conversation = await newConversation(server, quinn.token)

      const sent = await sendMessage(
        server,
        quinn.token,
        conversation,
        `${call("get_track", { id: trackIds[0] })} ${call("like_tracks", { trackIds: [trackIds[1]] })}`,
      )
      const results = async () =>
        server.db.rows<{ content: { type: string }[] }>(
          `SELECT content FROM "AiMessage" WHERE "conversationId" = $1 AND role = 'USER' AND content::text LIKE '%tool_result%'`,
          [conversation],
        )
      expect(await results()).toHaveLength(0)

      await decide(server, quinn.token, action(sent)!.actionId, "confirm")

      // One message holds both results of the round.
      const stored = await results()
      expect(stored).toHaveLength(1)
      expect(stored[0].content.map((part) => part.type)).toEqual(["tool_result", "tool_result"])
    })
  })

  describe("limits", () => {
    it("uses at most 6 tools in a message, then answers", async () => {
      const conversation = await newConversation(server, alice.token)

      const sent = await sendMessage(server, alice.token, conversation, "[[loop]] tìm mãi")

      expect(sent.events.filter((e) => e.event === "tool_call")).toHaveLength(6)
      expect(namesOf(sent)[namesOf(sent).length - 1]).toBe("done")
      expect(textOf(sent)).toContain("Kết quả công cụ")
    })
  })

  it("needs a signed-in user to answer a proposal", async () => {
    await http().post("/api/ai/actions/x/confirm").expect(401)
    await http().post("/api/ai/actions/x/reject").expect(401)
  })
})

describe("AI assistant tools limits (e2e)", () => {
  const action = (sent: { events: SseEvent[] }) =>
    sent.events.find((event) => event.event === "action_required")?.data as
      { actionId: string } | undefined

  // This test starts its own server, and a server that stops removes the test data: it must not run
  // inside the suite whose data it would remove.
  it(
    "still carries out a confirmed change, reports it, and says no more",
    async () => {
      const server2 = await startTestServer({
        AI_PROVIDER: "fake",
        EMBEDDING_PROVIDER: "fake",
        AI_DAILY_MESSAGE_LIMIT: "1",
      })
      try {
        const art = await registerUser(server2, "ADMIN")
        const created = await request(server2.url)
          .post("/api/artists")
          .set({ Authorization: `Bearer ${art.token}` })
          .send({ name: `${TEST_NAME_PREFIX}Limit Band`, imageUrl: `${MEDIA}/a.jpg` })
          .expect(201)
        const track = await request(server2.url)
          .post("/api/tracks")
          .set({ Authorization: `Bearer ${art.token}` })
          .send({
            title: "Limit Song",
            artistId: (created.body as { id: string }).id,
            coverUrl: `${MEDIA}/c.jpg`,
            youtubeVideoId: "Llw9Q6akRo4",
            durationSec: 100,
          })
          .expect(201)
        const conversation = await newConversation(server2, art.token)
        const proposal = action(
          await sendMessage(
            server2,
            art.token,
            conversation,
            call("like_tracks", { trackIds: [(track.body as { id: string }).id] }),
          ),
        )!

        const confirmed = await decide(server2, art.token, proposal.actionId, "confirm")

        expect(confirmed.status).toBe(200)
        expect(namesOf(confirmed)).toEqual(["tool_result", "text_delta", "done"])
        expect(textOf(confirmed)).toContain("Đã thực hiện xong")
        const likes = await server2.db.rows(`SELECT 1 FROM "TrackLike" WHERE "userId" = $1`, [
          art.id,
        ])
        expect(likes).toHaveLength(1)
        // The limit still holds for new messages.
        expect((await sendMessage(server2, art.token, conversation, "thêm nữa")).status).toBe(429)
      } finally {
        await server2.stop()
      }
    },
    START_TIMEOUT_MS * 2,
  )

  it(
    "limits answers to proposals per user, like messages",
    async () => {
      const server = await startTestServer({
        AI_PROVIDER: "fake",
        AI_CHAT_THROTTLE_LIMIT: "2",
        AI_CHAT_THROTTLE_TTL_SECONDS: "60",
      })
      try {
        const user = await registerUser(server)
        // Each endpoint counts its own requests (as every throttled endpoint of the API does).
        expect((await decide(server, user.token, "any", "confirm")).status).toBe(404)
        expect((await decide(server, user.token, "any", "confirm")).status).toBe(404)
        expect((await decide(server, user.token, "any", "confirm")).status).toBe(429)
        expect((await decide(server, user.token, "any", "reject")).status).toBe(404)
        expect((await decide(server, user.token, "any", "reject")).status).toBe(404)
        expect((await decide(server, user.token, "any", "reject")).status).toBe(429)

        // Another user is not held back.
        const other = await registerUser(server)
        expect((await decide(server, other.token, "any", "confirm")).status).toBe(404)
      } finally {
        await server.stop()
      }
    },
    START_TIMEOUT_MS,
  )

  it(
    "answers 503 to a proposal without a model",
    async () => {
      const server = await startTestServer()
      try {
        const user = await registerUser(server)
        expect((await decide(server, user.token, "x", "confirm")).status).toBe(503)
        expect((await decide(server, user.token, "x", "reject")).status).toBe(503)
      } finally {
        await server.stop()
      }
    },
    START_TIMEOUT_MS,
  )
})
