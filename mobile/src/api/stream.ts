import { fetch as streamingFetch } from "expo/fetch"
import type { AssistantEvent } from "@/api/types"
import { parseAssistantEvent } from "@/utils/assistantEvents"
import { SseParser, type SseMessage } from "@/utils/sse"
import { createUtf8Decoder } from "@/utils/utf8"
import { API_BASE_URL, ApiError, messageFromBody, parseBody, session } from "./client"
import { t } from "@/i18n"

/** How long to wait for the server to start answering. The answer itself may take longer. */
const CONNECT_TIMEOUT_MS = 20_000

type Chunk = { done: boolean; value?: Uint8Array }

interface StreamBody {
  getReader(): { read(): Promise<Chunk>; cancel(): Promise<void>; releaseLock(): void }
}

interface StreamResponse {
  status: number
  ok: boolean
  body: StreamBody | null
  text(): Promise<string>
}

/** Asks for a stream and gives its body; an answer that is not a stream is an ApiError. */
async function connect(
  path: string,
  body: unknown,
  token: string | null,
  signal: AbortSignal,
): Promise<StreamResponse> {
  const headers: Record<string, string> = { Accept: "text/event-stream" }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers.Authorization = `Bearer ${token}`

  const connecting = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    connecting.abort()
  }, CONNECT_TIMEOUT_MS)
  const stop = () => connecting.abort()
  signal.addEventListener("abort", stop, { once: true })

  try {
    const response = (await streamingFetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: connecting.signal,
    })) as unknown as StreamResponse
    if (response.ok) return response
    const data = parseBody(await response.text())
    throw new ApiError({
      status: response.status,
      kind: "http",
      message: messageFromBody(data, response.status),
      details: data,
    })
  } catch (error) {
    if (error instanceof ApiError) throw error
    // The person left (or pressed Stop) before the server answered: not a failure to report.
    if (signal.aborted) throw error
    throw new ApiError(
      timedOut
        ? { status: 0, kind: "timeout", message: t("errors.timeout") }
        : { status: 0, kind: "network", message: t("errors.network") },
    )
  } finally {
    clearTimeout(timer)
    signal.removeEventListener("abort", stop)
  }
}

/**
 * POSTs to a path that answers with Server-Sent Events and calls `onEvent` for each event as it
 * arrives, until the stream ends. Like every request it sends the token, and renews it once on a
 * 401. Errors found before the stream starts (404, 409, 410, 429, 503...) are thrown as ApiError;
 * a stream that breaks after it started is thrown as an ApiError of kind "network". Aborting
 * `signal` stops it quietly (the promise resolves).
 */
export async function streamEvents(
  path: string,
  body: unknown,
  onEvent: (event: AssistantEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  if (!API_BASE_URL) {
    throw new ApiError({ status: 0, kind: "network", message: t("errors.notConfigured") })
  }

  const token = session.token()
  let response: StreamResponse
  try {
    response = await connect(path, body, token, signal)
  } catch (error) {
    if (signal.aborted) return
    // Only an authenticated request that was rejected is worth a refresh.
    if (!token || !(error instanceof ApiError) || error.status !== 401) throw error
    const fresh = await session.renew(token)
    if (!fresh) {
      session.expired()
      throw error
    }
    try {
      response = await connect(path, body, fresh, signal) // retried exactly once
    } catch (retryError) {
      if (signal.aborted) return
      if (retryError instanceof ApiError && retryError.status === 401) session.expired()
      throw retryError
    }
  }

  if (!response.body) {
    throw new ApiError({ status: 0, kind: "network", message: t("errors.network") })
  }
  const reader = response.body.getReader()
  const decoder = createUtf8Decoder()
  const parser = new SseParser()
  const cancel = () => void reader.cancel().catch(() => undefined)
  signal.addEventListener("abort", cancel, { once: true })

  // A failure of the code that handles an event is not the network's: it stops the stream and is
  // thrown as it is.
  const handler: { failed: boolean; error?: unknown } = { failed: false }
  const deliver = (messages: SseMessage[]) => {
    for (const message of messages) {
      const event = parseAssistantEvent(message)
      if (!event || handler.failed) continue
      try {
        onEvent(event)
      } catch (error) {
        handler.failed = true
        handler.error = error
        cancel()
      }
    }
  }

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done || handler.failed) break
      if (value) deliver(parser.push(decoder.decode(value)))
    }
    deliver(parser.push(decoder.end()))
    deliver(parser.flush())
  } catch {
    if (signal.aborted) return
    if (!handler.failed) {
      throw new ApiError({ status: 0, kind: "network", message: t("errors.network") })
    }
  } finally {
    signal.removeEventListener("abort", cancel)
    reader.releaseLock()
  }
  if (handler.failed) throw handler.error
}
