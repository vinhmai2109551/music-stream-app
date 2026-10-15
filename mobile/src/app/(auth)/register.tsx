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
  validateRegister,
  type FieldErrors,
  type RegisterField,
} from "@/utils/validation"

const text = copy.auth

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register)
  const { submitting, error, run } = useAsyncSubmit()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<FieldErrors<RegisterField>>({})
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)

  const clearError = (field: RegisterField) =>
    setErrors((current) => ({ ...current, [field]: undefined }))

  const submit = () => {
    const found = validateRegister({ email, name, password })
    setErrors(found)
    if (hasErrors(found)) return
    void run(
      () => register({ email: normalizeEmail(email), name: name.trim(), password }),
      (caught) => describeAuthError(caught, "register"),
    )
  }

  return (
    <AuthScreenLayout
      title={text.register.title}
      subtitle={text.register.subtitle}
      background={images.onboarding.launch}
      footer={
        <>
          <AppText color="onDarkMuted">{text.register.switchPrompt}</AppText>
          <Button
            variant="text"
            label={text.register.switchAction}
            disabled={submitting}
            onPress={() => router.replace("/login")}
          />
        </>
      }
    >
      <TextField
        label={text.fields.name.label}
        placeholder={text.fields.name.placeholder}
        value={name}
        onChangeText={(value) => {
          setName(value)
          clearError("name")
        }}
        error={errors.name}
        editable={!submitting}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
        maxLength={AUTH_LIMITS.nameMax}
      />
      <TextField
        ref={emailRef}
        label={text.fields.email.label}
        placeholder={text.fields.email.placeholder}
        value={email}
        onChangeText={(value) => {
          setEmail(value)
          clearError("email")
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
          clearError("password")
        }}
        error={errors.password}
        editable={!submitting}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        maxLength={AUTH_LIMITS.passwordMax}
      />
      {error ? <FormError message={error} /> : null}
      <Button label={text.register.submit} loading={submitting} onPress={submit} />
    </AuthScreenLayout>
  )
}
