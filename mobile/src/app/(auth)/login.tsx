import { router } from "expo-router"
import { useRef, useState } from "react"
import type { TextInputInstance } from "react-native"
import { AuthScreenLayout } from "@/components/ui/AuthScreenLayout"
import { Button } from "@/components/ui/Button"
import { FormError } from "@/components/ui/FormError"
import { TextField } from "@/components/ui/TextField"
import { TurnstileWidget } from "@/components/ui/TurnstileWidget"
import { AUTH_LIMITS } from "@/constants/auth"
import { TURNSTILE } from "@/constants/turnstile"
import { images } from "@/data/images"
import { useTranslation } from "@/i18n"
import { useAsyncSubmit } from "@/hooks/useAsyncSubmit"
import { useAuthStore } from "@/store/authStore"
import { describeAuthError } from "@/utils/authErrors"
import {
  hasErrors,
  normalizeEmail,
  validateLogin,
  type FieldErrors,
  type LoginField,
} from "@/utils/validation"

export default function LoginScreen() {
  const { t } = useTranslation()
  const login = useAuthStore((state) => state.login)
  const { submitting, error, run } = useAsyncSubmit()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({})
  // Cloudflare Turnstile: each token is single-use, so the widget is remounted after every attempt.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [turnstileMissing, setTurnstileMissing] = useState(false)
  const emailRef = useRef<TextInputInstance>(null)
  const passwordRef = useRef<TextInputInstance>(null)

  const submit = () => {
    const found = validateLogin({ email, password })
    setErrors(found)
    if (hasErrors(found)) {
      const first = found.email ? emailRef : passwordRef
      first.current?.focus()
      return
    }
    if (TURNSTILE.enabled && !turnstileToken) {
      setTurnstileMissing(true)
      return
    }
    void run(
      async () => {
        try {
          await login({
            email: normalizeEmail(email),
            password,
            ...(turnstileToken ? { turnstileToken } : {}),
          })
        } finally {
          setTurnstileToken(null)
          setTurnstileKey((key) => key + 1)
        }
      },
      (caught) => describeAuthError(caught, "login"),
    )
  }

  const handleTurnstileToken = (token: string | null) => {
    setTurnstileToken(token)
    if (token) setTurnstileMissing(false)
  }

  return (
    <AuthScreenLayout
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      background={images.onboarding.launch}
      footer={{
        prompt: t("auth.login.switchPrompt"),
        action: t("auth.login.switchAction"),
        disabled: submitting,
        onPress: () => router.replace("/register"),
      }}
    >
      <TextField
        ref={emailRef}
        label={t("auth.fields.email.label")}
        placeholder={t("auth.fields.email.placeholder")}
        value={email}
        onChangeText={(value) => {
          setEmail(value)
          setErrors((current) => ({ ...current, email: undefined }))
        }}
        error={errors.email}
        editable={!submitting}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        maxLength={AUTH_LIMITS.emailMax}
      />
      <TextField
        ref={passwordRef}
        password
        label={t("auth.fields.password.label")}
        placeholder={t("auth.fields.password.placeholder")}
        value={password}
        onChangeText={(value) => {
          setPassword(value)
          setErrors((current) => ({ ...current, password: undefined }))
        }}
        error={errors.password}
        editable={!submitting}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        maxLength={AUTH_LIMITS.passwordMax}
      />
      <TurnstileWidget key={turnstileKey} action="login" onToken={handleTurnstileToken} />
      {turnstileMissing ? <FormError message={t("auth.turnstile.required")} /> : null}
      {error ? <FormError message={error} /> : null}
      <Button label={t("auth.login.submit")} loading={submitting} onPress={submit} />
    </AuthScreenLayout>
  )
}
