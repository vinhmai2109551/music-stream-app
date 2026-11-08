import { describe, expect, it } from "@jest/globals"
import { toSearchName } from "./search-name.js"

describe("toSearchName", () => {
  it.each([
    ["Sơn Tùng M-TP", "son tung m tp"],
    ["Đen Vâu", "den vau"],
    ["ĐEN", "den"],
    ["Hoàng Thùy Linh", "hoang thuy linh"],
    ["Mỹ Tâm", "my tam"],
    ["Nguyễn Văn Ơi Ừ Ữ Ự", "nguyen van oi u u u"],
    ["Lạc Trôi", "lac troi"],
    ["Em Của Ngày Hôm Qua", "em cua ngay hom qua"],
  ])("takes the accents off Vietnamese: %s -> %s", (input, expected) => {
    expect(toSearchName(input)).toBe(expected)
  })

  it("handles every tone and every vowel mark of Vietnamese", () => {
    const all = "àáảãạ ăằắẳẵặ âầấẩẫậ èéẻẽẹ êềếểễệ ìíỉĩị òóỏõọ ôồốổỗộ ơờớởỡợ ùúủũụ ưừứửữự ỳýỷỹỵ đ"
    expect(toSearchName(all)).toBe(
      "aaaaa aaaaaa aaaaaa eeeee eeeeee iiiii ooooo oooooo oooooo uuuuu uuuuuu yyyyy d",
    )
  })

  it("takes the accents off other Latin names too", () => {
    expect(toSearchName("Beyoncé")).toBe("beyonce")
    expect(toSearchName("Björk")).toBe("bjork")
  })

  it.each([
    ["Łódź", "lodz"],
    ["Mötley Crüe", "motley crue"],
    ["Sigur Rós", "sigur ros"],
    ["Søren", "soren"],
    ["Straße", "strasse"],
    ["Þór", "thor"],
    ["Cœur", "coeur"],
    ["Ærø", "aero"],
  ])("maps the Latin letters that have no accent to take off: %s -> %s", (input, expected) => {
    expect(toSearchName(input)).toBe(expected)
  })

  it("does not split a word of a script whose vowels are combining marks", () => {
    // Thai and Devanagari write some vowels as marks; they belong to the word.
    expect(toSearchName("สวัสดี")).toBe("สวัสดี")
    expect(toSearchName("नमस्ते दुनिया")).toBe("नमस्ते दुनिया")
  })

  it("makes it lower case", () => {
    expect(toSearchName("BLACKPINK")).toBe("blackpink")
    expect(toSearchName("Jack - J97")).toBe("jack j97")
  })

  it("turns punctuation into one space and trims", () => {
    expect(toSearchName("  (G)I-DLE  ")).toBe("g i dle")
    expect(toSearchName("a   b\t\nc")).toBe("a b c")
    expect(toSearchName("Hello, World!")).toBe("hello world")
    expect(toSearchName("AC/DC")).toBe("ac dc")
  })

  it("keeps digits", () => {
    expect(toSearchName("Top 50 - Việt Nam")).toBe("top 50 viet nam")
    expect(toSearchName("J97")).toBe("j97")
  })

  it("leaves Korean, Chinese and Japanese as they are", () => {
    expect(toSearchName("방탄소년단")).toBe("방탄소년단")
    expect(toSearchName("周杰倫")).toBe("周杰倫")
    expect(toSearchName("あいみょん")).toBe("あいみょん")
  })

  it("does not confuse a voiced Japanese kana with its plain one", () => {
    expect(toSearchName("が")).toBe("が")
    expect(toSearchName("が")).not.toBe(toSearchName("か"))
    expect(toSearchName("ぱ")).not.toBe(toSearchName("は"))
  })

  it("is the same whether the accent is one character or a base and a combining mark", () => {
    expect(toSearchName("Tùng")).toBe(toSearchName("Tùng"))
    expect(toSearchName("Tùng")).toBe("tung")
  })

  it("is the same for what is typed and for what is stored, so a typed 'son tung' matches 'Sơn Tùng'", () => {
    expect(toSearchName("son tung")).toBe(toSearchName("Sơn Tùng"))
    expect(toSearchName("SON  TUNG")).toBe(toSearchName("Sơn Tùng"))
  })

  it("gives an empty string for nothing but symbols or spaces", () => {
    expect(toSearchName("")).toBe("")
    expect(toSearchName("   ")).toBe("")
    expect(toSearchName("★ ♪ !!!")).toBe("")
  })

  it("does not change a name that is already a search name", () => {
    expect(toSearchName("son tung m tp")).toBe("son tung m tp")
  })
})
