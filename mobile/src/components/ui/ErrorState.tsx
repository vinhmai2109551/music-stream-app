import { CloudOff, SearchX } from "lucide-react-native"
import { describeApiError, isNotFound } from "@/utils/apiErrors"
import { Button } from "./Button"
import { EmptyState } from "./EmptyState"
import { useTranslation } from "@/i18n"

type ErrorStateProps = {
  error: unknown
  /** Shows a retry button (never for "not found": trying again will not help). */
  onRetry?: () => void
}

/** What a screen shows when its data could not be loaded. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { t } = useTranslation()

  if (isNotFound(error)) {
    return (
      <EmptyState
        icon={SearchX}
        title={t("errors.notFoundTitle")}
        description={t("errors.notFoundDescription")}
      />
    )
  }
  return (
    <EmptyState
      icon={CloudOff}
      title={t("errors.loadFailedTitle")}
      description={describeApiError(error)}
      action={onRetry ? <Button label={t("common.retry")} onPress={onRetry} /> : undefined}
    />
  )
}
