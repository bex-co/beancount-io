import { Api, FullRequestParams, HttpResponse, ErrorResponse } from "./Api";
import { logger } from "@/shared/logger";

const favaLogger = logger.child({ module: "fava-api-client" });

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Thrown when a Fava API request fails with a non-2xx response. Carries the
 * full parsed error body (`status`/`body`) so callers can recognize
 * structured error codes (e.g. ledger-service's `directive_limit_exceeded`)
 * instead of only having the flattened message string.
 */
export class FavaApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: ErrorResponse,
  ) {
    super(message);
    this.name = "FavaApiError";
  }
}

export class ApiClient extends Api<unknown> {
  private readonly timeoutMs: number;
  private readonly originalRequest: <T = unknown, E = unknown>(
    params: FullRequestParams,
  ) => Promise<HttpResponse<T, E>>;

  constructor(
    options?: ConstructorParameters<typeof Api<unknown>>[0] & {
      timeoutMs?: number;
    },
  ) {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, ...config } = options ?? {};
    super(config);
    this.timeoutMs = timeoutMs;
    this.originalRequest = this.request.bind(this);

    this.request = async <T = unknown, E = unknown>(
      params: FullRequestParams,
    ): Promise<HttpResponse<T, E>> => {
      const { path, method = "GET", signal: callerSignal } = params;
      const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
      const signal = callerSignal
        ? AbortSignal.any([callerSignal, timeoutSignal])
        : timeoutSignal;

      try {
        return await this.originalRequest<T, E>({ ...params, signal });
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "TimeoutError") {
          favaLogger.warn("Request timed out", {
            method,
            path,
            timeoutMs: this.timeoutMs,
          });
          throw new Error("Fava API request timed out");
        }

        const response = e as HttpResponse<unknown, ErrorResponse>;
        const err = response.error as ErrorResponse;
        favaLogger.error("[Fava API] failed", {
          method,
          path,
          error: err?.error,
        });
        throw new FavaApiError(
          err?.error ?? "Unknown API error",
          response.status,
          err,
        );
      }
    };
  }
}
