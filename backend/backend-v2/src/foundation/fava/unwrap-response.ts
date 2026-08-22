import { DomainError, InternalServerError } from "@/shared/errors";
import type { ErrorResponse, HttpResponse } from "./Api";

/** Minimal shape shared by every generated `SuccessResponse*` interface. */
type FavaSuccessEnvelope<T> = { success?: boolean; data: T };

/**
 * Await a Fava client call, validate its `HttpResponse`, and return the inner
 * `data.data`, fully typed via inference. Throws when the request itself
 * fails (e.g. a non-2xx response, including a Gitea pre-receive hook
 * rejecting a write) or when `success` is falsy.
 *
 * Consolidates the `try { await ... } catch { throw ... }` / `if (!response.data.success)
 * throw ...; return response.data.data` ritual repeated across every
 * {@link FavaApiClient} consumer. Takes the pending request promise directly so
 * callers write `await unwrapFavaResponse(client.x.y(...), "...")` without a
 * separate `await`.
 *
 * @param response  the pending Fava client request (or a resolved response)
 * @param operation human-readable op name, used in the default error message
 * @param makeError optional factory to override the thrown error (e.g. to throw
 *                  `ServiceUnavailableError` instead), given the underlying
 *                  cause when the request itself failed, or an `Error` wrapping
 *                  `resolved.data.error` when the request succeeded but the
 *                  response body says `success: false` and carries an error
 *                  message (undefined if it doesn't)
 */
export async function unwrapFavaResponse<T>(
  response:
    | HttpResponse<FavaSuccessEnvelope<T>, ErrorResponse>
    | Promise<HttpResponse<FavaSuccessEnvelope<T>, ErrorResponse>>,
  operation: string,
  makeError?: (cause?: unknown) => Error,
): Promise<T> {
  let resolved: HttpResponse<FavaSuccessEnvelope<T>, ErrorResponse>;
  try {
    resolved = await response;
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw makeError
      ? makeError(error)
      : new InternalServerError(`Failed to ${operation}`);
  }

  if (!resolved.data.success) {
    const failure = resolved.data as unknown as { error?: string };
    throw makeError
      ? makeError(failure.error ? new Error(failure.error) : undefined)
      : new InternalServerError(`Failed to ${operation}`);
  }
  return resolved.data.data;
}
