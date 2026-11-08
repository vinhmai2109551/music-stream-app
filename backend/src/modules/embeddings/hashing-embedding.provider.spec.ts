import { describe, expect, it } from "@jest/globals"
import { EMBEDDING_DIMENSIONS } from "./embedding-provider.js"
import { HashingEmbeddingProvider } from "./hashing-embedding.provider.js"
import { cosineSimilarity } from "../../shared/vectors/vector-math.js"

const provider = new HashingEmbeddingProvider()
const vectorOf = async (text: string) => (await provider.embed([text], "document"))[0]

describe("HashingEmbeddingProvider", () => {
  it("returns one vector of the right size per text, in order, with length 1", async () => {
    const vectors = await provider.embed(["one", "two", "three"], "document")

    expect(vectors).toHaveLength(3)
    for (const vector of vectors) {
      expect(vector).toHaveLength(EMBEDDING_DIMENSIONS)
      expect(Math.hypot(...vector)).toBeCloseTo(1)
    }
  })

  it("is deterministic: the same text always gives the same vector", async () => {
    expect(await vectorOf("nhạc buồn ngày mưa")).toEqual(await vectorOf("nhạc buồn ngày mưa"))
  })

  it("treats a question and a document alike", async () => {
    const [asDocument] = await provider.embed(["gym playlist"], "document")
    const [asQuery] = await provider.embed(["gym playlist"], "query")

    expect(asQuery).toEqual(asDocument)
  })

  it("does not tell accents or case apart, so 'son tung' finds 'Sơn Tùng'", async () => {
    expect(cosineSimilarity(await vectorOf("son tung"), await vectorOf("Sơn Tùng"))).toBeCloseTo(1)
    expect(cosineSimilarity(await vectorOf("duong"), await vectorOf("ĐƯỜNG"))).toBeCloseTo(1)
  })

  it("puts texts that share words closer than texts that share nothing", async () => {
    const query = await vectorOf("nhac buon ngay mua")
    const related = await vectorOf("Bài: Mưa Rơi. Tâm trạng: buồn. Hoàn cảnh: ngày mưa nhạc buồn")
    const unrelated = await vectorOf("Bài: Gym Beat. Thể loại: EDM. Tâm trạng: sôi động")

    expect(cosineSimilarity(query, related)).toBeGreaterThan(cosineSimilarity(query, unrelated))
  })

  it("copes with empty text and with nothing but punctuation", async () => {
    const empty = await vectorOf("")
    expect(empty).toHaveLength(EMBEDDING_DIMENSIONS)
    expect(empty.every((value) => value === 0)).toBe(true)
    expect((await vectorOf("!!! ???")).every((value) => value === 0)).toBe(true)
  })

  it("identifies itself so its vectors are never mixed with a real model's", () => {
    expect(provider.model).toBe("hashing-v1")
    expect(provider.dimensions).toBe(EMBEDDING_DIMENSIONS)
  })
})
