/** Public API of the users module. Other modules must import from here only. */
export { avatarThrottler } from "./users.config.js"
export { UsersModule } from "./users.module.js"
export { UsersService } from "./users.service.js"
export type { CreateUserInput, PublicUser, UserView } from "./users.service.js"
