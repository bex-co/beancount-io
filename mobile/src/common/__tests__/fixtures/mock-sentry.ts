/** Stand-in for `@sentry/react-native`, recording what would have been sent. */
export const captured: Array<{ error: unknown; hint: unknown }> = [];
export const sentryControl = { throwOnCapture: false };

export function captureException(error: unknown, hint?: unknown): string {
  if (sentryControl.throwOnCapture) {
    throw new Error("Sentry client unavailable");
  }
  captured.push({ error, hint });
  return "event-id";
}

export function resetSentry(): void {
  captured.length = 0;
  sentryControl.throwOnCapture = false;
}
