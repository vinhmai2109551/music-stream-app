import { describe, expect, it } from "@jest/globals"
import { rankKeywordMatches, type KeywordCandidate } from "./keyword-rank.js"

const c = (id: string, name: string, secondary = "", popularity = 0): KeywordCandidate => ({
  id,
  name,
  secondary,
  popularity,
})

describe("rankKeywordMatches", () => {
  it("puts the exact name first, then names that start with the query, then whole words, then parts of words", () => {
    const ranked = rankKeywordMatches(
      [
        c("part", "xxsonxx"),
        c("word", "bai hat son tung"),
        c("start", "son tung m tp"),
        c("exact", "son"),
      ],
      "son",
    )

    expect(ranked).toEqual(["exact", "start", "word", "part"])
  })

  it("ranks a match in the artist name below any match in the title", () => {
    const ranked = rankKeywordMatches(
      [c("byArtist", "lac troi", "son tung m tp", 1_000_000), c("byTitle", "con duong son", "", 1)],
      "son",
    )

    expect(ranked).toEqual(["byTitle", "byArtist"])
  })

  it("puts word-by-word matches last", () => {
    const ranked = rankKeywordMatches(
      [c("scattered", "mua ngay buon", "ai do"), c("phrase", "nhac buon ngay mua")],
      "buon ngay mua",
    )

    expect(ranked).toEqual(["phrase", "scattered"])
  })

  it("orders equally good matches by popularity, then by id", () => {
    const ranked = rankKeywordMatches(
      [c("b", "son ca", "", 5), c("a", "son ca", "", 5), c("z", "son ca", "", 50)],
      "son",
    )

    expect(ranked).toEqual(["z", "a", "b"])
  })

  it("is empty for no candidates", () => {
    expect(rankKeywordMatches([], "son")).toEqual([])
  })

  it("does not change the list it is given", () => {
    const list = [c("b", "son b"), c("a", "son")]
    rankKeywordMatches(list, "son")

    expect(list.map((item) => item.id)).toEqual(["b", "a"])
  })
})
