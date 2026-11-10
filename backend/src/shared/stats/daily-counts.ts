import { Prisma } from "../../generated/prisma/client.js"

/** The tables that can be counted per day (a closed list: the name goes into the SQL text). */
export type DailyCountTable = "PlayEvent" | "User"

/**
 * Rows of `table` made per day over the last `days` days (today included), the days being those of
 * `timeZone`: `{ day: "YYYY-MM-DD", count }`, days without rows left out.
 *
 * `createdAt` is stored as UTC without a time zone. The lower bound is worked out once and brought
 * back to that form, so it is compared with the bare column (an index on it can be used) instead
 * of converting every row.
 */
export function dailyCountsQuery(
  table: DailyCountTable,
  days: number,
  timeZone: string,
): Prisma.Sql {
  return Prisma.sql`
    SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}::text, 'YYYY-MM-DD') AS day,
           count(*)::int AS count
    FROM ${Prisma.raw(`"${table}"`)}
    WHERE "createdAt" >= (
      (date_trunc('day', now() AT TIME ZONE ${timeZone}::text) - make_interval(days => ${days - 1}::int))
      AT TIME ZONE ${timeZone}::text
    ) AT TIME ZONE 'UTC'
    GROUP BY 1
    ORDER BY 1`
}
