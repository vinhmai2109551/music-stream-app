import { LlmUnavailableError, type JsonObject } from "./llm-client.js"

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

interface OpenStep {
  /** The step as `step.start` announced it, with the deltas applied as they come. */
  step: JsonObject
  text: string
  hasText: boolean
  argumentsText: string
  hasArguments: boolean
}

export interface StreamedInteraction {
  /** The steps, in order, in the same shape as the `steps` of a non-streamed answer. */
  steps: JsonObject[]
  status: unknown
  usage: unknown
}

/**
 * Builds the steps of an answer from the events of the Interactions stream: every step is a
 * `step.start`, some `step.delta` and a `step.stop`, and the assembled step has the shape that
 * the non-streamed answer has - the model's reasoning included, signature and all, because it
 * must be sent back unchanged with the next request.
 */
export class StepAssembler {
  private readonly open = new Map<number, OpenStep>()
  private readonly done: { index: number; step: JsonObject }[] = []
  private status: unknown = null
  private usage: unknown = null
  private finished = false

  /**
   * Takes one event (the parsed `data:` of an SSE message). Returns the piece of text it carries,
   * if any, so it can be shown at once. Events of types it does not know are skipped: the API may
   * add some. Throws `LlmUnavailableError` for an `error` event.
   */
  feed(event: unknown): string | null {
    if (!isRecord(event)) return null
    switch (event["event_type"]) {
      case "step.start":
        this.start(event)
        return null
      case "step.delta":
        return this.delta(event)
      case "step.stop":
        this.stop(event)
        return null
      case "interaction.completed": {
        const interaction = isRecord(event["interaction"]) ? event["interaction"] : {}
        this.status = interaction["status"]
        this.usage = interaction["usage"]
        this.finished = true
        return null
      }
      case "error": {
        const error = isRecord(event["error"]) ? event["error"] : {}
        const message = typeof error["message"] === "string" ? error["message"] : "unknown error"
        throw new LlmUnavailableError(`Gemini stopped the answer: ${message.slice(0, 200)}`)
      }
      default:
        return null
    }
  }

  /** True once the stream said that the interaction is complete (`interaction.completed`). */
  get completed(): boolean {
    return this.finished
  }

  /** The finished interaction. A step still open (the stream was cut) is not included. */
  result(): StreamedInteraction {
    const steps = [...this.done].sort((a, b) => a.index - b.index).map((entry) => entry.step)
    return { steps, status: this.status, usage: this.usage }
  }

  private start(event: JsonObject): void {
    const index = event["index"]
    const step = event["step"]
    if (typeof index !== "number" || !isRecord(step)) return
    this.open.set(index, {
      step: { ...step },
      text: "",
      hasText: false,
      argumentsText: "",
      hasArguments: false,
    })
  }

  private delta(event: JsonObject): string | null {
    const open = typeof event["index"] === "number" ? this.open.get(event["index"]) : undefined
    const delta = event["delta"]
    if (!open || !isRecord(delta)) return null
    switch (delta["type"]) {
      case "text":
        if (typeof delta["text"] !== "string") return null
        open.text += delta["text"]
        open.hasText = true
        return delta["text"]
      case "arguments_delta":
        if (typeof delta["arguments"] === "string") {
          open.argumentsText += delta["arguments"]
          open.hasArguments = true
        }
        return null
      case "thought_signature":
        if (typeof delta["signature"] === "string") open.step["signature"] = delta["signature"]
        return null
      default:
        // A summary of the reasoning or a type not known yet: not needed to go on.
        return null
    }
  }

  private stop(event: JsonObject): void {
    const index = event["index"]
    if (typeof index !== "number") return
    const open = this.open.get(index)
    if (!open) return
    this.open.delete(index)
    const { step } = open
    if (step["type"] === "model_output" && open.hasText) {
      step["content"] = [{ type: "text", text: open.text }]
    }
    if (step["type"] === "function_call" && open.hasArguments) {
      step["arguments"] = parseArguments(open.argumentsText)
    }
    this.done.push({ index, step })
  }
}

/** The arguments of a call, assembled from pieces; text that is not a JSON object gives {}. */
function parseArguments(text: string): JsonObject {
  try {
    const parsed: unknown = JSON.parse(text)
    if (isRecord(parsed)) return parsed
  } catch {
    // The call is passed on empty; the tool will say which argument is missing.
  }
  return {}
}
