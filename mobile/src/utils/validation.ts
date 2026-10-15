import { AUTH_LIMITS } from "@/constants/auth"
import { copy } from "@/constants/copy"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const messages = copy.auth.validation

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>

export const normalizeEmail = (value: string): string => value.trim().toLowerCase()

export const hasErrors = (errors: object): boolean => Object.values(errors).some(Boolean)

function emailError(raw: string): string | undefined {
  const email = raw.trim()
  if (!email) return messages.emailRequired
  if (email.length > AUTH_LIMITS.emailMax) return messages.emailTooLong
  if (!EMAIL_PATTERN.test(email)) return messages.emailInvalid
  return undefined
}

function nameError(raw: string): string | undefined {
  const name = raw.trim()
  if (!name) return messages.nameRequired
  if (name.length > AUTH_LIMITS.nameMax) return messages.nameTooLong
  return undefined
}

/** Passwords are never trimmed. */
function passwordError(password: string, checkMinimum: boolean): string | undefined {
  if (!password) return messages.passwordRequired
  if (password.length > AUTH_LIMITS.passwordMax) return messages.passwordTooLong
  if (checkMinimum && password.length < AUTH_LIMITS.passwordMin) return messages.passwordTooShort
  return undefined
}

export type LoginField = "email" | "password"
export type RegisterField = "email" | "name" | "password"

export function validateLogin(input: { email: string; password: string }): FieldErrors<LoginField> {
  return {
    email: emailError(input.email),
    // Existing accounts may predate the length rule, so login only requires a value.
    password: passwordError(input.password, false),
  }
}

export function validateRegister(input: {
  email: string
  name: string
  password: string
}): FieldErrors<RegisterField> {
  return {
    email: emailError(input.email),
    name: nameError(input.name),
    password: passwordError(input.password, true),
  }
}
