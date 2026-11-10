/** Public API of the search module. Other modules must import from here only. */
export { SearchModule } from "./search.module.js"
export { semanticSearchThrottler } from "./search.config.js"
export { SearchService } from "./search.service.js"
export type { SemanticArtistHit, SemanticSearchResult, SemanticTrackHit } from "./search.service.js"
