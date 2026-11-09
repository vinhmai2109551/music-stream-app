import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { act, renderHook, waitFor } from "@testing-library/react-native"
import { ApiError } from "@/api/client"
import type { AssistantConversation, AssistantEvent, AssistantMessageLine } from "@/api/types"
import { copy } from "@/constants/copy"
import { useAssistantChat } from "@/hooks/useAssistantChat"
import { useAssistantStore } from "@/store/assistantStore"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import { makeTrack } from "../helpers/playback"

jest.mock("@/api/assistant", () => ({
  getAssistantUsage: jest.fn(),
  listConversations: jest.fn(),
  createConversation: jest.fn(),
  deleteConversation: jest.fn(),
  listAssistantMessages: jest.fn(),
  sendAssistantMessage: jest.fn(),
  answerAssistantAction: jest.fn(),
}))

// A toast keeps a timer for a couple of seconds; nothing here looks at it.
jest.mock("@/store/toastStore", () => ({ showToast: jest.fn() }))

/* eslint-disable @typescript-eslint/no-require-imports */
const api = jest.mocked(require("@/api/assistant") as typeof import("@/api/assistant"))
/* eslint-enable @typescript-eslint/no-require-imports */

type Emit = (event: AssistantEvent) => void
const done = (extra: { truncated?: boolean; awaitingAction?: boolean } = {}): AssistantEvent => ({
  type: "done",
  messageId: "m",
  truncated: false,
  awaitingAction: false,
  ...extra,
})
const delta = (text: string): AssistantEvent => ({ type: "text_delta", text })

/** A stream that gives these events and ends. */
function streams(events: AssistantEvent[]) {
  return async (...args: unknown[]) => {
    const emit = args[args.length - 2] as Emit
    events.forEach(emit)
  }
}

