import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native"
import { ApiError } from "@/api/client"
import type { ApiLyrics, ApiLyricsTranslation } from "@/api/types"
import { LyricsSheet } from "@/components/media/lyrics/LyricsSheet"
import { i18n, t } from "@/i18n"
import { clearLyricsCache } from "@/utils/lyricsCache"

jest.mock("@/api/lyrics", () => ({ getLyrics: jest.fn(), getLyricsTranslation: jest.fn() }))

/* eslint-disable @typescript-eslint/no-require-imports */
const api = jest.mocked(require("@/api/lyrics") as typeof import("@/api/lyrics"))
/* eslint-enable @typescript-eslint/no-require-imports */

const LYRICS: ApiLyrics = {
  trackId: "t1",
  language: "ko",
  lines: ["가나", "", "다라"],
  timingsMs: null,
  source: "demo",
  updatedAt: "2026-11-10T00:00:00.000Z",
}
const TRANSLATION: ApiLyricsTranslation = {
  trackId: "t1",
  sourceLanguage: "ko",
  targetLanguage: "vi",
  lines: ["Một", "", "Hai"],
  provider: "deepl",
  cached: false,
  translatedAt: "2026-11-10T00:00:00.000Z",
}
const failure = (status: number, code?: string) =>
  new ApiError({ status, kind: "http", message: "x", details: code ? { code } : undefined })

const translateButton = () =>
  screen.getByRole("button", { name: t("lyrics.translate", { language: "Tiếng Việt" }) })
const open = async () => {
  await render(<LyricsSheet trackId="t1" onClose={jest.fn()} />)
  await screen.findByText("가나")
}

beforeEach(() => {
  jest.clearAllMocks()
  clearLyricsCache()
  api.getLyrics.mockResolvedValue(LYRICS)
  api.getLyricsTranslation.mockResolvedValue(TRANSLATION)
})

describe("the lyrics sheet: loading the original", () => {
  it("shows that it is loading", async () => {
    api.getLyrics.mockReturnValue(new Promise(() => undefined))
    await render(<LyricsSheet trackId="t1" onClose={jest.fn()} />)
    expect(screen.getByLabelText(t("lyrics.loading"))).toBeOnTheScreen()
  })

  it("says that the track has no lyrics, with nothing to translate", async () => {
    api.getLyrics.mockRejectedValue(failure(404, "LYRICS_NOT_FOUND"))
    await render(<LyricsSheet trackId="t1" onClose={jest.fn()} />)

    expect(await screen.findByText(t("lyrics.emptyTitle"))).toBeOnTheScreen()
    expect(screen.queryByRole("button", { name: /Dịch sang/ })).not.toBeOnTheScreen()
  })

  it("offers to try again when the lyrics could not be loaded", async () => {
    api.getLyrics.mockRejectedValueOnce(failure(500))
    const user = userEvent.setup()
    await render(<LyricsSheet trackId="t1" onClose={jest.fn()} />)

    await user.press(await screen.findByRole("button", { name: t("common.retry") }))

    expect(await screen.findByText("가나")).toBeOnTheScreen()
  })

  it("shows the original lines, where they come from and the button to translate", async () => {
    await open()

    expect(screen.getByText("다라")).toBeOnTheScreen()
    expect(
      screen.getByText(t("lyrics.sourceLabel", { source: t("lyrics.sourceDemo") })),
    ).toBeOnTheScreen()
    expect(translateButton()).toBeOnTheScreen()
    expect(api.getLyricsTranslation).not.toHaveBeenCalled()
  })
})

