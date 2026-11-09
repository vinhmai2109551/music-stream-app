import { describe, expect, it, jest } from "@jest/globals"
import { render, screen, userEvent } from "@testing-library/react-native"
import { Composer } from "@/components/media/assistant/Composer"
import { copy } from "@/constants/copy"

const text = copy.assistant

type Props = Partial<React.ComponentProps<typeof Composer>>

async function setup(props: Props = {}) {
  const onSend = jest.fn()
  const onStop = jest.fn<() => string | null>().mockReturnValue(null)
  const user = userEvent.setup()
  await render(
    <Composer streaming={false} disabled={false} onSend={onSend} onStop={onStop} {...props} />,
  )
  const input = screen.getByLabelText(text.composerLabel)
  return { onSend, onStop, user, input }
}

describe("writing and sending", () => {
  it("has a field with a hint and a send button that waits for words", async () => {
    await setup()

    expect(screen.getByPlaceholderText(text.composerPlaceholder)).toBeOnTheScreen()
    expect(screen.getByRole("button", { name: text.send })).toBeDisabled()
  })

  it("a message of only spaces is not a message", async () => {
    const { user, input, onSend } = await setup()

    await user.type(input, "    ")

    expect(screen.getByRole("button", { name: text.send })).toBeDisabled()
    expect(onSend).not.toHaveBeenCalled()
  })

  it("sends what was written, without the spaces around it, and empties the field", async () => {
    const { user, input, onSend } = await setup()

    await user.type(input, "  Gợi ý nhạc buồn  ")
    await user.press(screen.getByRole("button", { name: text.send }))

    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend).toHaveBeenCalledWith("Gợi ý nhạc buồn")
    expect(input.props.value).toBe("")
    expect(screen.getByRole("button", { name: text.send })).toBeDisabled()
  })

  it("stops the person from writing more than the server takes", async () => {
    const { input } = await setup()
    expect(input.props.maxLength).toBe(2000)
  })
})

describe("while the assistant is answering", () => {
  it("the button stops the answer instead of sending", async () => {
    const { onStop, user } = await setup({ streaming: true })

    expect(screen.queryByRole("button", { name: text.send })).not.toBeOnTheScreen()
    await user.press(screen.getByRole("button", { name: text.stop }))

    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it("puts the question back in the empty box so it can be changed", async () => {
    const { onStop, user, input } = await setup({ streaming: true })
    onStop.mockReturnValue("kể chuyện cổ tích")

    await user.press(screen.getByRole("button", { name: text.stop }))

    expect(input.props.value).toBe("kể chuyện cổ tích")
  })

  it("does not replace what the person has started writing meanwhile", async () => {
    const { onStop, user, input } = await setup({ streaming: true })
    onStop.mockReturnValue("câu cũ")

    await user.type(input, "câu mới")
    await user.press(screen.getByRole("button", { name: text.stop }))

    expect(input.props.value).toBe("câu mới")
  })

  it("puts nothing back when the answer was to a proposal", async () => {
    const { user, input } = await setup({ streaming: true })

    await user.press(screen.getByRole("button", { name: text.stop }))

    expect(input.props.value).toBe("")
  })

  it("lets the next message be written, but not sent, until it ends", async () => {
    const { user, input, onSend } = await setup({ streaming: true })

    await user.type(input, "tiếp theo")

    expect(input.props.value).toBe("tiếp theo")
    expect(onSend).not.toHaveBeenCalled()
  })
})

describe("when nothing can be sent", () => {
  it("the field is locked and the button is off", async () => {
    const { input, onSend } = await setup({ disabled: true })

    expect(input.props.editable).toBe(false)
    expect(screen.getByRole("button", { name: text.send })).toBeDisabled()
    expect(onSend).not.toHaveBeenCalled()
  })
})