/** A stream that stays open until the test lets it go (or the request is aborted). */
function openStream() {
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

const conversation = (id: string): AssistantConversation => ({
  id,
  title: "",
  createdAt: "2026-11-09T10:00:00Z",
  updatedAt: "2026-11-09T10:00:00Z",
})
const line = (extra: Partial<AssistantMessageLine>): AssistantMessageLine => ({
  id: "l",
  role: "assistant",
  text: "",
  createdAt: "2026-11-09T10:00:00Z",
  ...extra,
})
const http = (status: number, message = "x") => new ApiError({ status, kind: "http", message })

/** A promise the test settles when it wants to. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((done) => (resolve = done))
  return { promise, resolve }
}

const kinds = (items: { kind: string }[]) => items.map((item) => item.kind)

const loadLibrary = jest.fn(async () => undefined)

beforeEach(() => {
  jest.clearAllMocks()
  useAssistantStore.getState().reset()
  usePlayerStore.getState().reset()
  useLibraryStore.setState({ load: loadLibrary })
  api.getAssistantUsage.mockResolvedValue({ used: 1, limit: 30 })
  api.createConversation.mockResolvedValue(conversation("c1"))
  api.listAssistantMessages.mockResolvedValue([])
})

describe("a new chat", () => {
  it("shows the welcome state: nothing open, nothing to load", async () => {
    const { result } = await renderHook(() => useAssistantChat())

    expect(result.current.conversationId).toBeNull()
    expect(result.current.items).toEqual([])
    expect(result.current.history.status).toBe("ready")
    expect(api.listAssistantMessages).not.toHaveBeenCalled()
  })

  it("makes the conversation with the first message and shows the answer", async () => {
    api.sendAssistantMessage.mockImplementation(streams([delta("Xin "), delta("chào"), done()]))
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => {
      await result.current.send("  chào bạn  ")
    })

    expect(api.createConversation).toHaveBeenCalledTimes(1)
    expect(api.sendAssistantMessage).toHaveBeenCalledWith(
      "c1",
      "chào bạn",
      expect.any(Function),
      expect.any(AbortSignal),
    )
    expect(result.current.conversationId).toBe("c1")
    expect(kinds(result.current.items)).toEqual(["user", "assistant"])
    expect(result.current.items[1]).toMatchObject({ text: "Xin chào", streaming: false })
    expect(result.current.streaming).toBe(false)
    expect(result.current.history.status).toBe("ready")
    // The conversation was empty: reading it back would only wipe the answer.
    expect(api.listAssistantMessages).not.toHaveBeenCalled()
  })

  it("keeps the conversation next to the other messages and counts the day again", async () => {
    api.sendAssistantMessage.mockImplementation(streams([delta("a"), done()]))
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => {
      await result.current.send("a")
    })

    expect(useAssistantStore.getState().conversations.map((item) => item.id)).toEqual(["c1"])
    expect(api.getAssistantUsage).toHaveBeenCalled()
    expect(useAssistantStore.getState().usage).toEqual({ used: 1, limit: 30 })
  })

  it("does not send an empty message, nor a second one while the first is being answered", async () => {
    const open = openStream()
    api.sendAssistantMessage.mockImplementation(open.run)
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => {
      await result.current.send("   ")
    })
    expect(api.createConversation).not.toHaveBeenCalled()

    await act(async () => void result.current.send("một"))
    await waitFor(() => expect(result.current.streaming).toBe(true))
    await act(async () => {
      await result.current.send("hai")
    })
    expect(api.sendAssistantMessage).toHaveBeenCalledTimes(1)

    await act(async () => open.end())
  })

  it("marks the question as not sent when the conversation cannot be made", async () => {
    api.createConversation.mockRejectedValue(http(500))
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => {
      await result.current.send("chào")
    })

    expect(api.sendAssistantMessage).not.toHaveBeenCalled()
    expect(result.current.items).toMatchObject([{ kind: "user", failed: true }])
    expect(result.current.error).toEqual({
      kind: "generic",
      message: copy.assistant.history.createFailed,
    })
    expect(result.current.streaming).toBe(false)
  })

  it("does not start the answer when Stop is pressed while the conversation is being made", async () => {
    let made: (value: AssistantConversation) => void = () => undefined
    api.createConversation.mockReturnValue(new Promise((resolve) => (made = resolve)))
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => void result.current.send("chào"))
    let restored: string | null = null
    await act(async () => {
      restored = result.current.stop()
    })
    await act(async () => made(conversation("c1")))

    expect(restored).toBe("chào")
    expect(api.sendAssistantMessage).not.toHaveBeenCalled()
    expect(result.current.items).toEqual([])
    expect(result.current.streaming).toBe(false)
  })
})

describe("leaving before the first message has its conversation", () => {
  it("does not pull the person back, nor send the message, when they opened another", async () => {
    let made: (value: AssistantConversation) => void = () => undefined
    api.createConversation.mockReturnValue(new Promise((resolve) => (made = resolve)))
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => void result.current.send("chào"))
    await act(async () => result.current.open("other"))
    await act(async () => made(conversation("c1")))

    expect(api.sendAssistantMessage).not.toHaveBeenCalled()
    expect(result.current.conversationId).toBe("other")
  })
})

describe("opening a conversation", () => {
  it("loads what was said, cards included", async () => {
    const reading = deferred<AssistantMessageLine[]>()
    api.listAssistantMessages.mockReturnValue(reading.promise)
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => result.current.open("c9"))
    expect(result.current.history.status).toBe("loading")
    await act(async () =>
      reading.resolve([
        line({ id: "1", role: "user", text: "hỏi" }),
        line({ id: "2", role: "assistant", text: "đáp" }),
        line({ id: "3", role: "tool", tool: { callId: "c", name: "search_catalog", ok: true } }),
      ]),
    )

    expect(result.current.history.status).toBe("ready")
    expect(api.listAssistantMessages).toHaveBeenCalledWith("c9")
    expect(kinds(result.current.items)).toEqual(["user", "assistant", "tool"])
    expect(result.current.conversationId).toBe("c9")
  })

  it("says it could not open it, and tries again", async () => {
    api.listAssistantMessages.mockRejectedValueOnce(http(500))
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => result.current.open("c9"))
    await waitFor(() => expect(result.current.history.status).toBe("error"))
    expect(result.current.history.error).toBeInstanceOf(ApiError)

    const reading = deferred<AssistantMessageLine[]>()
    api.listAssistantMessages.mockReturnValue(reading.promise)
    await act(async () => result.current.reload())
    expect(result.current.history.status).toBe("loading")
    await act(async () => reading.resolve([line({ id: "1", role: "user", text: "hỏi" })]))

    expect(result.current.history.status).toBe("ready")
    expect(result.current.items).toHaveLength(1)
  })

  it("ignores the answer for a conversation the person already left", async () => {
    let slow: (lines: AssistantMessageLine[]) => void = () => undefined
    api.listAssistantMessages.mockImplementation(async (id) =>
      id === "slow"
        ? new Promise<AssistantMessageLine[]>((resolve) => (slow = resolve))
        : [line({ id: "1", role: "user", text: "nhanh" })],
    )
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => result.current.open("slow"))
    await act(async () => result.current.open("fast"))
    await waitFor(() => expect(result.current.history.status).toBe("ready"))
    await act(async () => slow([line({ id: "2", role: "user", text: "chậm" })]))

    expect(result.current.items).toMatchObject([{ text: "nhanh" }])
    expect(result.current.conversationId).toBe("fast")
  })

  it("reads a conversation again when it is opened again", async () => {
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => result.current.open("c9"))
    await waitFor(() => expect(result.current.history.status).toBe("ready"))
    await act(async () => result.current.startNew())
    const reading = deferred<AssistantMessageLine[]>()
    api.listAssistantMessages.mockReturnValue(reading.promise)
    await act(async () => result.current.open("c9"))

    expect(result.current.history.status).toBe("loading")
    await act(async () => reading.resolve([]))
    expect(result.current.history.status).toBe("ready")
    expect(api.listAssistantMessages).toHaveBeenCalledTimes(2)
  })

  it("starting a new chat clears the screen and stops an answer being written", async () => {
    const open = openStream()
    api.sendAssistantMessage.mockImplementation(open.run)
    const { result } = await renderHook(() => useAssistantChat())
    await act(async () => void result.current.send("hỏi"))
    await waitFor(() => expect(result.current.streaming).toBe(true))
    await waitFor(() => expect(open.signal()).toBeDefined())

    await act(async () => result.current.startNew())

    expect(open.signal()?.aborted).toBe(true)
    expect(result.current.conversationId).toBeNull()
    expect(result.current.items).toEqual([])
    expect(result.current.streaming).toBe(false)
  })
})

describe("what the answer makes the app do", () => {
  it("plays the tracks the assistant opens", async () => {
    const tracks = [makeTrack("a"), makeTrack("b")]
    api.sendAssistantMessage.mockImplementation(
      streams([
        { type: "client_action", action: "play_tracks", trackIds: ["a", "b"], tracks },
        delta("Đang phát"),
        done(),
      ]),
    )
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => {
      await result.current.send("mở nhạc")
    })

    const player = usePlayerStore.getState()
    expect(player.currentTrack?.id).toBe("a")
    expect(player.queue.map((track) => track.id)).toEqual(["a", "b"])
    expect(player.queueSource).toBe(copy.assistant.playSource)
  })

  it("plays nothing when no track was found", async () => {
    api.sendAssistantMessage.mockImplementation(
      streams([{ type: "client_action", action: "play_tracks", trackIds: [], tracks: [] }, done()]),
    )
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => {
      await result.current.send("mở nhạc")
    })

    expect(usePlayerStore.getState().currentTrack).toBeNull()
  })
})

describe("a change that needs a yes", () => {
  const proposal = streams([
    { type: "tool_call", callId: "w1", name: "create_playlist" },
    {
      type: "action_required",
      actionId: "a1",
      callId: "w1",
      tool: "create_playlist",
      summary: "Tạo playlist “Chạy bộ”",
      expiresAt: "2099-01-01T00:00:00Z",
    },
    done({ awaitingAction: true }),
  ])

  async function withProposal() {
    api.sendAssistantMessage.mockImplementation(proposal)
    const hook = await renderHook(() => useAssistantChat())
    await act(async () => {
      await hook.result.current.send("tạo playlist")
    })
    return hook
  }

  it("waits for the person: the library is not touched", async () => {
    const { result } = await withProposal()

    expect(result.current.items[1]).toMatchObject({ kind: "action", status: "PENDING" })
    expect(api.answerAssistantAction).not.toHaveBeenCalled()
    expect(loadLibrary).not.toHaveBeenCalled()
  })

  it("confirming carries it out, shows the result and reloads the library", async () => {
    api.answerAssistantAction.mockImplementation(
      streams([
        {
          type: "tool_result",
          callId: "w1",
          name: "create_playlist",
          ok: true,
          action: { id: "a1", status: "CONFIRMED" },
        },
        delta("Xong rồi."),
        done(),
      ]),
    )
    const { result } = await withProposal()

    await act(async () => {
      await result.current.confirm("a1")
    })

    expect(api.answerAssistantAction).toHaveBeenCalledWith(
      "a1",
      "confirm",
      expect.any(Function),
      expect.any(AbortSignal),
    )
    expect(result.current.items[1]).toMatchObject({ kind: "action", status: "CONFIRMED" })
    expect(result.current.items[2]).toMatchObject({ kind: "assistant", text: "Xong rồi." })
    expect(loadLibrary).toHaveBeenCalledTimes(1)
  })

  it("refusing changes nothing in the library", async () => {
    api.answerAssistantAction.mockImplementation(
      streams([
        {
          type: "tool_result",
          callId: "w1",
          name: "create_playlist",
          ok: false,
          action: { id: "a1", status: "REJECTED" },
        },
        done(),
      ]),
    )
    const { result } = await withProposal()

    await act(async () => {
      await result.current.reject("a1")
    })

    expect(api.answerAssistantAction).toHaveBeenCalledWith(
      "a1",
      "reject",
      expect.any(Function),
      expect.any(AbortSignal),
    )
    expect(result.current.items[1]).toMatchObject({ status: "REJECTED" })
    expect(loadLibrary).not.toHaveBeenCalled()
  })

  it("a change that could not be made does not reload the library", async () => {
    api.answerAssistantAction.mockImplementation(
      streams([
        {
          type: "tool_result",
          callId: "w1",
          name: "create_playlist",
          ok: false,
          action: { id: "a1", status: "CONFIRMED" },
        },
        done(),
      ]),
    )
    const { result } = await withProposal()

    await act(async () => {
      await result.current.confirm("a1")
    })

    expect(result.current.items[1]).toMatchObject({ status: "FAILED" })
    expect(loadLibrary).not.toHaveBeenCalled()
  })

  it("an answer that is too late (410) is shown as expired, and the server is asked what is true", async () => {
    api.answerAssistantAction.mockRejectedValue(http(410))
    const { result } = await withProposal()
    api.listAssistantMessages.mockResolvedValue([
      line({ id: "1", role: "user", text: "tạo playlist" }),
      line({
        id: "2",
        role: "tool",
        tool: {
          callId: "w1",
          name: "create_playlist",
          ok: null,
          action: {
            id: "a1",
            status: "EXPIRED",
            summary: "Tạo playlist “Chạy bộ”",
            expiresAt: "2026-01-01T00:00:00Z",
          },
        },
      }),
    ])

    await act(async () => {
      await result.current.confirm("a1")
    })

    expect(result.current.error?.kind).toBe("expired")
    await waitFor(() => expect(result.current.items[1]).toMatchObject({ status: "EXPIRED" }))
    expect(loadLibrary).not.toHaveBeenCalled()
  })

  it("cannot be decided while another answer is being written", async () => {
    const { result } = await withProposal()
    const open = openStream()
    api.sendAssistantMessage.mockImplementation(open.run)
    await act(async () => void result.current.send("thêm nữa"))
    await waitFor(() => expect(result.current.streaming).toBe(true))

    await act(async () => {
      await result.current.confirm("a1")
    })

    expect(api.answerAssistantAction).not.toHaveBeenCalled()
    await act(async () => open.end())
  })
})

describe("when it goes wrong", () => {
  it("offline: the question stays, marked as not sent, with a message that says why", async () => {
    api.sendAssistantMessage.mockRejectedValue(
      new ApiError({ status: 0, kind: "network", message: "x" }),
    )
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => {
      await result.current.send("chào")
    })

    expect(result.current.items).toMatchObject([{ kind: "user", failed: true, text: "chào" }])
    expect(result.current.error).toEqual({
      kind: "offline",
      message: copy.assistant.errors.offline,
    })
    expect(result.current.streaming).toBe(false)
  })

  it("sending it again works, and does not leave the failed one behind", async () => {
    api.sendAssistantMessage.mockRejectedValueOnce(
      new ApiError({ status: 0, kind: "network", message: "x" }),
    )
    const { result } = await renderHook(() => useAssistantChat())
    await act(async () => {
      await result.current.send("chào")
    })

    api.sendAssistantMessage.mockImplementation(streams([delta("Xin chào"), done()]))
    await act(async () => {
      await result.current.send("chào")
    })

    expect(kinds(result.current.items)).toEqual(["user", "assistant"])
    expect(result.current.items[0]).toMatchObject({ failed: false })
    expect(result.current.error).toBeNull()
    expect(api.createConversation).toHaveBeenCalledTimes(1) // the conversation already existed
  })

  it("the day is used up (429): says so with the words of the server", async () => {
    api.sendAssistantMessage.mockRejectedValue(http(429, "Bạn đã dùng hết 30 tin nhắn hôm nay"))
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => {
      await result.current.send("chào")
    })

    expect(result.current.error).toEqual({
      kind: "quota",
      message: "Bạn đã dùng hết 30 tin nhắn hôm nay",
    })
  })

  it("503: the feature is switched off for the whole app", async () => {
    api.sendAssistantMessage.mockRejectedValue(http(503))
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => {
      await result.current.send("chào")
    })

    expect(useAssistantStore.getState().availability).toBe("unavailable")
    expect(result.current.error?.kind).toBe("unavailable")
  })

  it("an error event in the stream takes back the partial answer", async () => {
    api.sendAssistantMessage.mockImplementation(
      streams([
        delta("Một nửa"),
        { type: "error", code: "assistant_busy", message: "Trợ lý đang quá tải" },
      ]),
    )
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => {
      await result.current.send("chào")
    })

    expect(kinds(result.current.items)).toEqual(["user"])
    expect(result.current.items[0]).toMatchObject({ failed: true })
    expect(result.current.error).toEqual({ kind: "busy", message: "Trợ lý đang quá tải" })
  })

  it("a stream that ends without 'done' is a cut answer, not a finished one", async () => {
    api.sendAssistantMessage.mockImplementation(streams([delta("Dở dang")]))
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => {
      await result.current.send("chào")
    })

    expect(kinds(result.current.items)).toEqual(["user"])
    expect(result.current.error).toEqual({
      kind: "generic",
      message: copy.assistant.errors.generic,
    })
  })

  it("dismissing the message clears it", async () => {
    api.sendAssistantMessage.mockRejectedValue(http(500))
    const { result } = await renderHook(() => useAssistantChat())
    await act(async () => {
      await result.current.send("chào")
    })

    await act(async () => result.current.dismissError())

    expect(result.current.error).toBeNull()
  })

  it("an answer cut short by the server is marked", async () => {
    api.sendAssistantMessage.mockImplementation(
      streams([delta("Dài quá"), done({ truncated: true })]),
    )
    const { result } = await renderHook(() => useAssistantChat())

    await act(async () => {
      await result.current.send("kể dài")
    })

    expect(result.current.items[1]).toMatchObject({ truncated: true })
    expect(result.current.error).toBeNull()
  })
})

describe("stopping", () => {
  it("cancels the request, takes the turn back and gives the question to put in the box again", async () => {
    const open = openStream()
    api.sendAssistantMessage.mockImplementation(open.run)
    const { result } = await renderHook(() => useAssistantChat())
    await act(async () => void result.current.send("kể chuyện"))
    await waitFor(() => expect(open.signal()).toBeDefined())
    await act(async () => open.emit(delta("Ngày xửa")))

    let restored: string | null = null
    await act(async () => {
      restored = result.current.stop()
    })

    expect(restored).toBe("kể chuyện")
    expect(open.signal()?.aborted).toBe(true)
    expect(result.current.items).toEqual([])
    expect(result.current.streaming).toBe(false)
    expect(result.current.error).toBeNull() // stopping is not a failure
  })

  it("stopping the answer to a proposal gives no text back and asks the server what happened", async () => {
    api.sendAssistantMessage.mockImplementation(
      streams([
        {
          type: "action_required",
          actionId: "a1",
          callId: "w1",
          tool: "create_playlist",
          summary: "Tạo",
          expiresAt: "2099-01-01T00:00:00Z",
        },
        done({ awaitingAction: true }),
      ]),
    )
    const { result } = await renderHook(() => useAssistantChat())
    await act(async () => {
      await result.current.send("tạo")
    })
    const open = openStream()
    api.answerAssistantAction.mockImplementation(open.run)
    await act(async () => void result.current.confirm("a1"))
    await waitFor(() => expect(open.signal()).toBeDefined())
    api.listAssistantMessages.mockClear()

    let restored: string | null = "x"
    await act(async () => {
      restored = result.current.stop()
    })

    expect(restored).toBeNull()
    await waitFor(() => expect(api.listAssistantMessages).toHaveBeenCalledWith("c1"))
  })

  it("leaving the screen cancels the answer", async () => {
    const open = openStream()
    api.sendAssistantMessage.mockImplementation(open.run)
    const { result, unmount } = await renderHook(() => useAssistantChat())
    await act(async () => void result.current.send("chào"))
    await waitFor(() => expect(open.signal()).toBeDefined())

    await unmount()

    expect(open.signal()?.aborted).toBe(true)
  })
})