describe("the lyrics sheet: translating", () => {
  it("translates to the language of the app only when asked, and shows both side by side", async () => {
    const user = userEvent.setup()
    await open()

    await user.press(translateButton())

    expect(await screen.findByText("Một")).toBeOnTheScreen()
    expect(api.getLyricsTranslation).toHaveBeenCalledWith("t1", "vi")
    expect(screen.getByText(t("lyrics.autoTranslated"))).toBeOnTheScreen()
    // Each original line is followed by its translation.
    const order = screen.getAllByText(/가나|Một|다라|Hai/).map((node) => node.props.children)
    expect(order).toEqual(["가나", "Một", "다라", "Hai"])
  })

  it("keeps the original on screen while it translates", async () => {
    api.getLyricsTranslation.mockReturnValue(new Promise(() => undefined))
    const user = userEvent.setup()
    await open()

    await user.press(translateButton())

    expect(await screen.findByRole("button", { name: t("lyrics.translating") })).toBeDisabled()
    expect(screen.getByText("가나")).toBeOnTheScreen()
  })

  it("can show the translation alone, and the original again", async () => {
    const user = userEvent.setup()
    await open()
    await user.press(translateButton())
    await screen.findByText("Một")

    await user.press(screen.getByRole("button", { name: t("lyrics.viewTranslation") }))
    expect(screen.queryByText("가나")).not.toBeOnTheScreen()
    expect(screen.getByText("Hai")).toBeOnTheScreen()
    expect(screen.getByText(t("lyrics.autoTranslated"))).toBeOnTheScreen()

    await user.press(screen.getByRole("button", { name: t("lyrics.viewOriginal") }))
    expect(screen.getByText("가나")).toBeOnTheScreen()
    expect(screen.queryByText("Một")).not.toBeOnTheScreen()
  })

  it("does not ask the server again for a translation it already has", async () => {
    const user = userEvent.setup()
    await open()
    await user.press(translateButton())
    await screen.findByText("Một")
    await user.press(screen.getByRole("button", { name: t("lyrics.viewOriginal") }))

    await user.press(translateButton())

    expect(await screen.findByText("Một")).toBeOnTheScreen()
    expect(api.getLyricsTranslation).toHaveBeenCalledTimes(1)
  })

  it("translates to the language the app is in", async () => {
    await act(async () => {
      await i18n.changeLanguage("ja")
    })
    const user = userEvent.setup()
    await open()

    await user.press(
      screen.getByRole("button", { name: t("lyrics.translate", { language: "日本語" }) }),
    )

    await waitFor(() => expect(api.getLyricsTranslation).toHaveBeenCalledWith("t1", "ja"))
  })

  it("does not offer a translation of lyrics that are in the language of the app", async () => {
    api.getLyrics.mockResolvedValue({ ...LYRICS, language: "vi" })
    await render(<LyricsSheet trackId="t1" onClose={jest.fn()} />)

    await screen.findByText("가나")

    expect(screen.queryByRole("button", { name: /Dịch sang/ })).not.toBeOnTheScreen()
    expect(screen.getByText(t("lyrics.sameLanguage"))).toBeOnTheScreen()
  })

  it("shows only the original when the server found the lyrics already in that language", async () => {
    api.getLyricsTranslation.mockResolvedValue({
      ...TRANSLATION,
      provider: "original",
      lines: LYRICS.lines,
    })
    const user = userEvent.setup()
    await open()

    await user.press(translateButton())

    expect(await screen.findByText(t("lyrics.sameLanguage"))).toBeOnTheScreen()
    expect(screen.queryByText(t("lyrics.autoTranslated"))).not.toBeOnTheScreen()
  })
})

describe("the lyrics sheet: when the translation fails", () => {
  it("keeps the original and offers a retry that works", async () => {
    api.getLyricsTranslation.mockRejectedValueOnce(failure(429))
    const user = userEvent.setup()
    await open()

    await user.press(translateButton())
    expect(await screen.findByText(t("lyrics.translationFailed.rateLimited"))).toBeOnTheScreen()
    expect(screen.getByText("가나")).toBeOnTheScreen()

    await user.press(screen.getByRole("button", { name: t("common.retry") }))
    expect(await screen.findByText("Một")).toBeOnTheScreen()
  })

  it("says the allowance is used up, without a retry", async () => {
    api.getLyricsTranslation.mockRejectedValue(failure(503, "TRANSLATION_QUOTA_EXCEEDED"))
    const user = userEvent.setup()
    await open()

    await user.press(translateButton())

    expect(await screen.findByText(t("lyrics.translationFailed.quota"))).toBeOnTheScreen()
    expect(screen.queryByRole("button", { name: t("common.retry") })).not.toBeOnTheScreen()
    expect(screen.getByText("다라")).toBeOnTheScreen()
  })

  it("stops offering the button when the server cannot translate at all", async () => {
    api.getLyricsTranslation.mockRejectedValue(failure(503, "TRANSLATION_NOT_CONFIGURED"))
    const user = userEvent.setup()
    await open()
    await user.press(translateButton())
    await screen.findByText(t("lyrics.translationFailed.notConfigured"))

    await user.press(screen.getByRole("button", { name: t("lyrics.viewOriginal") }))

    expect(screen.getByText("가나")).toBeOnTheScreen()
    expect(screen.queryByRole("button", { name: /Dịch sang/ })).not.toBeOnTheScreen()
  })
})
