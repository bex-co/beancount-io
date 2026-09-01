import { incrementInWindow } from "@/foundation/redis/redis-counter";
import { RateLimitedError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { classifyOp, type OpClass } from "./op-class";
import type { Identity } from "./identity";

const limitLogger = logger.child({ module: "rate-limit" });

/**
 * One rate limiter for all three surfaces (ADR 0006 限流).
 *
 * What it replaces: `GraphQLRateLimiter`, an in-process `Map` attached by hand
 * to two resolvers. That design had three problems, all of which this one
 * exists to fix — the budget reset on every deploy, each instance had its own
 * (so N instances meant N× the budget), and REST and MCP had no limiter at all,
 * which made "rate limited" a property of which surface you asked rather than
 * of who was asking.
 *
 * Keys are the caller, not the request: a credential's budget follows it across
 * surfaces, so a client cannot get three budgets by spreading load over
 * GraphQL, REST, and MCP.
 */

/** A window and a count, in one place so every budget is comparable at a glance. */
export interface Budget {
  readonly windowMs: number;
  readonly max: number;
}

const MINUTE = 60_000;

/**
 * Budgets by op class. Writes are deliberately much smaller than reads: a read
 * that costs us a Fava query is bounded work, while a write commits to a git
 * repository, and the free-tier directive limit is not a rate limit.
 *
 * Hardcoded rather than env-sourced, per the repo's env-var policy — these are
 * not credentials and nothing good comes of two deployments disagreeing about
 * them by accident.
 */
export const CLASS_BUDGETS: Record<OpClass, Budget> = {
  read: { windowMs: MINUTE, max: 300 },
  write: { windowMs: MINUTE, max: 60 },
  admin: { windowMs: MINUTE, max: 30 },
  // A class no scope can satisfy is reached by sessions only; the browser is
  // not the abuse vector these budgets are for.
  "session-only": { windowMs: MINUTE, max: 300 },
  public: { windowMs: MINUTE, max: 600 },
};

/**
 * Per-op overrides, for the handful of ops whose cost is not their class's.
 *
 * The first two are the budgets `GraphQLRateLimiter` enforced per-resolver
 * before this existed; they are kept because they were chosen deliberately, and
 * they live here so that "which ops are special" is one list rather than a
 * property of whichever resolver remembered to construct a limiter.
 */
export const OP_BUDGETS: Record<string, Budget> = {
  "GQL Mutation.generateTempAssetUploadUrl": { windowMs: MINUTE, max: 10 },
  "GQL Query.getUserByExactMatch": { windowMs: MINUTE, max: 20 },
  // Minting a durable credential is rare by nature, and a flood of attempts is
  // more likely to be a loop than a user.
  "GQL Mutation.createApiKey": { windowMs: MINUTE, max: 5 },
  "REST POST /api-gateway/v1/api-keys": { windowMs: MINUTE, max: 5 },
  "MCP createApiKey": { windowMs: MINUTE, max: 5 },
  // The public quota catalog and protected billing mutations all used the
  // legacy `session-only` class. Keep that 300/minute budget while op classes
  // now describe public reachability or read/write risk independently from the
  // protected operations' browser-session credential ceiling. Subscription
  // status gets the same budget from the default read class.
  "GQL Query.allTierQuotas": CLASS_BUDGETS["session-only"],
  "GQL Mutation.createSubscriptionSession": CLASS_BUDGETS["session-only"],
  "GQL Mutation.createStripePortalSession": CLASS_BUDGETS["session-only"],
  "GQL Mutation.cancelSubscription": CLASS_BUDGETS["session-only"],
  "GQL Mutation.resumeSubscription": CLASS_BUDGETS["session-only"],
  "GQL Mutation.upgradeSubscription": CLASS_BUDGETS["session-only"],
  // Social discovery and session feed/follow operations used the legacy
  // session-only budget before centralized authorization split reachability
  // from operational risk. Preserve that 300/minute budget exactly.
  "GQL Query.getFeed": CLASS_BUDGETS["session-only"],
  "GQL Query.getUserProfile": CLASS_BUDGETS["session-only"],
  "GQL Query.getUserFollowers": CLASS_BUDGETS["session-only"],
  "GQL Query.getUserFollowing": CLASS_BUDGETS["session-only"],
  "GQL Query.getUserStarredRepos": CLASS_BUDGETS["session-only"],
  "GQL Mutation.followUser": CLASS_BUDGETS["session-only"],
  "GQL Mutation.unfollowUser": CLASS_BUDGETS["session-only"],
};

/**
 * Budgets for the intakes that sit outside the identity gate, keyed by IP.
 *
 * Separate families rather than one anonymous bucket: a flood against the OIDC
 * ceremony must not exhaust the budget Stripe's webhooks need, or a noisy
 * neighbour could stop us taking payments by hammering a login page.
 */
export const ANONYMOUS_BUDGETS: Record<string, Budget> = {
  oauth: { windowMs: MINUTE, max: 60 },
  webhook: { windowMs: MINUTE, max: 120 },
  default: { windowMs: MINUTE, max: 120 },
};

/** Which anonymous family a path belongs to. */
export function anonymousFamily(path: string): keyof typeof ANONYMOUS_BUDGETS {
  if (path.includes("/oauth") || path.includes("/.well-known/")) return "oauth";
  if (path.includes("/webhook")) return "webhook";
  return "default";
}

/**
 * Who is being charged.
 *
 * A token has its own budget as well as its user's, so one compromised or
 * runaway key cannot spend the user's whole allowance — and revoking it
 * restores the user immediately.
 */
function subjectKey(identity: Identity | undefined, ip: string): string {
  if (!identity) return `ip:${ip}`;
  return identity.tokenId
    ? `tok:${identity.tokenId}`
    : `usr:${identity.userId}`;
}

export function budgetFor(opId: string, opClass: OpClass): Budget {
  return OP_BUDGETS[opId] ?? CLASS_BUDGETS[opClass];
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
  readonly budget: Budget;
  readonly count: number;
}

/**
 * Charge one request against the caller's budget for this op.
 *
 * Fails open when Redis is unreachable — see `incrementInWindow`.
 */
export async function consume(args: {
  opId: string;
  identity?: Identity;
  ip: string;
}): Promise<RateLimitDecision> {
  const { class: opClass } = classifyOp(args.opId);
  const budget = budgetFor(args.opId, opClass);
  const key = `ratelimit:${subjectKey(args.identity, args.ip)}:${args.opId}`;

  const result = await incrementInWindow(key, budget.windowMs);
  if (!result) {
    return { allowed: true, retryAfterSeconds: 0, budget, count: 0 };
  }

  return {
    allowed: result.count <= budget.max,
    retryAfterSeconds: Math.max(1, Math.ceil(result.resetInMs / 1000)),
    budget,
    count: result.count,
  };
}

/** Charge an anonymous request against its intake family's IP budget. */
export async function consumeAnonymous(args: {
  path: string;
  ip: string;
}): Promise<RateLimitDecision> {
  const family = anonymousFamily(args.path);
  const budget = ANONYMOUS_BUDGETS[family];
  const result = await incrementInWindow(
    `ratelimit:anon:${family}:${args.ip}`,
    budget.windowMs,
  );
  if (!result) {
    return { allowed: true, retryAfterSeconds: 0, budget, count: 0 };
  }
  return {
    allowed: result.count <= budget.max,
    retryAfterSeconds: Math.max(1, Math.ceil(result.resetInMs / 1000)),
    budget,
    count: result.count,
  };
}

/**
 * Charge a request and refuse it if the budget is spent.
 *
 * The refusal is a `RateLimitedError` carrying `retryAfter`, which each surface
 * already knows how to dress: REST renders 429 with the header,
 * `format-error.ts` puts `RATE_LIMITED` in the GraphQL extensions, and the MCP
 * handler turns it into an `isError` result the agent can read.
 */
export async function enforceRateLimit(args: {
  opId: string;
  identity?: Identity;
  ip: string;
}): Promise<void> {
  const decision = await consume(args);
  if (decision.allowed) return;

  limitLogger.info("Rate limit exceeded", {
    opId: args.opId,
    // The subject, never the credential: `tokenId` is an id, not a secret.
    tokenId: args.identity?.tokenId,
    userId: args.identity?.userId,
    count: decision.count,
    max: decision.budget.max,
  });

  throw new RateLimitedError(
    decision.retryAfterSeconds,
    `Rate limit exceeded for ${args.opId}. Retry in ${decision.retryAfterSeconds}s.`,
  );
}
