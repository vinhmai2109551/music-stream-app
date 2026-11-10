import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import { FAKE_TRIGGERS } from "../src/shared/llm/fake-llm-client.js"
import { startTestServer, uniqueEmail, type TestServer } from "./helpers/test-server.js"

const START_TIMEOUT_MS = 60_000
const WAIT_MS = 15_000

interface SseEvent {
  event: string
  data: Record<string, unknown>
}
interface Sent {
  status: number
  contentType: string
  events: SseEvent[]
  /** The body when it was not a stream (an ordinary error response). */
  json: Record<string, unknown> | null
}
interface Conversation {
  id: string
  title: string
  updatedAt: string
}
interface Message {
  id: string
  role: string
  text: string
}

async function register(server: TestServer): Promise<string> {
  const credentials = { email: uniqueEmail(), name: "Assistant tester", password: "password123" }
  await request(server.url).post("/api/auth/register").send(credentials).expect(201)
  const login = await request(server.url)
    .post("/api/auth/login")
    .send({ email: credentials.email, password: credentials.password })
    .expect(200)
  return (login.body as { accessToken: string }).accessToken
}

const parseEvents = (text: string): SseEvent[] =>
  text
    .split("\n\n")
    .filter((block) => block.startsWith("event:"))
    .map((block) => {
      const [name, data] = block.split("\n")
      return {
        event: name.slice("event: ".length),
        data: JSON.parse(data.slice("data: ".length)) as Record<string, unknown>,
      }
    })

