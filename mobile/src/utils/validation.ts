import { AUTH_LIMITS } from "@/constants/auth"
import { t } from "@/i18n"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export type FieldErrors<Field extends string> = Partial<Record<Field, string>>

export const normalizeEmail = (value: string): string => value.trim().toLowerCase()

export const hasErrors = (errors: object): boolean => Object.values(errors).some(Boolean)

function emailError(raw: string): string | undefined {
  const email = raw.trim()
  if (!email) return t("auth.validation.emailRequired")
  if (email.length > AUTH_LIMITS.emailMax)
    return t("auth.validation.emailTooLong", { max: AUTH_LIMITS.emailMax })
  if (!EMAIL_PATTERN.test(email)) return t("auth.validation.emailInvalid")
  return undefined
}

function nameError(raw: string): string | undefined {
  const name = raw.trim()
  if (!name) return t("auth.validation.nameRequired")
  if (name.length > AUTH_LIMITS.nameMax)
    return t("auth.validation.nameTooLong", { max: AUTH_LIMITS.nameMax })
  return undefined
}

/** Passwords are never trimmed. */
function passwordError(password: string, checkMinimum: boolean): string | undefined {
  if (!password) return t("auth.validation.passwordRequired")
  if (password.length > AUTH_LIMITS.passwordMax)
    return t("auth.validation.passwordTooLong", { max: AUTH_LIMITS.passwordMax })
  if (checkMinimum && password.length < AUTH_LIMITS.passwordMin)
    return t("auth.validation.passwordTooShort", { min: AUTH_LIMITS.passwordMin })
  return undefined
}

export type ProfileField = "name"

export function validateProfile(input: { name: string }): FieldErrors<ProfileField> {
  return { name: nameError(input.name) }
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
