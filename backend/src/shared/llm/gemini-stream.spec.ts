import { describe, expect, it } from "@jest/globals"
import { StepAssembler } from "./gemini-stream.js"
import { LlmUnavailableError } from "./llm-client.js"

const start = (index: number, step: object) => ({ index, step, event_type: "step.start" })
const delta = (index: number, d: object) => ({ index, delta: d, event_type: "step.delta" })
const stop = (index: number) => ({ index, event_type: "step.stop" })
const completed = (status: string, usage: object = {}) => ({
  interaction: { status, usage },
  event_type: "interaction.completed",
})

function run(events: object[]) {
  const assembler = new StepAssembler()
  const texts = events.flatMap((event) => assembler.feed(event) ?? [])
  return { texts, ...assembler.result() }
}

describe("StepAssembler", () => {
  it("assembles a thought and an answer, as captured from the real API", () => {
    const { steps, texts, status } = run([
      { interaction: { object: "interaction" }, event_type: "interaction.created" },
      { status: "in_progress", event_type: "interaction.status_update" },
      start(0, { type: "thought" }),
      delta(0, { signature: "EmAKXgFp", type: "thought_signature" }),
      stop(0),
      start(1, { type: "model_output" }),
      delta(1, { text: "1", type: "text" }),
      delta(1, { text: ". Nhạc không lời", type: "text" }),
      delta(1, { text: " piano.", type: "text" }),
      stop(1),
      completed("completed", { total_tokens: 134 }),
    ])

    expect(steps).toEqual([
      { type: "thought", signature: "EmAKXgFp" },
      { type: "model_output", content: [{ type: "text", text: "1. Nhạc không lời piano." }] },
    ])
    expect(texts).toEqual(["1", ". Nhạc không lời", " piano."])
    expect(status).toBe("completed")
  })

  it("assembles a function call from the pieces of its arguments", () => {
    const { steps, status } = run([
      start(0, { type: "thought" }),
      delta(0, { signature: "sig", type: "thought_signature" }),
      stop(0),
      start(1, { id: "call_1", type: "function_call", name: "get_weather", arguments: {} }),
      delta(1, { arguments: '{"ci', type: "arguments_delta" }),
      delta(1, { arguments: 'ty":"Hà ', type: "arguments_delta" }),
      delta(1, { arguments: 'Nội"}', type: "arguments_delta" }),
      stop(1),
      completed("requires_action"),
    ])

    expect(steps[1]).toEqual({
      id: "call_1",
      type: "function_call",
      name: "get_weather",
      arguments: { city: "Hà Nội" },
    })
    expect(status).toBe("requires_action")
  })

  it("keeps the arguments the call announced when no piece comes", () => {
    const { steps } = run([
      start(0, { id: "c", type: "function_call", name: "now", arguments: {} }),
      stop(0),
    ])
    expect(steps[0]).toMatchObject({ name: "now", arguments: {} })
  })

  it.each([
    ["not JSON", "{broken"],
    ["not an object", "[1,2]"],
  ])("gives empty arguments when the pieces are %s", (_name, text) => {
    const { steps } = run([
      start(0, { id: "c", type: "function_call", name: "x", arguments: {} }),
      delta(0, { arguments: text, type: "arguments_delta" }),
      stop(0),
    ])
    expect(steps[0]).toMatchObject({ arguments: {} })
  })

  it("orders the steps by index, not by when they stopped", () => {
    const { steps } = run([
      start(0, { type: "thought" }),
      start(1, { type: "model_output" }),
      delta(1, { text: "b", type: "text" }),
      stop(1),
      stop(0),
    ])
    expect(steps.map((step) => step["type"])).toEqual(["thought", "model_output"])
  })

  it("does not include a step that never stopped (the stream was cut)", () => {
    const { steps } = run([
      start(0, { type: "model_output" }),
      delta(0, { text: "half", type: "text" }),
    ])
    expect(steps).toEqual([])
  })

  it("keeps a model_output step with no text as it was announced", () => {
    const { steps } = run([start(0, { type: "model_output" }), stop(0)])
    expect(steps).toEqual([{ type: "model_output" }])
  })

  it("passes the usage on", () => {
    const { usage } = run([completed("completed", { total_input_tokens: 25, total_tokens: 134 })])
    expect(usage).toEqual({ total_input_tokens: 25, total_tokens: 134 })
  })

  it("skips events and deltas it does not know", () => {
    const { steps, texts } = run([
      { event_type: "something.new", x: 1 },
      start(0, { type: "model_output" }),
      delta(0, { type: "thought_summary", content: { type: "text", text: "hmm" } }),
      delta(0, { type: "image", data: "AAAA" }),
      delta(0, { text: "ok", type: "text" }),
      stop(0),
    ])
    expect(texts).toEqual(["ok"])
    expect(steps).toEqual([{ type: "model_output", content: [{ type: "text", text: "ok" }] }])
  })

  it("ignores deltas and stops of a step that was never started, and junk", () => {
    const assembler = new StepAssembler()
    expect(assembler.feed(delta(5, { text: "x", type: "text" }))).toBeNull()
    expect(assembler.feed(stop(5))).toBeNull()
    expect(assembler.feed(null)).toBeNull()
    expect(assembler.feed("text")).toBeNull()
    expect(assembler.feed(start(0, "not an object" as unknown as object))).toBeNull()
    expect(assembler.result().steps).toEqual([])
  })

  it("turns an error event into LlmUnavailableError", () => {
    const assembler = new StepAssembler()
    expect(() =>
      assembler.feed({
        error: { message: "deadline", code: "gateway_timeout" },
        event_type: "error",
      }),
    ).toThrow(LlmUnavailableError)
  })

  it("gives the same steps as the thought and answer of a non-streamed answer", () => {
    // The shape that must be sent back unchanged: a thought keeps its signature.
    const { steps } = run([
      start(0, { type: "thought" }),
      delta(0, { signature: "S", type: "thought_signature" }),
      stop(0),
    ])
    expect(steps[0]).toEqual({ type: "thought", signature: "S" })
  })
})

describe("StepAssembler.completed", () => {
  it("is false until interaction.completed arrives", () => {
    const assembler = new StepAssembler()
    expect(assembler.completed).toBe(false)
    assembler.feed(start(0, { type: "model_output" }))
    assembler.feed(stop(0))
    expect(assembler.completed).toBe(false)
    assembler.feed(completed("completed"))
    expect(assembler.completed).toBe(true)
  })
})
