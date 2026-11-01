import { Type } from "class-transformer"
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"

export interface CursorPage<T> {
  items: T[]
  /** Pass it as `cursor` to get the next page; null when this was the last one. */
  nextCursor: string | null
}

const DEFAULT_CURSOR_LIMIT = 20
const MAX_CURSOR_LIMIT = 50

/** Query of a list that is read page by page with a cursor (endless scrolling). */
export class CursorQueryDto {
  /** The `nextCursor` of the previous page. Leave it out for the first page. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cursor?: string

  /** Items per page (max 50). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CURSOR_LIMIT)
  limit: number = DEFAULT_CURSOR_LIMIT
}

/**
 * Turns the `limit + 1` rows fetched for a page into the page: the extra row only tells that
 * another page exists, and the id of the last returned row is where the next page starts.
 */
export function toCursorPage<T extends { id: string }>(rows: T[], limit: number): CursorPage<T> {
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null }
}
