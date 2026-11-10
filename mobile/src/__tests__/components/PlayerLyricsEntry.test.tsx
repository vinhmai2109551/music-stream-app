import { describe, expect, it, jest } from "@jest/globals"
import { render, screen, userEvent } from "@testing-library/react-native"
import { PlayerActions } from "@/components/media/PlayerActions"
import { t } from "@/i18n"

const actions = () => ({
  onToggleLike: jest.fn(),
  onComments: jest.fn(),
  onLyrics: jest.fn(),
  onShare: jest.fn(),
})

describe("the lyrics button of the player", () => {
  it("sits between comments and share, and opens the lyrics", async () => {
    const handlers = actions()
    const user = userEvent.setup()
    await render(<PlayerActions liked={false} likeCount={10} commentCount={2} {...handlers} />)

    const names = screen.getAllByRole("button").map((button) => button.props.accessibilityLabel)
    expect(names.slice(-3)).toEqual([
      t("player.commentCount", { count: 2 }),
      t("lyrics.open"),
      t("common.share"),
    ])

    await user.press(screen.getByRole("button", { name: t("lyrics.open") }))

    expect(handlers.onLyrics).toHaveBeenCalledTimes(1)
    expect(handlers.onComments).not.toHaveBeenCalled()
    expect(handlers.onShare).not.toHaveBeenCalled()
  })
})
