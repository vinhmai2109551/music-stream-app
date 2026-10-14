/** Shared kernel: cross-cutting building blocks with no domain knowledge. */
export { Auth, OptionalAuth } from "./auth/auth.decorator.js"
export type { AuthUser } from "./auth/auth-user.js"
export { CurrentUser } from "./auth/current-user.decorator.js"
export { PaginationQueryDto } from "./pagination/pagination-query.dto.js"
export { pageArgs, toPage } from "./pagination/page.js"
export type { Page } from "./pagination/page.js"
