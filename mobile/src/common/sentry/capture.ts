import * as Sentry from "@sentry/react-native";

/**
 * Report a caught error to Sentry with a bit of structured context. A thin,
 * import-once seam so call sites don't each reach into the native SDK, and so
 * a missing/uninitialised Sentry never turns error reporting into a crash of
 * its own — capture failures are swallowed.
 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // Never let telemetry failure mask or replace the original error.
  }
}
