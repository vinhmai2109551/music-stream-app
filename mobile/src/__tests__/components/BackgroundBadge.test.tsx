import { describe, expect, it } from "@jest/globals"
import { render, screen } from "@testing-library/react-native"
import { BackgroundBadge } from "@/components/media/BackgroundBadge"
import { TrackRow } from "@/components/media/TrackRow"
import { makeTrack, r2Track, ytTrack } from "../helpers/playback"
import { t } from "@/i18n"

describe("BackgroundBadge", () => {
  it("marks a track that plays from an audio file", async () => {
    await render(<BackgroundBadge track={r2Track("a")} />)

    expect(screen.getByLabelText(t("player.backgroundBadge"))).toBeOnTheScreen()
  })

  it("shows nothing for a YouTube track, also when it has an audio file as a fallback", async () => {
    await render(<BackgroundBadge track={ytTrack("a")} />)
    expect(screen.queryByLabelText(t("player.backgroundBadge"))).not.toBeOnTheScreen()
  })

  it("shows nothing for a track that cannot be played at all", async () => {
    await render(<BackgroundBadge track={makeTrack("none", { audioUrl: null })} />)

    expect(screen.queryByLabelText(t("player.backgroundBadge"))).not.toBeOnTheScreen()
  })

  it("appears in the row of an audio-file track", async () => {
    const list = [r2Track("a")]
    await render(<TrackRow track={list[0]} index={0} list={list} />)

    expect(screen.getByLabelText(t("player.backgroundBadge"))).toBeOnTheScreen()
  })

  it("does not appear in the row of a YouTube track", async () => {
    const list = [ytTrack("b")]
    await render(<TrackRow track={list[0]} index={0} list={list} />)

    expect(screen.queryByLabelText(t("player.backgroundBadge"))).not.toBeOnTheScreen()
  })
})
