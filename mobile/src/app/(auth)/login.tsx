import { router } from "expo-router"
import { useRef, useState } from "react"
import { TextInput } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { AuthScreenLayout } from "@/components/ui/AuthScreenLayout"
import { Button } from "@/components/ui/Button"
import { FormError } from "@/components/ui/FormError"
import { TextField } from "@/components/ui/TextField"
import { AUTH_LIMITS } from "@/constants/auth"
import { copy } from "@/constants/copy"
import { images } from "@/data/images"
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

const text = copy.auth

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login)
  const { submitting, error, run } = useAsyncSubmit()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({})
  const passwordRef = useRef<TextInput>(null)

  const submit = () => {
    const found = validateLogin({ email, password })
    setErrors(found)
    if (hasErrors(found)) return
    void run(
      () => login({ email: normalizeEmail(email), password }),
      (caught) => describeAuthError(caught, "login"),
    )
  }

  return (
    <AuthScreenLayout
      title={text.login.title}
      subtitle={text.login.subtitle}
      background={images.onboarding.launch}
      footer={
        <>
          <AppText color="onDarkMuted">{text.login.switchPrompt}</AppText>
          <Button
            variant="text"
            label={text.login.switchAction}
            disabled={submitting}
            onPress={() => router.replace("/register")}
          />
        </>
      }
    >
      <TextField
        label={text.fields.email.label}
        placeholder={text.fields.email.placeholder}
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
        label={text.fields.password.label}
        placeholder={text.fields.password.placeholder}
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
      {error ? <FormError message={error} /> : null}
      <Button label={text.login.submit} loading={submitting} onPress={submit} />
    </AuthScreenLayout>
  )
}
