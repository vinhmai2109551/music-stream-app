import { describe, expect, it } from "@jest/globals"
import { plainToInstance } from "class-transformer"
import { validate } from "class-validator"
import { LIST_ITEM_MAX_LENGTH, LIST_MAX_ITEMS } from "./limits.js"
import { StringList } from "./string-list.decorator.js"

class Sample {
  @StringList()
  words?: string[]
}

const errorsOf = async (words: unknown) =>
  (await validate(plainToInstance(Sample, { words }))).flatMap((error) =>
    Object.keys(error.constraints ?? {}),
  )

describe("StringList", () => {
  it("is optional", async () => {
    expect(await validate(plainToInstance(Sample, {}))).toEqual([])
  })

  it("accepts an empty list and a normal one", async () => {
    expect(await errorsOf([])).toEqual([])
    expect(await errorsOf(["v-pop", "ballad", "nhạc buồn"])).toEqual([])
  })

  it("accepts exactly 10 entries and entries of exactly 40 characters", async () => {
    expect(
      await errorsOf(Array.from({ length: LIST_MAX_ITEMS }, (_, index) => `w${index}`)),
    ).toEqual([])
    expect(await errorsOf(["a".repeat(LIST_ITEM_MAX_LENGTH)])).toEqual([])
  })

  it("rejects an 11th entry", async () => {
    expect(await errorsOf(Array.from({ length: LIST_MAX_ITEMS + 1 }, () => "w"))).toContain(
      "arrayMaxSize",
    )
  })

  it("rejects an entry of 41 characters", async () => {
    expect(await errorsOf(["a".repeat(LIST_ITEM_MAX_LENGTH + 1)])).toContain("maxLength")
  })

  it.each([[""], ["   "], ["\t\n"]])("rejects a blank entry %j", async (blank) => {
    expect(await errorsOf(["ok", blank])).toContain("matches")
  })

  it.each([["pop"], [42], [{ 0: "a" }], [[["nested"]]], [[1, 2]], [[null]]])(
    "rejects %j, which is not a list of texts",
    async (value) => {
      expect((await errorsOf(value)).length).toBeGreaterThan(0)
    },
  )
})
