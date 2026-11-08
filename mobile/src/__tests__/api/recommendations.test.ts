import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import {
  getBecauseYouListened,
  getForYou,
  getSimilarTracks,
  searchTracksByMeaning,
} from "@/api/recommendations"

jest.mock("@/api/client", () => ({ api: { get: jest.fn(async () => ({})) } }))

/* eslint-disable @typescript-eslint/no-require-imports */
const { api } = jest.mocked(require("@/api/client") as typeof import("@/api/client"))
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => {
  jest.clearAllMocks()
})

describe("the recommendation calls", () => {
  it("ask for you with the limit, and the region only when there is one", async () => {
    await getForYou(null, 10)
    await getForYou("KOREA", 5)

    expect(api.get).toHaveBeenNthCalledWith(1, "/recommendations/for-you?limit=10")
    expect(api.get).toHaveBeenNthCalledWith(2, "/recommendations/for-you?region=KOREA&limit=5")
  })

  it("ask because-you-listened the same way", async () => {
    await getBecauseYouListened("VIETNAM", 8)

    expect(api.get).toHaveBeenCalledWith(
      "/recommendations/because-you-listened?region=VIETNAM&limit=8",
    )
  })

  it("put the track id in the path, escaped", async () => {
    await getSimilarTracks("a/b c", 15)

    expect(api.get).toHaveBeenCalledWith("/tracks/a%2Fb%20c/similar?limit=15")
  })

  it("search tracks by meaning, escaping what the person typed", async () => {
    await searchTracksByMeaning("nhạc buồn & mưa", 10)

    const url = String(jest.mocked(api.get).mock.calls[0][0])
    expect(url.startsWith("/search/semantic?")).toBe(true)
    const params = new URLSearchParams(url.split("?")[1])
    expect(params.get("q")).toBe("nhạc buồn & mưa")
    expect(params.get("type")).toBe("track")
    expect(params.get("limit")).toBe("10")
  })
})
