import { describe, expect, it } from "@jest/globals"
import { AUTH_LIMITS } from "@/constants/auth"
import { copy } from "@/constants/copy"
import {
  hasErrors,
  normalizeEmail,
  validateLogin,
  validateProfile,
  validateRegister,
} from "@/utils/validation"

const messages = copy.auth.validation

describe("validateProfile", () => {
  it("accepts a normal name", () => {
    expect(validateProfile({ name: "Vinh" })).toEqual({ name: undefined })
    expect(validateProfile({ name: "Nguyễn Văn Á" }).name).toBeUndefined()
  })

  it("asks for a name, and treats blanks as missing", () => {
    expect(validateProfile({ name: "" }).name).toBe(messages.nameRequired)
    expect(validateProfile({ name: "   " }).name).toBe(messages.nameRequired)
  })

  it("accepts exactly the longest name and rejects one character more", () => {
    expect(validateProfile({ name: "a".repeat(AUTH_LIMITS.nameMax) }).name).toBeUndefined()
    expect(validateProfile({ name: "a".repeat(AUTH_LIMITS.nameMax + 1) }).name).toBe(
      messages.nameTooLong,
    )
  })

  it("measures the name without the spaces around it, as the form saves it", () => {
    expect(validateProfile({ name: ` ${"a".repeat(AUTH_LIMITS.nameMax)} ` }).name).toBeUndefined()
  })
})

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Hello@Example.COM ")).toBe("hello@example.com")
  })
})

describe("hasErrors", () => {
  it("is true only when some field has a message", () => {
    expect(hasErrors({})).toBe(false)
    expect(hasErrors({ email: undefined, password: undefined })).toBe(false)
    expect(hasErrors({ email: undefined, password: "bad" })).toBe(true)
  })
})

describe("validateLogin", () => {
  it("accepts a normal email and any non-empty password", () => {
    expect(validateLogin({ email: "a@b.co", password: "x" })).toEqual({
      email: undefined,
      password: undefined,
    })
  })

  it("asks for an email and a password", () => {
    const errors = validateLogin({ email: "   ", password: "" })

    expect(errors.email).toBe(messages.emailRequired)
    expect(errors.password).toBe(messages.passwordRequired)
  })

  it.each(["plainaddress", "no@tld", "two@@example.com", "spa ce@example.com", "@example.com"])(
    "rejects the malformed email %p",
    (email) => {
      expect(validateLogin({ email, password: "x" }).email).toBe(messages.emailInvalid)
    },
  )

  it("rejects an email that is too long", () => {
    const email = `${"a".repeat(AUTH_LIMITS.emailMax)}@example.com`

    expect(validateLogin({ email, password: "x" }).email).toBe(messages.emailTooLong)
  })

  it("does not enforce the minimum password length (old accounts), but the maximum", () => {
    expect(validateLogin({ email: "a@b.co", password: "1" }).password).toBeUndefined()
    expect(
      validateLogin({ email: "a@b.co", password: "x".repeat(AUTH_LIMITS.passwordMax + 1) })
        .password,
    ).toBe(messages.passwordTooLong)
  })

  it("never trims the password", () => {
    expect(validateLogin({ email: "a@b.co", password: "   " }).password).toBeUndefined()
  })
})

describe("validateRegister", () => {
  const valid = { email: "a@b.co", name: "Vinh", password: "x".repeat(AUTH_LIMITS.passwordMin) }

  it("accepts valid input", () => {
    expect(hasErrors(validateRegister(valid))).toBe(false)
  })

  it("requires a name, and limits its length", () => {
    expect(validateRegister({ ...valid, name: "  " }).name).toBe(messages.nameRequired)
    expect(validateRegister({ ...valid, name: "n".repeat(AUTH_LIMITS.nameMax + 1) }).name).toBe(
      messages.nameTooLong,
    )
  })

  it("enforces the minimum password length", () => {
    const short = "x".repeat(AUTH_LIMITS.passwordMin - 1)

    expect(validateRegister({ ...valid, password: short }).password).toBe(messages.passwordTooShort)
    expect(validateRegister({ ...valid, password: "" }).password).toBe(messages.passwordRequired)
  })
})
