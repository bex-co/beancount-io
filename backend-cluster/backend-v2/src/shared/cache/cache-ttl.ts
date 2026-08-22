/**
 * Centralized TTL constants for caching, expressed in milliseconds.
 *
 * The cache layer (`cache-manager` + Keyv) takes TTLs in milliseconds, so all
 * values here are ms. Use these constants instead of scattering literals like
 * `5 * 60 * 1000` across services — it keeps cache durations auditable in one
 * place and makes the intent of each TTL explicit at the call site.
 *
 * @example
 * import { TTL } from "@/shared/cache";
 * await cacheHelper.set(key, value, TTL.MIN_5);
 */
export const TTL = {
  /** 45 seconds */
  SEC_45: 45 * 1000,
  /** 1 minute */
  MIN_1: 60 * 1000,
  /** 5 minutes */
  MIN_5: 5 * 60 * 1000,
  /** 10 minutes */
  MIN_10: 10 * 60 * 1000,
  /** 30 minutes */
  MIN_30: 30 * 60 * 1000,
  /** 1 hour */
  HOUR_1: 60 * 60 * 1000,
  /** 2 hours */
  HOUR_2: 2 * 60 * 60 * 1000,
  /** 24 hours */
  HOUR_24: 24 * 60 * 60 * 1000,
} as const;
