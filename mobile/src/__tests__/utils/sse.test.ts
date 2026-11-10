import { describe, expect, it } from "@jest/globals"
import { SseParser, type SseMessage } from "@/utils/sse"

/** Everything the parser gives for these pieces, with the end of the stream. */
function read(pieces: string[]): SseMessage[] {
  const parser = new SseParser()
  return [...pieces.flatMap((piece) => parser.push(piece)), ...parser.flush()]
}

const STREAM =
  'event: text_delta\ndata: {"text":"Xin chào"}\n\nevent: tool_call\ndata: {"name":"search_catalog"}\n\nevent: done\ndata: {"messageId":"m1"}\n\n'
const EXPECTED: SseMessage[] = [
  { event: "text_delta", data: '{"text":"Xin chào"}' },
  { event: "tool_call", data: '{"name":"search_catalog"}' },
  { event: "done", data: '{"messageId":"m1"}' },
]

describe("SseParser", () => {
  it("reads events with a name and data", () => {
    expect(read([STREAM])).toEqual(EXPECTED)
  })

  it("calls an event without a name 'message'", () => {
    expect(read(["data: hi\n\n"])).toEqual([{ event: "message", data: "hi" }])
  })

  it("joins the data lines of one event with a newline", () => {
    expect(read(["data: one\ndata: two\n\n"])).toEqual([{ event: "message", data: "one\ntwo" }])
  })

  it("gives the same events however the stream is cut into two pieces", () => {
    for (let cut = 1; cut < STREAM.length; cut += 1) {
      expect(read([STREAM.slice(0, cut), STREAM.slice(cut)])).toEqual(EXPECTED)
    }
  })

  it("gives the same events however the stream is cut into three pieces", () => {
    for (let first = 1; first < STREAM.length; first += 7) {
      for (let second = first + 1; second < STREAM.length; second += 5) {
        const pieces = [STREAM.slice(0, first), STREAM.slice(first, second), STREAM.slice(second)]
        expect(read(pieces)).toEqual(EXPECTED)
      }
    }
  })

  it("gives the same events one character at a time", () => {
    expect(read([...STREAM])).toEqual(EXPECTED)
  })

  it("does not give an event before its blank line comes", () => {
    const parser = new SseParser()
    expect(parser.push("event: a\ndata: 1\n")).toEqual([])
    expect(parser.push("\n")).toEqual([{ event: "a", data: "1" }])
  })

  it.each([
    ["CRLF", "event: a\r\ndata: x\r\n\r\n"],
    ["CR", "event: a\rdata: x\r\r"],
    ["LF", "event: a\ndata: x\n\n"],
  ])("accepts %s line ends", (_name, text) => {
    expect(read([text])).toEqual([{ event: "a", data: "x" }])
  })

  it("accepts a CRLF cut between its CR and its LF", () => {
    expect(read(["event: a\r", "\ndata: x\r", "\n\r", "\n"])).toEqual([{ event: "a", data: "x" }])
  })

  it("ignores comments (the heartbeat), unknown fields and a missing space after the colon", () => {
    expect(read([": ping\n\nid: 7\nretry: 100\nevent:a\ndata:x\n\n"])).toEqual([
      { event: "a", data: "x" },
    ])
  })

  it("skips an event that has no data", () => {
    expect(read(["event: a\n\nevent: b\ndata: y\n\n"])).toEqual([{ event: "b", data: "y" }])
  })

  it("does not carry the name of one event to the next", () => {
    expect(read(["event: a\ndata: 1\n\ndata: 2\n\n"])).toEqual([
      { event: "a", data: "1" },
      { event: "message", data: "2" },
    ])
  })

  it("keeps an empty data line as an empty line of the data", () => {
    expect(read(["data: a\ndata:\ndata: b\n\n"])).toEqual([{ event: "message", data: "a\n\nb" }])
  })

  it("keeps a colon inside the data", () => {
    expect(read(['data: {"a":"b:c"}\n\n'])).toEqual([{ event: "message", data: '{"a":"b:c"}' }])
  })

  it("gives the last event when the stream ends without its blank line", () => {
    expect(read(["event: a\ndata: x"])).toEqual([{ event: "a", data: "x" }])
    expect(read(["event: a\ndata: x\n"])).toEqual([{ event: "a", data: "x" }])
    expect(read(["event: a\ndata: x\r"])).toEqual([{ event: "a", data: "x" }])
  })

  it("gives nothing for an empty stream or only comments", () => {
    expect(read([])).toEqual([])
    expect(read([""])).toEqual([])
    expect(read([": ping\n\n: ping\n\n"])).toEqual([])
  })

  it("can be used again after the end of a stream", () => {
    const parser = new SseParser()
    parser.push("data: lost")
    expect(parser.flush()).toEqual([{ event: "message", data: "lost" }])
    expect(parser.push("data: next\n\n")).toEqual([{ event: "message", data: "next" }])
  })

  it("keeps a text with a line break on one data line, as the server writes it", () => {
    const text = 'event: text_delta\ndata: {"text":"a\\nb"}\n\n'
    expect(read([text])).toEqual([{ event: "text_delta", data: '{"text":"a\\nb"}' }])
  })
})
