/**
 * Centralized cache key registry for consistent namespacing and collision
 * prevention. Mirrors the design of `LOCK_KEYS` in `@/shared/lock`.
 *
 * Pattern: `domain:resource:identifier[:sub]`
 * - domain: Feature or area (feed, sitemap, ai, user, ...)
 * - resource: The kind of value cached (status, profile, xml, ...)
 * - identifier/sub: Optional scoping values (userId, locale, ...)
 *
 * Benefits:
 * - Prevents key collisions through consistent namespacing
 * - Type-safe key generation
 * - Single place to audit every cache key in use
 *
 * Note: keys here are namespaced again by Keyv (namespace "backend-v2") at the
 * Redis layer, so these strings are the logical key within that namespace.
 *
 * @example
 * import { CACHE_KEYS } from "@/shared/cache";
 * const key = CACHE_KEYS.feed.bySourceLocale("blog", "en");
 */
export const CACHE_KEYS = {
  /**
   * Auth ephemeral token / session stores.
   *
   * NOTE: these are "Redis-backed models," not caches — Redis is their
   * persistence. They persist through the shared strict `redis-record-store`
   * (throw-on-error semantics; they do NOT fail open like a cache). These
   * builders only centralize their key namespacing.
   */
  auth: {
    /** Email verification token by token value. */
    emailTokenByToken: (token: string) => `auth:email_token:token:${token}`,
    /** Email verification tokens owned by a user (array of token values). */
    emailTokensByUser: (userId: string) => `auth:email_token:user:${userId}`,
    /** Magic link token by id. */
    magicLinkTokenById: (id: string) => `auth:magic_link_token:id:${id}`,
    /** Magic link tokens owned by a user (array of ids). */
    magicLinkTokensByUser: (userId: string) =>
      `auth:magic_link_token:user:${userId}`,
    /** Signup OTP session by id. */
    signupOtpSessionById: (id: string) => `auth:signup_otp_session:id:${id}`,
    /** Signup OTP session id for an email (one-to-one mapping). */
    signupOtpSessionByEmail: (email: string) =>
      `auth:signup_otp_session:email:${email}`,
    /** Atomic signup OTP verification budget, shared across re-issued sessions. */
    signupOtpAttemptsByEmail: (email: string) =>
      `auth:signup_otp_attempts:email:${email}`,
    /** CLI auth session by id. */
    cliAuthSessionById: (id: string) => `auth:cli_auth_session:${id}`,
    /** CLI auth session id by device-code digest (the CLI's private verifier). */
    cliAuthSessionByDeviceDigest: (digest: string) =>
      `auth:cli_auth_session:device:${digest}`,
    /** CLI auth session id by the short code the person types in the browser. */
    cliAuthSessionByUserCode: (userCode: string) =>
      `auth:cli_auth_session:user_code:${userCode}`,
    /** Atomic budget for user-code lookups, per approving user. */
    cliAuthUserCodeAttemptsByUser: (userId: string) =>
      `auth:cli_auth_user_code_attempts:user:${userId}`,
    /** Atomic single-approval claim for one CLI auth session. */
    cliAuthApprovalClaim: (id: string) => `auth:cli_auth_approval_claim:${id}`,
    /** Atomic single-redemption claim for one CLI auth session. */
    cliAuthRedemptionClaim: (id: string) =>
      `auth:cli_auth_redemption_claim:${id}`,
  },

  /**
   * AI subsystem caches.
   */
  ai: {
    /** Result of the periodic AI health check (written by the scheduler job). */
    healthStatus: () => "ai:health:status",
  },

  /**
   * Activity / blog feed caches (Gitea feature).
   */
  feed: {
    /** Parsed feed items scoped by source ("blog", "gitea", ...) and locale. */
    bySourceLocale: (source: string, locale: string) =>
      `feed:${source}:${locale}`,
    /** Per-user aggregated Gitea activity feed. */
    giteaByUser: (userId: string) => `feed:gitea:all:${userId}`,
    /** Per-user Gitea repository list used to build the feed. */
    giteaRepoListByUser: (userId: string) => `feed:gitea:repolist:${userId}`,
  },

  /**
   * Sitemap caches (growth feature).
   *
   * NOTE: the sitemap cache is intentionally file-backed (Docker-volume
   * persisted, large XML, stale-while-revalidate) rather than Redis. These keys
   * exist so the file cache uses the same naming convention as everything else.
   */
  sitemap: {
    /** The generated sitemap XML (single global document). */
    xml: () => "sitemap:xml",
  },
} as const;
