import { CloudOff, SearchX } from "lucide-react-native"
import { copy } from "@/constants/copy"
import { describeApiError, isNotFound } from "@/utils/apiErrors"
import { Button } from "./Button"
import { EmptyState } from "./EmptyState"

type ErrorStateProps = {
  error: unknown
  /** Shows a retry button (never for "not found": trying again will not help). */
  onRetry?: () => void
}

/** What a screen shows when its data could not be loaded. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  if (isNotFound(error)) {
    return (
      <EmptyState
        icon={SearchX}
        title={copy.errors.notFoundTitle}
        description={copy.errors.notFoundDescription}
      />
    )
  }
  return (
    <EmptyState
      icon={CloudOff}
      title={copy.errors.loadFailedTitle}
      description={describeApiError(error)}
      action={onRetry ? <Button label={copy.common.retry} onPress={onRetry} /> : undefined}
    />
  )
}
