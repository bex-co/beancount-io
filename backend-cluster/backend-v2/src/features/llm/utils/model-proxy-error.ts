import { z } from "zod";
import {
  type DomainError,
  InternalServerError,
  RateLimitedError,
} from "@/shared/errors";

const resetTimestamp = z.iso.datetime({ offset: true });

function findQuotaError(
  value: unknown,
  depth = 0,
): Record<string, unknown> | undefined {
  if (depth >= 8) return undefined;
  if (typeof value === "string") {
    if (Buffer.byteLength(value, "utf8") > 16_384) return undefined;
    try {
      return findQuotaError(JSON.parse(value), depth + 1);
    } catch {
      return undefined;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (record.code === "QUOTA_EXCEEDED") return record;
  return (
    findQuotaError(record.error, depth + 1) ??
    findQuotaError(record.message, depth + 1)
  );
}

function positiveSeconds(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}

/** Translate only recognized quota facts; provider prose never crosses here. */
export function modelProxyError(
  status: number,
  body: string,
  retryAfterHeader: string | null,
): DomainError {
  const quota =
    status === 402 || status === 429 ? findQuotaError(body) : undefined;
  if (!quota) {
    return new InternalServerError(
      `Hosted AI service could not complete this request (upstream HTTP ${status}).`,
      undefined,
      status,
    );
  }

  const reset = resetTimestamp.safeParse(quota.blockedUntil);
  const resetAt = reset.success ? Date.parse(reset.data) : NaN;
  const now = Date.now();
  const blockedUntil =
    Number.isFinite(resetAt) && resetAt > now
      ? new Date(resetAt).toISOString()
      : undefined;
  const headerSeconds =
    retryAfterHeader && /^\d+$/.test(retryAfterHeader)
      ? positiveSeconds(Number(retryAfterHeader))
      : undefined;
  const retryAfter =
    positiveSeconds(quota.retryAfter) ??
    headerSeconds ??
    (blockedUntil ? Math.ceil((resetAt - now) / 1000) : undefined);
  const guidance = blockedUntil
    ? `Try again at ${blockedUntil}.`
    : retryAfter
      ? `Try again in ${retryAfter} seconds.`
      : "Try again later.";

  return new RateLimitedError(
    retryAfter,
    `Hosted AI service capacity cannot accommodate this request. ${guidance}`,
    {
      quotaScope: "shared_service",
      ...(blockedUntil && { blockedUntil }),
    },
  );
}
