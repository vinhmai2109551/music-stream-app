import { describe, expect, it } from "@jest/globals"
import { LlmUnavailableError } from "../../shared/llm/llm-client.js"
import { ScriptedLlmClient } from "../../shared/llm/scripted-llm-client.js"
import { enrichModelOf } from "./enrich-model.js"
import { extractJsonObject } from "./json-text.js"

const request = {
  system: "Label songs.",
  user: "Label these.",
  schema: { type: "object" },
  maxTokens: 777,
}

describe("extractJsonObject", () => {
  it("returns plain JSON as it is", () => {
    expect(extractJsonObject('{"items":[]}')).toBe('{"items":[]}')
  })

  it("strips a markdown fence and the words around the object", () => {
    expect(extractJsonObject('Đây nhé:\n```json\n{"items":[{"id":"a"}]}\n```\nXong.')).toBe(
      '{"items":[{"id":"a"}]}',
    )
  })

  it("keeps nested braces", () => {
    expect(extractJsonObject('x {"a":{"b":1}} y')).toBe('{"a":{"b":1}}')
  })

  it.each([[""], ["no json here"], ["}{"], ["{"]])("throws for %j", (text) => {
    expect(() => extractJsonObject(text)).toThrow(/no JSON object/)
  })
})

describe("enrichModelOf", () => {
  it("sends the instructions, the songs and the schema, and returns just the JSON", async () => {
    const llm = new ScriptedLlmClient(['```json\n{"items":[]}\n```'])

    const text = await enrichModelOf(llm).complete(request)

    expect(text).toBe('{"items":[]}')
    expect(llm.requests[0].system).toBe("Label songs.")
    expect(llm.requests[0].maxOutputTokens).toBe(777)
    const sent = llm.requests[0].messages[0].parts[0]
    expect(sent).toMatchObject({ type: "text" })
    const prompt = (sent as { text: string }).text
    expect(prompt).toContain("Label these.")
    expect(prompt).toContain('{"type":"object"}')
    expect(prompt).toContain("ONLY one JSON object")
  })

  it("refuses an answer that was cut off", async () => {
    const llm = new ScriptedLlmClient([
      {
        message: { role: "assistant", parts: [{ type: "text", text: '{"items":[' }] },
        finish: "length",
        usage: { inputTokens: 1, outputTokens: 1, thoughtTokens: 0, totalTokens: 2 },
        requests: 1,
      },
    ])

    await expect(enrichModelOf(llm).complete(request)).rejects.toThrow(/cut off/)
  })

  it("passes on an error of the model", async () => {
    const llm = new ScriptedLlmClient([new LlmUnavailableError()])

    await expect(enrichModelOf(llm).complete(request)).rejects.toBeInstanceOf(LlmUnavailableError)
  })
})
