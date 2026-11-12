import { describe, expect, it } from "vitest"
import { activityLine, fillTo, greetingFor, todayLine } from "./greeting"

describe("greetingFor", () => {
  it.each([
    [0, "Chào buổi sáng"],
    [10, "Chào buổi sáng"],
    [11, "Chào buổi trưa"],
    [13, "Chào buổi trưa"],
    [14, "Chào buổi chiều"],
    [17, "Chào buổi chiều"],
    [18, "Chào buổi tối"],
    [23, "Chào buổi tối"],
  ])("at %d o'clock: %s", (hour, text) => {
    expect(greetingFor(hour)).toBe(text)
  })
})

describe("todayLine", () => {
  it("says both numbers when there are both", () => {
    expect(todayLine(1234, 2)).toBe("Hôm nay có 1.234 lượt nghe và 2 người dùng mới.")
  })

  it("says only the one that is not zero", () => {
    expect(todayLine(5, 0)).toBe("Hôm nay có 5 lượt nghe.")
    expect(todayLine(0, 3)).toBe("Hôm nay có 3 người dùng mới.")
  })

  it("says that nothing happened yet, in a sentence of its own", () => {
    expect(todayLine(0, 0)).toBe("Hôm nay chưa có lượt nghe hay người dùng mới.")
  })
})

describe("fillTo", () => {
  it("repeats the items until there are enough", () => {
    expect(fillTo(["a", "b", "c"], 7)).toEqual(["a", "b", "c", "a", "b", "c", "a"])
  })

  it("keeps all the items when there are more than needed", () => {
    expect(fillTo(["a", "b", "c"], 2)).toEqual(["a", "b", "c"])
  })

  it("has nothing to repeat for an empty list", () => {
    expect(fillTo([], 5)).toEqual([])
  })
})

describe("activityLine", () => {
  it("talks about today when something happened today", () => {
    expect(activityLine({ plays: 3, newUsers: 0 }, { plays: 90, newUsers: 9 })).toBe(
      "Hôm nay có 3 lượt nghe.",
    )
  })

  it("falls back to the last 7 days when today is empty", () => {
    expect(activityLine({ plays: 0, newUsers: 0 }, { plays: 12, newUsers: 1 })).toBe(
      "7 ngày qua có 12 lượt nghe và 1 người dùng mới.",
    )
  })

  it("says that nothing happened when the whole week is empty", () => {
    expect(activityLine({ plays: 0, newUsers: 0 }, { plays: 0, newUsers: 0 })).toBe(
      "Hôm nay chưa có lượt nghe hay người dùng mới.",
    )
  })
})
