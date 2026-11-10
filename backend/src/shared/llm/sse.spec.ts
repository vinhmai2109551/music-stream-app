import { describe, expect, it } from "@jest/globals"
import { readSse, type SseMessage } from "./sse.js"

/** A body that delivers `chunks` one by one (text is encoded; bytes are used as they are). */
function body(chunks: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let next = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (next >= chunks.length) return controller.close()
      const chunk = chunks[next]
      next += 1
      controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk)
    },
  })
}

async function read(chunks: (string | Uint8Array)[]): Promise<SseMessage[]> {
  const messages: SseMessage[] = []
  for await (const message of readSse(body(chunks))) messages.push(message)
  return messages
}

describe("readSse", () => {
  it("reads an event with a name and data", async () => {
    expect(await read(['event: step.delta\ndata: {"a":1}\n\n'])).toEqual([
      { event: "step.delta", data: '{"a":1}' },
    ])
  })

  it("calls an event without a name 'message'", async () => {
    expect(await read(["data: hi\n\n"])).toEqual([{ event: "message", data: "hi" }])
  })

  it("reads several events in one chunk", async () => {
    expect(await read(["event: a\ndata: 1\n\nevent: b\ndata: 2\n\n"])).toEqual([
      { event: "a", data: "1" },
      { event: "b", data: "2" },
    ])
  })

  it("joins the data lines of one event with a newline", async () => {
    expect(await read(["data: one\ndata: two\n\n"])).toEqual([
      { event: "message", data: "one\ntwo" },
    ])
  })

  it("takes an event cut anywhere between chunks", async () => {
    const text = 'event: step.delta\ndata: {"text":"xin chào"}\n\nevent: done\ndata: [DONE]\n\n'
    for (let cut = 1; cut < text.length; cut += 1) {
      expect(await read([text.slice(0, cut), text.slice(cut)])).toEqual([
        { event: "step.delta", data: '{"text":"xin chào"}' },
        { event: "done", data: "[DONE]" },
      ])
    }
  })

  it("takes one character per chunk", async () => {
    const text = "event: a\ndata: x\n\nevent: b\ndata: y\n\n"
    expect(await read([...text])).toEqual([
      { event: "a", data: "x" },
      { event: "b", data: "y" },
    ])
  })

  it("takes a multi-byte character cut in the middle of its bytes", async () => {
    const bytes = new TextEncoder().encode("data: Hà Nội ♪\n\n")
    for (let cut = 1; cut < bytes.length; cut += 1) {
      expect(await read([bytes.slice(0, cut), bytes.slice(cut)])).toEqual([
        { event: "message", data: "Hà Nội ♪" },
      ])
    }
  })

  it.each([
    ["CRLF", "event: a\r\ndata: x\r\n\r\n"],
    ["CR", "event: a\rdata: x\r\r"],
  ])("accepts %s line ends", async (_name, text) => {
    expect(await read([text])).toEqual([{ event: "a", data: "x" }])
  })

  it("accepts a CRLF cut between the CR and the LF", async () => {
    expect(await read(["event: a\r", "\ndata: x\r", "\n\r", "\n"])).toEqual([
      { event: "a", data: "x" },
    ])
  })

  it("ignores comments, unknown fields and a missing space after the colon", async () => {
    expect(await read([": keep-alive\nid: 7\nretry: 100\nevent:a\ndata:x\n\n"])).toEqual([
      { event: "a", data: "x" },
    ])
  })

  it("skips an event that has no data", async () => {
    expect(await read(["event: a\n\nevent: b\ndata: y\n\n"])).toEqual([{ event: "b", data: "y" }])
  })

  it("does not carry the name of one event to the next", async () => {
    expect(await read(["event: a\ndata: 1\n\ndata: 2\n\n"])).toEqual([
      { event: "a", data: "1" },
      { event: "message", data: "2" },
    ])
  })

  it("gives an event whose blank line never came when the stream ends", async () => {
    expect(await read(["event: a\ndata: x"])).toEqual([{ event: "a", data: "x" }])
    expect(await read(["event: a\ndata: x\n"])).toEqual([{ event: "a", data: "x" }])
  })

  it("keeps an empty data line as an empty line of the data", async () => {
    expect(await read(["data: a\ndata:\ndata: b\n\n"])).toEqual([
      { event: "message", data: "a\n\nb" },
    ])
  })

  it("gives nothing for an empty stream", async () => {
    expect(await read([])).toEqual([])
    expect(await read([""])).toEqual([])
  })
})

describe("readSse at the end", () => {
  it("takes a final carriage return as the end of the line", async () => {
    expect(await read(["event: done\r\ndata: [DONE]\r"])).toEqual([
      { event: "done", data: "[DONE]" },
    ])
  })

  it("closes the connection when whoever reads stops early", async () => {
    let cancelled = false
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new TextEncoder().encode("data: one\n\n"))
      },
      cancel() {
        cancelled = true
      },
    })

    for await (const message of readSse(stream)) {
      expect(message.data).toBe("one")
      break
    }

    expect(cancelled).toBe(true)
  })

  it("does not cancel a stream that ended by itself", async () => {
    let cancelled = false
    let sent = false
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent) return controller.close()
        sent = true
        controller.enqueue(new TextEncoder().encode("data: x\n\n"))
      },
      cancel() {
        cancelled = true
      },
    })

    await readAll(stream)

    expect(cancelled).toBe(false)
  })
})

async function readAll(stream: ReadableStream<Uint8Array>) {
  const messages: SseMessage[] = []
  for await (const message of readSse(stream)) messages.push(message)
  return messages
}
