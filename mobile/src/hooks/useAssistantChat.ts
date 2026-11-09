import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import * as assistantApi from "@/api/assistant"
import type { AssistantEvent } from "@/api/types"
import { copy } from "@/constants/copy"
import { useAssistantStore } from "@/store/assistantStore"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import { describeAssistantError, describeStreamError } from "@/utils/assistantErrors"
import { chatReducer, initialChatState, type ChatError } from "@/utils/chatState"

export type HistoryStatus = "loading" | "ready" | "error"

type History = { status: HistoryStatus; error: unknown }
type Loaded = { id: string; error: unknown; ok: boolean }

const READY: History = { status: "ready", error: null }
const LOADING: History = { status: "loading", error: null }

/**
 * The person's conversation with the assistant: which one is open, its messages, the answer being
 * written, and what the person can do (send, stop, approve or refuse a proposed change). The server
 * keeps the conversation; this only shows it. Nothing is open (`conversationId` null) until the
 * first message of a new chat is sent.
 */
export function useAssistantChat() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [state, dispatch] = useReducer(chatReducer, initialChatState)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [attempt, setAttempt] = useState(0)

  const turn = useRef<AbortController | null>(null)
  /** The turn is the answer to a proposed change, not a message. */
  const answering = useRef(false)
  /** Counts the times the person stopped or left: a turn that is still starting must give up. */
  const epoch = useRef(0)
  /** The turn that is running. A second tap before the screen has updated must not start another. */
  const busy = useRef<object | null>(null)
  const alive = useRef(true)
  const idRef = useRef<string | null>(null)
  /** A conversation this hook just made: it is empty on the server, so there is nothing to load. */
  const fresh = useRef<string | null>(null)

  useEffect(() => {
    idRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      turn.current?.abort() // leaving the screen stops the answer (the server then drops it)
    }
  }, [])

  /** Reads the conversation from the server. `quiet`: a failure leaves what is shown as it is. */
  const sync = useCallback(async (id: string, isCurrent: () => boolean, quiet: boolean) => {
    try {
      const lines = await assistantApi.listAssistantMessages(id)
      if (!isCurrent()) return
      dispatch({ type: quiet ? "synced" : "loaded", lines, now: Date.now() })
      setLoaded({ id, ok: true, error: null })
    } catch (error) {
      if (isCurrent() && !quiet) setLoaded({ id, ok: false, error })
    }
  }, [])
  const syncQuietly = useCallback(
    (id: string) => void sync(id, () => alive.current && idRef.current === id, true),
    [sync],
  )

  useEffect(() => {
    if (!conversationId) return
    if (fresh.current === conversationId) {
      fresh.current = null
      return
    }
    let current = true
    void sync(conversationId, () => current, false)
    return () => {
      current = false
    }
  }, [attempt, conversationId, sync])

  let history: History = READY
  if (conversationId !== null) {
    if (!loaded || loaded.id !== conversationId) history = LOADING
    else if (!loaded.ok) history = { status: "error", error: loaded.error }
  }

  /** Leaves the open conversation (and its answer, if one is being written) for another or a new one. */
  const switchTo = useCallback((id: string | null) => {
    epoch.current += 1 // a first message still waiting for its conversation is dropped
    busy.current = null
    turn.current?.abort()
    turn.current = null
    dispatch({ type: "loaded", lines: [], now: Date.now() })
    setLoaded(null) // a conversation that is opened again is read again
    setConversationId(id)
    idRef.current = id
  }, [])
  const open = useCallback(
    (id: string) => {
      if (id !== idRef.current) switchTo(id) // the one that is open stays as it is
    },
    [switchTo],
  )
  const startNew = useCallback(() => switchTo(null), [switchTo])

  /** Tries to open the conversation again after it failed. */
  const reload = useCallback(() => {
    setLoaded(null)
    setAttempt((count) => count + 1)
  }, [])

  /** Things the events ask the app to do: play music, learn that a change was made. */
  const handleEvent = useCallback((event: AssistantEvent) => {
    dispatch({ type: "event", event })
    if (event.type === "client_action" && event.tracks.length > 0) {
      usePlayerStore.getState().playFromList(event.tracks, 0, copy.assistant.playSource)
    }
    if (event.type === "tool_result" && event.action?.status === "CONFIRMED" && event.ok) {
      void useLibraryStore.getState().load() // the change touched the library: show it
    }
  }, [])

  const fail = useCallback((error: ChatError) => {
    if (error.kind === "unavailable") useAssistantStore.getState().markUnavailable()
    return error
  }, [])

  /** Runs one request for the stream, and turns however it ends into state. */
  const run = useCallback(
    async (
      start: (onEvent: (event: AssistantEvent) => void, signal: AbortSignal) => Promise<void>,
      onError: (error: ChatError) => void,
    ) => {
      const controller = new AbortController()
      turn.current = controller
      let streamError: ChatError | null = null
      let finished = false
      try {
        await start((event) => {
          if (event.type === "error") streamError = describeStreamError(event.code, event.message)
          else handleEvent(event)
          if (event.type === "done") finished = true
        }, controller.signal)
        // A stream that ends with neither "done" nor "error" was cut: the answer is not complete.
        if (!finished && !streamError) {
          streamError = { kind: "generic", message: copy.assistant.errors.generic }
        }
      } catch (error) {
        streamError = describeAssistantError(error)
      }
      if (turn.current === controller) turn.current = null
      if (!alive.current || controller.signal.aborted) return
      if (streamError) onError(fail(streamError))
      void useAssistantStore.getState().refreshUsage()
    },
    [fail, handleEvent],
  )

  const send = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || state.streaming || busy.current) return
      const key = {}
      busy.current = key
      try {
        answering.current = false
        const startedAt = epoch.current
        dispatch({ type: "sent", text: message })
        let id = idRef.current
        if (!id) {
          // A new chat only becomes a conversation on the server with its first message.
          const created = await useAssistantStore.getState().createConversation()
          if (!alive.current || epoch.current !== startedAt) {
            // Nobody is waiting for it any more (Stop, or the person went elsewhere).
            if (created && idRef.current !== created.id) {
              void useAssistantStore.getState().removeConversation(created.id)
            }
            return
          }
          if (!created) {
            dispatch({
              type: "failed",
              error: { kind: "generic", message: copy.assistant.history.createFailed },
            })
            return
          }
          id = created.id
          fresh.current = id
          idRef.current = id
          setLoaded({ id, ok: true, error: null })
          setConversationId(id)
        }
        const conversation = id
        await run(
          (onEvent, signal) =>
            assistantApi.sendAssistantMessage(conversation, message, onEvent, signal),
          (error) => dispatch({ type: "failed", error }),
        )
        if (alive.current) useAssistantStore.getState().touch(conversation)
      } finally {
        if (busy.current === key) busy.current = null
      }
    },
    [run, state.streaming],
  )

  const answer = useCallback(
    async (actionId: string, decision: "confirm" | "reject") => {
      const id = idRef.current
      if (!id || state.streaming || busy.current) return
      const key = {}
      busy.current = key
      try {
        answering.current = true
        dispatch({ type: "answering", actionId })
        await run(
          (onEvent, signal) =>
            assistantApi.answerAssistantAction(actionId, decision, onEvent, signal),
          (error) => {
            // The card goes back to waiting (or shows that its time is over).
            dispatch({
              type: "actionFailed",
              actionId,
              status: error.kind === "expired" ? "EXPIRED" : "PENDING",
              error,
            })
            syncQuietly(id) // what became of the proposal is for the server to say
          },
        )
        if (alive.current) useAssistantStore.getState().touch(id)
      } finally {
        if (busy.current === key) busy.current = null
      }
    },
    [run, state.streaming, syncQuietly],
  )

  /** The person pressed Stop: the answer is cancelled, and the server takes the question back. */
  const stop = useCallback((): string | null => {
    const asked = [...state.items].reverse().find((item) => item.kind === "user")
    epoch.current += 1 // also covers a stop pressed while the conversation is being made
    busy.current = null
    turn.current?.abort()
    turn.current = null
    dispatch({ type: "stopped" })
    if (answering.current) {
      // The change was made; the server says what became of the proposal.
      if (idRef.current) syncQuietly(idRef.current)
      return null
    }
    return asked?.kind === "user" ? asked.text : null
  }, [state.items, syncQuietly])

  const confirm = useCallback((actionId: string) => answer(actionId, "confirm"), [answer])
  const reject = useCallback((actionId: string) => answer(actionId, "reject"), [answer])
  const dismissError = useCallback(() => dispatch({ type: "dismissError" }), [])

  return {
    conversationId,
    items: state.items,
    streaming: state.streaming,
    error: state.error,
    history,
    open,
    startNew,
    send,
    confirm,
    reject,
    stop,
    reload,
    dismissError,
  }
}
