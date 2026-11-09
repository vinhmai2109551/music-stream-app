/** One event of a Server-Sent Events stream. */
export interface SseMessage {
  /** The `event:` name, or "message" when the stream gave none. */
  event: string
  /** The `data:` lines, joined with a newline. */
  data: string
}

/**
 * Reads a Server-Sent Events body and yields its events. Chunks may cut an event, a line or even
 * a multi-byte character anywhere; lines end with \n, \r\n or \r; comment lines (":...") are
 * ignored; an event without data is skipped. The stream's own end flushes an event whose blank
 * line never came.
 */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseMessage> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let pending = ""
  let event = ""
  let data: string[] = []

  const flush = (): SseMessage | null => {
    const message = data.length > 0 ? { event: event || "message", data: data.join("\n") } : null
    event = ""
    data = []
    return message
  }
  const take = function* (line: string): Generator<SseMessage> {
    if (line === "") {
      const message = flush()
      if (message) yield message
    } else if (!line.startsWith(":")) {
      const colon = line.indexOf(":")
      const field = colon === -1 ? line : line.slice(0, colon)
      let value = colon === -1 ? "" : line.slice(colon + 1)
      if (value.startsWith(" ")) value = value.slice(1)
      if (field === "event") event = value
      else if (field === "data") data.push(value)
    }
  }

  let finished = false
  try {
    for (;;) {
      const { done, value } = await reader.read()
      pending += decoder.decode(value, { stream: !done })
      // A lone "\r" at the very end may be the first half of "\r\n": wait for the next chunk
      // (at the end of the stream there is none, so there it ends the line).
      const lines = pending.split(done ? /\r\n|\n|\r/ : /\r\n|\n|\r(?!$)/)
      pending = done ? "" : (lines.pop() ?? "")
      if (done && lines.length > 0 && lines[lines.length - 1] === "") lines.pop()
      for (const line of lines) yield* take(line)
      if (done) break
    }
    finished = true
    const last = flush()
    if (last) yield last
  } finally {
    // Leaving early (whoever reads the events stopped, or an error): close the connection too.
    if (!finished) await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
