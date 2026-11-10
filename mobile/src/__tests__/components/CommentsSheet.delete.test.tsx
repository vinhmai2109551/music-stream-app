import { t } from "@/i18n"
import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { render, screen, userEvent, waitFor } from "@testing-library/react-native"
import { ApiError } from "@/api/client"
import type { ApiComment, ApiCommentPage, ApiCommentThread } from "@/api/types"
import { CommentsSheet } from "@/components/media/CommentsSheet"
import { useAuthStore } from "@/store/authStore"
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
const ME = { id: "u1", name: "Me", avatarUrl: null }
const OTHER = { id: "u2", name: "Someone", avatarUrl: null }
const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString()
const comment = (
  id: string,
  user: ApiComment["user"],
  parentId: string | null = null,
): ApiComment => ({
  id,
  user,
  text: `says ${id}`,
  createdAt: at(1),
  likesCount: 0,
  liked: false,
  parentId,
  trackId: "t",
  postId: null,
})
const thread = (root: ApiComment, replies: ApiComment[] = []) =>
  ({ ...root, replies, repliesCount: replies.length }) as ApiCommentThread

/** Mine with one reply of mine and one of someone else's, then a comment of someone else's. */
const page = (): ApiCommentPage => ({
  items: [
    thread(comment("mine", ME), [comment("r-other", OTHER, "mine"), comment("r-mine", ME, "mine")]),
    thread(comment("theirs", OTHER)),
  ],
  nextCursor: null,
  total: 4,
})

const refused = new ApiError({ status: 403, kind: "http", message: "Not allowed" })
const toast = () => useToastStore.getState().message
const deleteButtons = () => screen.getAllByRole("button", { name: t("comments.deleteComment") })

beforeEach(async () => {
  jest.clearAllMocks()
  api.listComments.mockImplementation(async () => page())
  api.deleteComment.mockResolvedValue(undefined)
  useAuthStore.setState({ user: { ...ME, email: "me@x.co", role: "USER", isPremium: false } })
  useToastStore.setState({ message: null })
})

const open = async (onCountChange = jest.fn<(count: number) => void>()) => {
  const user = userEvent.setup()
  await render(
    <CommentsSheet target={{ trackId: "t" }} onClose={jest.fn()} onCountChange={onCountChange} />,
  )
  await screen.findByText(/says mine/)
  return { user, onCountChange }
}

describe("deleting your own comments", () => {
  it("offers Delete on your comments and replies only", async () => {
    await open()

    expect(deleteButtons()).toHaveLength(2) // "mine" and "r-mine"
  })

  it("asks before deleting, and cancelling keeps everything", async () => {
    const { user } = await open()

    await user.press(deleteButtons()[1])
    expect(screen.getByText(t("comments.deleteConfirmTitle"))).toBeOnTheScreen()
    await user.press(screen.getByRole("button", { name: t("comments.cancel") }))

    await waitFor(() => expect(screen.queryByText(t("comments.deleteConfirmTitle"))).toBeNull())
    expect(api.deleteComment).not.toHaveBeenCalled()
    expect(screen.getByText(/says r-mine/)).toBeOnTheScreen()
  })

  it("a reply of yours: plain warning, then the reply is gone and the count drops by one", async () => {
    const { user, onCountChange } = await open()
    await waitFor(() => expect(onCountChange).toHaveBeenLastCalledWith(4))

    await user.press(deleteButtons()[1])
    expect(screen.getByText(t("comments.deleteConfirmMessage"))).toBeOnTheScreen()
    await user.press(screen.getByRole("button", { name: t("comments.confirmDelete") }))

    await waitFor(() => expect(screen.queryByText(/says r-mine/)).toBeNull())
    expect(api.deleteComment).toHaveBeenCalledWith("r-mine")
    expect(screen.getByText(/says r-other/)).toBeOnTheScreen()
    expect(onCountChange).toHaveBeenLastCalledWith(3)
  })

  it("a comment of yours with replies: warns that the replies go too, and they all disappear", async () => {
    const { user, onCountChange } = await open()

    await user.press(deleteButtons()[0])
    expect(screen.getByText(t("comments.deleteThreadConfirmMessage"))).toBeOnTheScreen()
    await user.press(screen.getByRole("button", { name: t("comments.confirmDelete") }))

    await waitFor(() => expect(screen.queryByText(/says mine/)).toBeNull())
    expect(api.deleteComment).toHaveBeenCalledWith("mine")
    expect(screen.queryByText(/says r-other/)).toBeNull()
    expect(screen.getByText(/says theirs/)).toBeOnTheScreen()
    expect(onCountChange).toHaveBeenLastCalledWith(1)
  })

  it("puts the comment back and says why when the server refuses", async () => {
    api.deleteComment.mockRejectedValue(refused)
    const { user, onCountChange } = await open()

    await user.press(deleteButtons()[0])
    await user.press(screen.getByRole("button", { name: t("comments.confirmDelete") }))

    await waitFor(() => expect(toast()).toBe("Not allowed"))
    expect(await screen.findByText(/says mine/)).toBeOnTheScreen()
    expect(screen.getByText(/says r-mine/)).toBeOnTheScreen()
    expect(onCountChange).toHaveBeenLastCalledWith(4)
  })

  it("stops answering a comment that has just been deleted", async () => {
    const { user } = await open()
    await user.press(screen.getAllByRole("button", { name: `${t("comments.reply")} Me` })[0])
    expect(screen.getByText(`${t("comments.replyingTo")} Me`)).toBeOnTheScreen()

    await user.press(deleteButtons()[0])
    await user.press(screen.getByRole("button", { name: t("comments.confirmDelete") }))

    await waitFor(() => expect(screen.queryByText(`${t("comments.replyingTo")} Me`)).toBeNull())
  })

  it("shows no Delete to someone who is not signed in as the author", async () => {
    useAuthStore.setState({ user: { ...OTHER, email: "o@x.co", role: "USER", isPremium: false } })
    await open()

    // Now "theirs" and "r-other" are the user's own.
    expect(deleteButtons()).toHaveLength(2)
    expect(screen.getByText(/says mine/)).toBeOnTheScreen()
  })
})
