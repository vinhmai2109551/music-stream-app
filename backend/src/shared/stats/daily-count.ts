/** One day (`YYYY-MM-DD`, in the time zone the query asked for) and how many rows fall on it. */
export interface DailyCount {
  day: string
  count: number
}
