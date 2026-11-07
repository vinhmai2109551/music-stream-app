import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { act, renderHook, waitFor } from "@testing-library/react-native"
import { ApiError } from "@/api/client"
import type { ApiComment, ApiCommentPage, ApiCommentThread } from "@/api/types"
import { useComments } from "@/hooks/useComments"
import { useToastStore } from "@/store/toastStore"

jest.mock("@/api/comments", () => ({
  listComments: jest.fn(),
  listReplies: jest.fn(),
  createComment: jest.fn(),
  deleteComment: jest.fn(),
  likeComment: jest.fn(),
  unlikeComment: jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const api = jest.mocked(require("@/api/comments") as typeof import("@/api/comments"))
/* eslint-enable @typescript-eslint/no-require-imports */

const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString()
const comment = (id: string, minute: number, parentId: string | null = null): ApiComment => ({
  id,
  user: { id: "u1", name: "Me", avatarUrl: null },
  text: `text ${id}`,
  createdAt: at(minute),
  likesCount: 0,
  liked: false,
  parentId,
  trackId: "t",
  postId: null,
})
const thread = (id: string, replies: ApiComment[], repliesCount = replies.length) =>
  ({ ...comment(id, 10), replies, repliesCount }) as ApiCommentThread

/** c1 has 5 replies, 3 of them on the page; c2 has none. 2 comments + 5 replies = 7. */
const page = (): ApiCommentPage => ({
  items: [
    thread("c1", [comment("r1", 1, "c1"), comment("r2", 2, "c1"), comment("r3", 3, "c1")], 5),
    thread("c2", []),
  ],
  nextCursor: null,
  total: 7,
})

const refused = new ApiError({ status: 403, kind: "http", message: "Not allowed" })
const gone = new ApiError({ status: 404, kind: "http", message: "Comment not found" })
const toast = () => useToastStore.getState().message

function deferred() {
  let resolve: () => void = () => {}
  let reject: (error: unknown) => void = () => {}
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function load() {
  const hook = await renderHook(() => useComments({ trackId: "t" }))
  await waitFor(() => expect(hook.result.current.state.status).toBe("ready"))
  const ready = () => {
    const { state } = hook.result.current
    if (state.status !== "ready") throw new Error("not ready")
    return state
  }
  const ids = () => ready().threads.map((item) => item.comment.id)
  const replyIds = (threadId: string) =>
    ready()
      .threads.find((item) => item.comment.id === threadId)
      ?.replies.map((reply) => reply.id)
  const hidden = (threadId: string) =>
    ready().threads.find((item) => item.comment.id === threadId)?.hiddenReplies
  const remove = (target: ApiComment) =>
    act(async () => {
      await hook.result.current.remove(target)
    })
  return { hook, ready, ids, replyIds, hidden, remove }
}

beforeEach(() => {
  jest.clearAllMocks()
  api.listComments.mockImplementation(async () => page())
  api.deleteComment.mockResolvedValue(undefined)
  useToastStore.setState({ message: null })
})

describe("useComments.remove", () => {
  it("a top-level comment disappears with all its replies, also the ones not loaded", async () => {
    const t = await load()
    expect(t.ready().total).toBe(7)

    await t.remove(comment("c1", 10))

    expect(api.deleteComment).toHaveBeenCalledWith("c1")
    expect(t.ids()).toEqual(["c2"])
    expect(t.ready().total).toBe(1) // 1 comment + 5 replies went
    expect(toast()).toBeNull()
  })

  it("a reply disappears from its thread and the rest of the thread stays correct", async () => {
    const t = await load()
    expect(t.hidden("c1")).toBe(2)

    await t.remove(comment("r2", 2, "c1"))

    expect(api.deleteComment).toHaveBeenCalledWith("r2")
    expect(t.replyIds("c1")).toEqual(["r1", "r3"])
    expect(t.hidden("c1")).toBe(2) // 4 replies left, 2 on screen: the 2 older ones are still hidden
    expect(t.ready().total).toBe(6)
  })

  it("shows the change before the server has answered", async () => {
    const request = deferred()
    api.deleteComment.mockReturnValue(request.promise)
    const t = await load()

    let done: Promise<void> = Promise.resolve()
    await act(async () => {
      done = t.hook.result.current.remove(comment("c2", 10))
    })

    expect(t.ids()).toEqual(["c1"]) // the request is still open
    await act(async () => {
      request.resolve()
      await done
    })
    expect(t.ids()).toEqual(["c1"])
  })

  it("brings the comment back, with the count, and says why when the server refuses", async () => {
    api.deleteComment.mockRejectedValue(refused)
    const t = await load()

    await t.remove(comment("c1", 10))

    expect(t.ids()).toEqual(["c1", "c2"])
    expect(t.replyIds("c1")).toEqual(["r1", "r2", "r3"])
    expect(t.ready().total).toBe(7)
    expect(toast()).toBe("Not allowed")
  })

  it("a reply that could not be deleted comes back too", async () => {
    api.deleteComment.mockRejectedValue(refused)
    const t = await load()

    await t.remove(comment("r1", 1, "c1"))

    expect(t.replyIds("c1")).toEqual(["r1", "r2", "r3"])
    expect(t.hidden("c1")).toBe(2)
    expect(t.ready().total).toBe(7)
  })

  it("a comment that is already gone on the server stays gone, without a message", async () => {
    api.deleteComment.mockRejectedValue(gone)
    const t = await load()

    await t.remove(comment("c2", 10))

    expect(t.ids()).toEqual(["c1"])
    expect(toast()).toBeNull()
  })

  it("a double tap sends one request", async () => {
    const request = deferred()
    api.deleteComment.mockReturnValue(request.promise)
    const t = await load()

    await act(async () => {
      void t.hook.result.current.remove(comment("c2", 10))
      void t.hook.result.current.remove(comment("c2", 10))
    })
    await act(async () => {
      request.resolve()
    })

    expect(api.deleteComment).toHaveBeenCalledTimes(1)
  })

  it("a comment written here and deleted here leaves the count where it was", async () => {
    const created = { ...comment("new", 20), parentId: null }
    api.createComment.mockResolvedValue(created)
    const t = await load()
    await act(async () => {
      await t.hook.result.current.post("hello")
    })
    expect(t.ready().total).toBe(8)
    expect(t.ids()[0]).toBe("new")

    await t.remove(created)

    expect(t.ids()).toEqual(["c1", "c2"])
    expect(t.ready().total).toBe(7)
  })

  it("a reply written here and deleted here leaves its thread as it was", async () => {
    const created = comment("mine", 20, "c2")
    api.createComment.mockResolvedValue(created)
    const t = await load()
    await act(async () => {
      await t.hook.result.current.post("hello", "c2")
    })
    expect(t.replyIds("c2")).toEqual(["mine"])
    expect(t.ready().total).toBe(8)

    await t.remove(created)

    expect(t.replyIds("c2")).toEqual([])
    expect(t.hidden("c2")).toBe(0)
    expect(t.ready().total).toBe(7)
  })

  it("reloading starts from what the server has, without counting the deletion twice", async () => {
    const t = await load()
    await t.remove(comment("c2", 10))
    api.listComments.mockImplementation(async () => ({
      items: [page().items[0]],
      nextCursor: null,
      total: 6,
    }))

    await act(async () => {
      await t.hook.result.current.reload()
    })
    await waitFor(() => expect(t.ready().total).toBe(6))

    expect(t.ids()).toEqual(["c1"])
  })
})
