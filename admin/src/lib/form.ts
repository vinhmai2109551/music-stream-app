import type { Row } from "@/api/resources"

/**
 * Sends a body built by hand (see `toTrackBody`) through a Refine form's `onFinish`, which is typed
 * for the values of the form. The body is what the data provider's `toApi` expects.
 */
export function submitBody<TValues>(
  onFinish: ((values: TValues) => unknown) | undefined,
  body: Row,
): unknown {
  return onFinish?.(body as unknown as TValues)
}
