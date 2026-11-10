import raw from "./metadata.json" with { type: "json" }
import { parseCatalogMetadata } from "./metadata.js"

/**
 * The reviewed metadata of the catalog (`metadata.json`), checked when it is first read. The seed
 * reads this file and never calls a language model: `npm run ai:enrich` proposes entries, a person
 * reviews them, and only then do they reach the database.
 */
export const CATALOG_METADATA = parseCatalogMetadata(raw)
