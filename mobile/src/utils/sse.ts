/** One event of a Server-Sent Events stream. */
export interface SseMessage {
  /** The `event:` name, or "message" when the stream gave none. */
  event: string
  /** The `data:` lines, joined with a newline. */
  data: string
}

/**
 * Reads Server-Sent Events from text that arrives in pieces. A piece may end anywhere: in the
 * middle of an event, of a line, or between the "\r" and the "\n" of a line end. Lines end with
 * "\n", "\r\n" or "\r"; comment lines (":...") and unknown fields are ignored; an event without
 * data is skipped. Call `flush()` when the stream ends: it gives an event whose blank line never
 * came.
 */
export class SseParser {
  private pending = ""
  private event = ""
  private data: string[] = []

  /** Takes the next piece of text; returns the events that are now complete. */
  push(text: string): SseMessage[] {
    this.pending += text
    // A lone "\r" at the very end may be the first half of "\r\n": wait for the next piece.
    const lines = this.pending.split(/\r\n|\n|\r(?!$)/)
    this.pending = lines.pop() ?? ""
    return lines.flatMap((line) => this.take(line))
  }

  /** The stream ended: the last line (with or without a line end) and the last event. */
  flush(): SseMessage[] {
    const rest = this.pending.replace(/\r$/, "")
    this.pending = ""
    const messages = rest === "" ? [] : this.take(rest)
    const last = this.finish()
    return last ? [...messages, last] : messages
  }

  private take(line: string): SseMessage[] {
    if (line === "") {
      const message = this.finish()
      return message ? [message] : []
    }
    if (line.startsWith(":")) return []
    const colon = line.indexOf(":")
    const field = colon === -1 ? line : line.slice(0, colon)
    let value = colon === -1 ? "" : line.slice(colon + 1)
    if (value.startsWith(" ")) value = value.slice(1)
    if (field === "event") this.event = value
    else if (field === "data") this.data.push(value)
    return []
  }

  private finish(): SseMessage | null {
    const message =
      this.data.length > 0 ? { event: this.event || "message", data: this.data.join("\n") } : null
    this.event = ""
    this.data = []
    return message
  }
}