/** Sends a message and reads the whole answer. */
async function send(
  server: TestServer,
  token: string,
  conversationId: string,
  text: string,
): Promise<Sent> {
  const response = await fetch(`${server.url}/api/ai/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
  const contentType = response.headers.get("content-type") ?? ""
  const body = await response.text()
  const stream = contentType.startsWith("text/event-stream")
  return {
    status: response.status,
    contentType,
    events: stream ? parseEvents(body) : [],
    json: stream ? null : (JSON.parse(body) as Record<string, unknown>),
  }
}

async function eventually<T>(read: () => Promise<T | undefined>): Promise<T> {
  const deadline = Date.now() + WAIT_MS
  for (;;) {
    const value = await read()
    if (value !== undefined) return value
    if (Date.now() > deadline) throw new Error("Timed out")
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

const textOf = (sent: Sent) =>
  sent.events
    .filter((event) => event.event === "text_delta")
    .map((event) => event.data["text"])
    .join("")

describe("AI assistant (e2e)", () => {
  let server: TestServer
  let alice: string
  let bob: string
  const http = () => request(server.url)
  const as = (token: string) => ({ Authorization: `Bearer ${token}` })
  const create = async (token: string) =>
    (await http().post("/api/ai/conversations").set(as(token)).expect(201)).body as Conversation
  const messages = async (token: string, id: string) =>
    (await http().get(`/api/ai/conversations/${id}/messages`).set(as(token)).expect(200))
      .body as Message[]
  const usage = async (token: string) =>
    (await http().get("/api/ai/usage").set(as(token)).expect(200)).body as {
      used: number
      limit: number
    }

  beforeAll(async () => {
    server = await startTestServer({ AI_PROVIDER: "fake", AI_DAILY_MESSAGE_LIMIT: "50" })
    alice = await register(server)
    bob = await register(server)
  }, START_TIMEOUT_MS)

  afterAll(async () => {
    await server.stop()
  })

  it("needs a signed-in user for every endpoint", async () => {
    await http().get("/api/ai/usage").expect(401)
    await http().post("/api/ai/conversations").expect(401)
    await http().get("/api/ai/conversations").expect(401)
    await http().get("/api/ai/conversations/x/messages").expect(401)
    await http().delete("/api/ai/conversations/x").expect(401)
    await http().post("/api/ai/conversations/x/messages").send({ text: "hi" }).expect(401)
  })

  describe("conversations", () => {
    it("are created empty, listed newest first, and deleted with their messages", async () => {
      const first = await create(alice)
      await send(server, alice, first.id, "câu hỏi đầu")
      const second = await create(alice) // the first is not empty any more: this one is new
      expect(second.id).not.toBe(first.id)
      await send(server, alice, first.id, "câu hỏi thứ hai")

      const list = (await http().get("/api/ai/conversations").set(as(alice)).expect(200))
        .body as Conversation[]
      const ids = list.map((c) => c.id)
      // The one just used is first, even though the other was created later.
      expect(ids.indexOf(first.id)).toBeLessThan(ids.indexOf(second.id))
      expect(list.find((c) => c.id === second.id)?.title).toBe("")

      await http().delete(`/api/ai/conversations/${first.id}`).set(as(alice)).expect(204)
      await http().get(`/api/ai/conversations/${first.id}/messages`).set(as(alice)).expect(404)
      const rows = await server.db.rows(`SELECT 1 FROM "AiMessage" WHERE "conversationId" = $1`, [
        first.id,
      ])
      expect(rows).toHaveLength(0)
    })

    it("belong to their user: another user gets 404 for read, send and delete", async () => {
      const mine = await create(alice)
      await send(server, alice, mine.id, "bí mật")

      await http().get(`/api/ai/conversations/${mine.id}/messages`).set(as(bob)).expect(404)
      await http().delete(`/api/ai/conversations/${mine.id}`).set(as(bob)).expect(404)
      const attempt = await send(server, bob, mine.id, "tôi là Bob")
      expect(attempt.status).toBe(404)
      const list = (await http().get("/api/ai/conversations").set(as(bob)).expect(200))
        .body as Conversation[]
      expect(list.map((c) => c.id)).not.toContain(mine.id)
      // Nothing of Bob's went into Alice's conversation, and it is still there.
      expect((await messages(alice, mine.id)).map((m) => m.text)).toEqual([
        "bí mật",
        "Bạn nói: bí mật",
      ])
    })

    it("give the empty one again when asked for a new one twice", async () => {
      const heidi = await register(server)

      const first = await create(heidi)
      const second = await create(heidi)

      expect(second.id).toBe(first.id)
      await send(server, heidi, first.id, "đã có tin nhắn")
      expect((await create(heidi)).id).not.toBe(first.id)
    })

    it("are refused with 409 beyond 50 per user, until one is deleted", async () => {
      const ivan = await register(server)
      const ids: string[] = []
      for (let index = 0; index < 50; index += 1) {
        const conversation = await create(ivan)
        ids.push(conversation.id)
        // Give each a message straight in the database, so that none of them is "empty".
        await server.db.run(
          `INSERT INTO "AiMessage" (id, "conversationId", role, content)
           VALUES ($1, $2, 'USER', $3::jsonb)`,
          [`m-${conversation.id}`, conversation.id, JSON.stringify([{ type: "text", text: "x" }])],
        )
      }

      const refused = await http().post("/api/ai/conversations").set(as(ivan))
      expect(refused.status).toBe(409)
      expect(String((refused.body as { message: string }).message)).toContain("50")

      await http().delete(`/api/ai/conversations/${ids[0]}`).set(as(ivan)).expect(204)
      await http().post("/api/ai/conversations").set(as(ivan)).expect(201)
    }, 60_000)

    it("answer 404 for an id that does not exist", async () => {
      await http().get("/api/ai/conversations/nope/messages").set(as(alice)).expect(404)
      await http().delete("/api/ai/conversations/nope").set(as(alice)).expect(404)
      expect((await send(server, alice, "nope", "hi")).status).toBe(404)
    })
  })

  describe("a message", () => {
    it("is answered as a stream of events, then saved", async () => {
      const conversation = await create(alice)

      const sent = await send(server, alice, conversation.id, "nhạc buồn ngày mưa")

      expect(sent.status).toBe(200)
      expect(sent.contentType).toContain("text/event-stream")
      const names = sent.events.map((event) => event.event)
      expect(names[names.length - 1]).toBe("done")
      expect(names.slice(0, -1).every((name) => name === "text_delta")).toBe(true)
      expect(names.length).toBeGreaterThan(2)
      expect(textOf(sent)).toBe("Bạn nói: nhạc buồn ngày mưa")
      const done = sent.events[sent.events.length - 1].data
      expect(done["truncated"]).toBe(false)

      const saved = await messages(alice, conversation.id)
      expect(saved.map((m) => [m.role, m.text])).toEqual([
        ["user", "nhạc buồn ngày mưa"],
        ["assistant", "Bạn nói: nhạc buồn ngày mưa"],
      ])
      expect(saved[1].id).toBe(done["messageId"])
    })

    it("names the conversation after its first message only", async () => {
      const conversation = await create(alice)
      await send(server, alice, conversation.id, "  Gợi ý nhạc\n  chạy bộ  ")
      await send(server, alice, conversation.id, "câu thứ hai")

      const list = (await http().get("/api/ai/conversations").set(as(alice)).expect(200))
        .body as Conversation[]

      expect(list.find((c) => c.id === conversation.id)?.title).toBe("Gợi ý nhạc chạy bộ")
    })

    it("counts for the daily limit, and the usage endpoint says how many", async () => {
      const carol = await register(server)
      const conversation = await create(carol)
      expect(await usage(carol)).toEqual({ used: 0, limit: 50 })

      await send(server, carol, conversation.id, "một")
      await send(server, carol, conversation.id, "hai")

      expect(await usage(carol)).toEqual({ used: 2, limit: 50 })
    })

    it.each([
      ["empty", ""],
      ["only spaces", "   \n "],
      ["2001 characters", "x".repeat(2001)],
    ])("is refused with 400 when it is %s, and not counted", async (_name, text) => {
      const dave = await register(server)
      const conversation = await create(dave)

      const sent = await send(server, dave, conversation.id, text)

      expect(sent.status).toBe(400)
      expect(await usage(dave)).toEqual({ used: 0, limit: 50 })
      expect(await messages(dave, conversation.id)).toEqual([])
    })

    it("may be 2000 characters long", async () => {
      const conversation = await create(alice)
      const sent = await send(server, alice, conversation.id, "y".repeat(2000))
      expect(sent.status).toBe(200)
    })

    it("is refused with 400 when the body is not a text", async () => {
      const conversation = await create(alice)
      await http()
        .post(`/api/ai/conversations/${conversation.id}/messages`)
        .set(as(alice))
        .send({ text: 5 })
        .expect(400)
      await http()
        .post(`/api/ai/conversations/${conversation.id}/messages`)
        .set(as(alice))
        .send({})
        .expect(400)
    })
  })

  describe("when the model fails", () => {
    it("tells a rate limit in friendly words, keeps nothing and does not count the message", async () => {
      const erin = await register(server)
      const conversation = await create(erin)

      const sent = await send(server, erin, conversation.id, `hỏi ${FAKE_TRIGGERS.rateLimited}`)

      expect(sent.status).toBe(200)
      expect(sent.events).toEqual([
        {
          event: "error",
          data: { code: "assistant_busy", message: "Trợ lý đang quá tải, thử lại sau ít phút" },
        },
      ])
      expect(await messages(erin, conversation.id)).toEqual([])
      expect(await usage(erin)).toEqual({ used: 0, limit: 50 })
      // And the conversation still works.
      expect(textOf(await send(server, erin, conversation.id, "lại nào"))).toBe("Bạn nói: lại nào")
    })

    it("tells an outage and an empty answer as errors too", async () => {
      const conversation = await create(alice)

      const down = await send(server, alice, conversation.id, FAKE_TRIGGERS.unavailable)
      const empty = await send(server, alice, conversation.id, FAKE_TRIGGERS.empty)

      expect(down.events[0].data["code"]).toBe("assistant_unavailable")
      expect(empty.events[0].data["code"]).toBe("empty_answer")
      expect(await messages(alice, conversation.id)).toEqual([])
    })

    it("flags an answer cut off by the token limit", async () => {
      const conversation = await create(alice)
      const sent = await send(server, alice, conversation.id, `dài ${FAKE_TRIGGERS.long}`)
      expect(sent.events[sent.events.length - 1].data["truncated"]).toBe(true)
    })
  })

  describe("when the person leaves or writes twice", () => {
    it("stops the model, keeps nothing, gives the message back and frees the conversation", async () => {
      const frank = await register(server)
      const conversation = await create(frank)
      const controller = new AbortController()

      const pending = fetch(`${server.url}/api/ai/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${frank}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: `chờ ${FAKE_TRIGGERS.slow}` }),
        signal: controller.signal,
      })
      const response = await pending
      expect(response.status).toBe(200)
      // The question is kept and counted while the answer is being written.
      await eventually(async () => ((await usage(frank)).used === 1 ? true : undefined))

      controller.abort()
      await response.body?.cancel().catch(() => undefined)

      await eventually(async () => ((await usage(frank)).used === 0 ? true : undefined))
      expect(await messages(frank, conversation.id)).toEqual([])
      const again = await send(server, frank, conversation.id, "tôi quay lại")
      expect(again.status).toBe(200)
    })

    it("cannot be deleted while its answer is being written", async () => {
      const judy = await register(server)
      const conversation = await create(judy)
      const controller = new AbortController()
      const pending = await fetch(
        `${server.url}/api/ai/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${judy}`, "Content-Type": "application/json" },
          body: JSON.stringify({ text: `chờ ${FAKE_TRIGGERS.slow}` }),
          signal: controller.signal,
        },
      )
      try {
        await http().delete(`/api/ai/conversations/${conversation.id}`).set(as(judy)).expect(409)
      } finally {
        controller.abort()
        await pending.body?.cancel().catch(() => undefined)
      }
      await eventually(async () => ((await usage(judy)).used === 0 ? true : undefined))
      await http().delete(`/api/ai/conversations/${conversation.id}`).set(as(judy)).expect(204)
    })

    it("answers 409 to a second message while the first is being answered", async () => {
      const gina = await register(server)
      const conversation = await create(gina)
      const controller = new AbortController()
      const first = await fetch(`${server.url}/api/ai/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${gina}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: `chờ ${FAKE_TRIGGERS.slow}` }),
        signal: controller.signal,
      })
      try {
        const second = await send(server, gina, conversation.id, "tôi nữa")
        expect(second.status).toBe(409)
        // The refused message is not counted: only the first one is.
        expect((await usage(gina)).used).toBe(1)
      } finally {
        controller.abort()
        await first.body?.cancel().catch(() => undefined)
      }
    })
  })
})

describe("AI assistant limits (e2e)", () => {
  it(
    "answers 429 with a clear message at the daily limit, and deleting a conversation gives nothing back",
    async () => {
      const server = await startTestServer({ AI_PROVIDER: "fake", AI_DAILY_MESSAGE_LIMIT: "2" })
      try {
        const token = await register(server)
        const auth = { Authorization: `Bearer ${token}` }
        const created = await request(server.url).post("/api/ai/conversations").set(auth)
        const id = (created.body as Conversation).id

        expect((await send(server, token, id, "một")).status).toBe(200)
        expect((await send(server, token, id, "hai")).status).toBe(200)
        const third = await send(server, token, id, "ba")

        expect(third.status).toBe(429)
        expect(third.json?.["message"]).toBe(
          "Bạn đã dùng hết 2 tin nhắn hôm nay. Hãy quay lại vào ngày mai nhé.",
        )
        const used = await request(server.url).get("/api/ai/usage").set(auth).expect(200)
        expect(used.body).toEqual({ used: 2, limit: 2 })

        await request(server.url).delete(`/api/ai/conversations/${id}`).set(auth).expect(204)
        const fresh = await request(server.url).post("/api/ai/conversations").set(auth)
        const again = await send(server, token, (fresh.body as Conversation).id, "bốn")
        expect(again.status).toBe(429)

        // Another user has a limit of their own.
        const other = await register(server)
        const otherConversation = await request(server.url)
          .post("/api/ai/conversations")
          .set({ Authorization: `Bearer ${other}` })
        expect(
          (await send(server, other, (otherConversation.body as Conversation).id, "xin chào"))
            .status,
        ).toBe(200)
      } finally {
        await server.stop()
      }
    },
    START_TIMEOUT_MS,
  )

  it(
    "limits messages per minute per user, not for everybody",
    async () => {
      const server = await startTestServer({
        AI_PROVIDER: "fake",
        AI_CHAT_THROTTLE_LIMIT: "2",
        AI_CHAT_THROTTLE_TTL_SECONDS: "60",
      })
      try {
        const busy = await register(server)
        const quiet = await register(server)
        const conversationOf = async (token: string) =>
          (
            (
              await request(server.url)
                .post("/api/ai/conversations")
                .set({ Authorization: `Bearer ${token}` })
            ).body as Conversation
          ).id
        const busyId = await conversationOf(busy)

        expect((await send(server, busy, busyId, "một")).status).toBe(200)
        expect((await send(server, busy, busyId, "hai")).status).toBe(200)
        expect((await send(server, busy, busyId, "ba")).status).toBe(429)
        expect((await send(server, quiet, await conversationOf(quiet), "xin chào")).status).toBe(
          200,
        )
      } finally {
        await server.stop()
      }
    },
    START_TIMEOUT_MS,
  )

  it(
    "answers 503 on every endpoint without a model, while the rest of the API keeps working",
    async () => {
      const server = await startTestServer()
      try {
        const token = await register(server)
        const auth = { Authorization: `Bearer ${token}` }

        await request(server.url).get("/api/ai/usage").set(auth).expect(503)
        await request(server.url).post("/api/ai/conversations").set(auth).expect(503)
        await request(server.url).get("/api/ai/conversations").set(auth).expect(503)
        await request(server.url).get("/api/ai/conversations/x/messages").set(auth).expect(503)
        await request(server.url).delete("/api/ai/conversations/x").set(auth).expect(503)
        expect((await send(server, token, "x", "hi")).status).toBe(503)
        await request(server.url).get("/api/tracks").expect(200)
      } finally {
        await server.stop()
      }
    },
    START_TIMEOUT_MS,
  )
})
