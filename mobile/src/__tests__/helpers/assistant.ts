import type { AssistantConversation, AssistantEvent, AssistantMessageLine } from "@/api/types"
import { ApiError } from "@/api/client"

type Emit = (event: AssistantEvent) => void

export const delta = (text: string): AssistantEvent => ({ type: "text_delta", text })

export const done = (
  extra: { truncated?: boolean; awaitingAction?: boolean } = {},
): AssistantEvent => ({
  type: "done",
  messageId: "m",
  truncated: false,
  awaitingAction: false,
  ...extra,
})

/** A stream that gives these events and ends. The callbacks come last: (…, onEvent, signal). */
export function streams(events: AssistantEvent[]) {
  return async (...args: unknown[]) => {
    const emit = args[args.length - 2] as Emit
    events.forEach(emit)
  }
}

/** A stream that stays open until the test lets it go (or the request is aborted). */
export function openStream() {
  let emit: Emit = () => undefined
  let finish: () => void = () => undefined
  let signal: AbortSignal | undefined
  const run = (...args: unknown[]) =>
    new Promise<void>((resolve) => {
      emit = args[args.length - 2] as Emit
      signal = args[args.length - 1] as AbortSignal
      finish = resolve
      signal.addEventListener("abort", () => resolve())
    })
  return {
    run,
    emit: (event: AssistantEvent) => emit(event),
    end: () => finish(),
    signal: () => signal,
  }
}

export const conversation = (id: string, title = ""): AssistantConversation => ({
  id,
  title,
  createdAt: "2026-11-09T10:00:00Z",
  updatedAt: "2026-11-09T10:00:00Z",
})

export const line = (extra: Partial<AssistantMessageLine>): AssistantMessageLine => ({
  id: "l",
  role: "assistant",
  text: "",
  createdAt: "2026-11-09T10:00:00Z",
  ...extra,
})

export const http = (status: number, message = "x") =>
  new ApiError({ status, kind: "http", message })

export const offline = () => new ApiError({ status: 0, kind: "network", message: "x" })

/** A promise the test settles when it wants to. */
export function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  let reject: (error: unknown) => void = () => undefined
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}
