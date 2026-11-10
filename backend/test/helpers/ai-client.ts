import request from "supertest"
import { uniqueEmail, type TestServer } from "./test-server.js"

export interface SseEvent {
  event: string
  data: Record<string, unknown>
}

export interface Streamed {
  status: number
  events: SseEvent[]
  /** The body when it was not a stream (an ordinary error response). */
  json: Record<string, unknown> | null
}

export async function registerUser(server: TestServer, role: "USER" | "ADMIN" = "USER") {
  const credentials = { email: uniqueEmail(), name: "Assistant tester", password: "password123" }
  await request(server.url).post("/api/auth/register").send(credentials).expect(201)
  if (role === "ADMIN") {
    await server.db.run(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [credentials.email])
  }
  const login = await request(server.url)
    .post("/api/auth/login")
    .send({ email: credentials.email, password: credentials.password })
    .expect(200)
  const token = (login.body as { accessToken: string }).accessToken
  const me = await request(server.url).get("/api/users/me").set("Authorization", `Bearer ${token}`)
  return { token, id: (me.body as { id: string }).id }
}

export function parseSse(text: string): SseEvent[] {
  return text
    .split("\n\n")
    .filter((block) => block.startsWith("event:"))
    .map((block) => {
      const [name, data] = block.split("\n")
      return {
        event: name.slice("event: ".length),
        data: JSON.parse(data.slice("data: ".length)) as Record<string, unknown>,
      }
    })
}

/** POSTs and reads the whole answer, stream or not. */
export async function postStream(
  server: TestServer,
  token: string,
  path: string,
  body?: unknown,
): Promise<Streamed> {
  const response = await fetch(`${server.url}/api/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const stream = (response.headers.get("content-type") ?? "").startsWith("text/event-stream")
  const text = await response.text()
  return {
    status: response.status,
    events: stream ? parseSse(text) : [],
    json: stream ? null : (JSON.parse(text || "{}") as Record<string, unknown>),
  }
}

export const sendMessage = (
  server: TestServer,
  token: string,
  conversationId: string,
  text: string,
) => postStream(server, token, `ai/conversations/${conversationId}/messages`, { text })

export const decide = (
  server: TestServer,
  token: string,
  actionId: string,
  what: "confirm" | "reject",
) => postStream(server, token, `ai/actions/${actionId}/${what}`)

export const textOf = (sent: Streamed) =>
  sent.events
    .filter((event) => event.event === "text_delta")
    .map((event) => event.data["text"])
    .join("")

export const namesOf = (sent: Streamed) => sent.events.map((event) => event.event)

/** `[[call:name:{json}]]`, the way the fake model is asked for a tool. */
export const call = (name: string, args: object) => `[[call:${name}:${JSON.stringify(args)}]]`

export async function newConversation(server: TestServer, token: string): Promise<string> {
  const created = await request(server.url)
    .post("/api/ai/conversations")
    .set("Authorization", `Bearer ${token}`)
    .expect(201)
  return (created.body as { id: string }).id
}
