import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useAppStore } from "@/store/appStore"
import { useSearchHistoryStore } from "@/store/searchHistoryStore"
import { showToast, useToastStore } from "@/store/toastStore"
import { useVideoSlotStore } from "@/store/videoSlotStore"

afterEach(() => {
  jest.useRealTimers()
})

describe("toastStore", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    useToastStore.setState({ message: null })
  })

  it("shows a message and hides it after a couple of seconds", () => {
    showToast("Saved")
    expect(useToastStore.getState().message).toBe("Saved")

    jest.advanceTimersByTime(2199)
    expect(useToastStore.getState().message).toBe("Saved")
    jest.advanceTimersByTime(2)
    expect(useToastStore.getState().message).toBeNull()
  })

  it("a longer message can stay on screen longer", () => {
    showToast("Read me slowly", 5000)

    jest.advanceTimersByTime(4999)
    expect(useToastStore.getState().message).toBe("Read me slowly")
    jest.advanceTimersByTime(2)
    expect(useToastStore.getState().message).toBeNull()
  })

  it("a new message replaces the old one and restarts the clock", () => {
    showToast("First")
    jest.advanceTimersByTime(2000)
    showToast("Second")

    jest.advanceTimersByTime(1000) // 3000 ms after "First", but only 1000 after "Second"
    expect(useToastStore.getState().message).toBe("Second")
    jest.advanceTimersByTime(1300)
    expect(useToastStore.getState().message).toBeNull()
  })
})

describe("appStore", () => {
  beforeEach(() => useAppStore.setState({ hasStarted: false, authIntent: "login" }))

  it("starts on the login screen by default", () => {
    useAppStore.getState().start()

    expect(useAppStore.getState()).toMatchObject({ hasStarted: true, authIntent: "login" })
  })

  it("can open the register screen first", () => {
    useAppStore.getState().start("register")

    expect(useAppStore.getState()).toMatchObject({ hasStarted: true, authIntent: "register" })
  })
})

describe("videoSlotStore", () => {
  beforeEach(() => useVideoSlotStore.setState({ slot: null }))

  const rect = { x: 10, y: 20, width: 300, height: 300 }

  it("remembers where the player screen wants the video", () => {
    useVideoSlotStore.getState().setSlot(rect)

    expect(useVideoSlotStore.getState().slot).toEqual(rect)
  })

  it("keeps the same object when the rectangle did not change (no needless re-render)", () => {
    useVideoSlotStore.getState().setSlot(rect)
    const stored = useVideoSlotStore.getState().slot

    useVideoSlotStore.getState().setSlot({ ...rect })

    expect(useVideoSlotStore.getState().slot).toBe(stored)
  })

  it("updates when any side changes, and clears with null", () => {
    useVideoSlotStore.getState().setSlot(rect)
    useVideoSlotStore.getState().setSlot({ ...rect, y: 21 })
    expect(useVideoSlotStore.getState().slot?.y).toBe(21)

    useVideoSlotStore.getState().setSlot(null)
    expect(useVideoSlotStore.getState().slot).toBeNull()
    useVideoSlotStore.getState().setSlot(null)
    expect(useVideoSlotStore.getState().slot).toBeNull()
  })
})

describe("searchHistoryStore", () => {
  const history = () => useSearchHistoryStore.getState()

  beforeEach(async () => {
    await AsyncStorage.clear()
    useSearchHistoryStore.setState({ recentSearches: [] })
  })

  it("keeps the newest search first and removes repeats", () => {
    history().add("jack")
    history().add("bts")
    history().add("jack")

    expect(history().recentSearches).toEqual(["jack", "bts"])
  })

  it("trims the text and ignores blanks", () => {
    history().add("  iu  ")
    history().add("   ")
    history().add("")

    expect(history().recentSearches).toEqual(["iu"])
  })

  it("keeps only the five most recent", () => {
    for (const name of ["a", "b", "c", "d", "e", "f", "g"]) history().add(name)

    expect(history().recentSearches).toEqual(["g", "f", "e", "d", "c"])
  })

  it("removes one search or all of them", () => {
    history().add("a")
    history().add("b")

    history().remove("a")
    expect(history().recentSearches).toEqual(["b"])
    history().clear()
    expect(history().recentSearches).toEqual([])
  })

  it("is saved on the device", async () => {
    history().add("jack")
    await Promise.resolve()

    const saved = await AsyncStorage.getItem("music-stream-search-history")

    expect(JSON.parse(saved ?? "{}").state.recentSearches).toEqual(["jack"])
  })
})
