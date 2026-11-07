/** Shared kernel: cross-cutting building blocks with no domain knowledge. */
export { Auth, OptionalAuth } from "./auth/auth.decorator.js"
export type { AuthUser } from "./auth/auth-user.js"
export { CurrentUser } from "./auth/current-user.decorator.js"
export { PaginationQueryDto } from "./pagination/pagination-query.dto.js"
export { pageArgs, toPage } from "./pagination/page.js"
export type { Page } from "./pagination/page.js"
export {
  DESCRIPTION_MAX_LENGTH,
  LANGUAGE_CODE,
  LIST_ITEM_MAX_LENGTH,
  LIST_MAX_ITEMS,
} from "./validation/limits.js"
export { StringList } from "./validation/string-list.decorator.js"
export { ThrottleGroup, throttleGroup } from "./throttle/throttle-group.js"
export type { RateLimit } from "./throttle/throttle-group.js"
export { CursorQueryDto, toCursorPage } from "./pagination/cursor.js"
export type { CursorPage } from "./pagination/cursor.js"
