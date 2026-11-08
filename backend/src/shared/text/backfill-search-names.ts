import { Logger } from "@nestjs/common"
import { toSearchName } from "./search-name.js"

/** Rows handled per round. */
const BATCH_SIZE = 200

export interface SearchNameBackfill {
  /** Shown in the log: "tracks", "artists"... */
  label: string
  /** Up to `take` rows that have no search name yet, with the text to normalize. */
  read: (take: number) => Promise<{ id: string; text: string }[]>
  /** Stores the search names of these rows. */
  write: (rows: { id: string; searchName: string }[]) => Promise<void>
}

/**
 * Gives a search name to the rows that have none: rows made before the column existed, and rows
 * inserted straight into the database. (A row whose name is changed by SQL keeps its old search
 * name: rename through the API, which keeps the two in step.) Runs when the owning module starts;
 * each round handles a batch, until none is left. A failure is only logged: the API starts anyway,
 * and the next start tries again.
 */
export async function backfillSearchNames(job: SearchNameBackfill): Promise<number> {
  const logger = new Logger("SearchNames")
  let done = 0
  try {
    for (;;) {
      const rows = await job.read(BATCH_SIZE)
      if (rows.length === 0) break
      await job.write(rows.map((row) => ({ id: row.id, searchName: toSearchName(row.text) })))
      done += rows.length
      // A name that normalizes to "" is stored as "": it is no longer null, so it is not read again.
    }
    if (done > 0) logger.log(`Added search names to ${done} ${job.label}`)
  } catch (error) {
    logger.warn(`Could not add search names to ${job.label}: ${(error as Error).message}`)
  }
  return done
}
