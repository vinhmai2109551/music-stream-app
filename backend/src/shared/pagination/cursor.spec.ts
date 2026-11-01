import "reflect-metadata"
import { describe, expect, it } from "@jest/globals"
import { plainToInstance } from "class-transformer"
import { validateSync } from "class-validator"
import { CursorQueryDto, toCursorPage } from "./cursor.js"

const rows = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `id${i + 1}` }))

describe("toCursorPage", () => {
  it("returns the first `limit` rows and the id of the last one when another page exists", () => {
    const page = toCursorPage(rows(4), 3)

    expect(page.items.map((row) => row.id)).toEqual(["id1", "id2", "id3"])
    expect(page.nextCursor).toBe("id3")
  })

  it("has no next cursor when the rows just fit or fall short", () => {
    expect(toCursorPage(rows(3), 3)).toEqual({ items: rows(3), nextCursor: null })
    expect(toCursorPage(rows(2), 3)).toEqual({ items: rows(2), nextCursor: null })
  })

  it("handles an empty list", () => {
    expect(toCursorPage([], 20)).toEqual({ items: [], nextCursor: null })
  })
})

describe("CursorQueryDto", () => {
  const parse = (query: Record<string, string>) => {
    const dto = plainToInstance(CursorQueryDto, query)
    return { dto, errors: validateSync(dto) }
  }

  it("defaults to 20 items and no cursor", () => {
    const { dto, errors } = parse({})

    expect(errors).toHaveLength(0)
    expect(dto.limit).toBe(20)
    expect(dto.cursor).toBeUndefined()
  })

  it("converts the limit from text and accepts 1 to 50", () => {
    expect(parse({ limit: "50" }).dto.limit).toBe(50)
    expect(parse({ limit: "1" }).errors).toHaveLength(0)
  })

  it.each(["0", "51", "-1", "abc", "2.5"])("rejects the limit %p", (limit) => {
    expect(parse({ limit }).errors.length).toBeGreaterThan(0)
  })

  it("rejects a cursor that is far too long", () => {
    expect(parse({ cursor: "x".repeat(65) }).errors.length).toBeGreaterThan(0)
  })
})
