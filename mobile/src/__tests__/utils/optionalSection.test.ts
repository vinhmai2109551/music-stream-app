import { describe, expect, it } from "@jest/globals"
import { toOptionalSection } from "@/utils/optionalSection"

const pick = (data: { items: number[] }) => data.items

describe("toOptionalSection", () => {
  it("is loading while the data loads", () => {
    expect(toOptionalSection({ status: "loading" }, pick)).toEqual({ status: "loading" })
  })

  it("is hidden when loading failed, whatever the reason", () => {
    expect(toOptionalSection({ status: "error", error: new Error("503") }, pick)).toEqual({
      status: "hidden",
    })
    expect(toOptionalSection({ status: "error", error: undefined }, pick)).toEqual({
      status: "hidden",
    })
  })

  it("is hidden when there is nothing to show", () => {
    expect(toOptionalSection({ status: "ready", data: { items: [] } }, pick)).toEqual({
      status: "hidden",
    })
  })

  it("shows the items that were picked", () => {
    expect(toOptionalSection({ status: "ready", data: { items: [1, 2] } }, pick)).toEqual({
      status: "ready",
      items: [1, 2],
    })
  })

  it("is hidden when everything was picked away", () => {
    const state = { status: "ready", data: { items: [1] } } as const
    expect(toOptionalSection(state, () => [])).toEqual({ status: "hidden" })
  })
})
