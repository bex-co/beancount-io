import { incrementInWindow } from "@/foundation/redis/redis-counter";
import { RateLimitedError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { classifyOp, type OpClass, type OpClassification } from "./op-class";
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

const ARCHIVE_DOWNLOAD_BUDGET: Budget = { windowMs: MINUTE, max: 30 };
/**
 * The canonical and compatibility archive verbs share one bucket across all
 * their spellings. Keyed on the classified verb, not hand-enumerated op ids,
 * so a new alias of either verb joins the shared budget by classification
 * rather than falling out of it unnoticed.
 */
const ARCHIVE_VERBS = new Set([
  "ledger.downloadArchive",
  "ledger.downloadArchive.legacy",
]);
const ARCHIVE_DOWNLOAD_BUCKET = "REST archive-download";

/**
 * The MCP endpoint's transport op id (w2/m28).
 *
 * Lives here rather than being spelled at each use so the budget below, the
 * handshake exemption, and the middleware that consults them cannot disagree
 * about which mount they mean.
 */
export const MCP_TRANSPORT_OP_ID = "REST POST /api-gateway/mcp";

/**
 * JSON-RPC methods that are handshake traffic, not work.
 *
 * A client must `initialize`, acknowledge, and list what is available before
 * it can call anything — that is protocol overhead the caller did not choose,
 * and charging a session's budget for it means a client that merely connects
 * has already spent part of its allowance. Everything these methods can lead
 * to is metered where it happens: `tools/call` and `resources/read` each
 * charge their own op. `resources/list` is deliberately absent — it enumerates
 * ledgers and source files, which is real work, and its list callbacks charge
 * the matching resource op.
 */
const MCP_HANDSHAKE_METHODS: ReadonlySet<string> = new Set([
  "initialize",
  "notifications/initialized",
  "tools/list",
  "resources/templates/list",
  // Prompt discovery is the same shape as `tools/list`: a static enumeration
  // that reaches no service (w2/008). `prompts/get` is deliberately absent —
  // it is the caller choosing to do something, even if the something it
  // returns is text.
  "prompts/list",
  "ping",
]);

/**
 * Whether this MCP request is handshake traffic only.
 *
 * A JSON-RPC batch is exempt only when *every* member is a handshake method,
 * so a real call cannot ride along inside one free of charge.
 */
export function isMcpHandshakeRequest(body: unknown): boolean {
  const messages = Array.isArray(body) ? body : [body];
  if (messages.length === 0) return false;
  return messages.every(
    (message) =>
      typeof message === "object" &&
      message !== null &&
      MCP_HANDSHAKE_METHODS.has(
        (message as { method?: unknown }).method as string,
      ),
  );
}

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
  // The MCP endpoint is a *transport*, not an operation: one agent session is
  // dozens of JSON-RPC POSTs to this one path, and almost all of them are
  // reads. Unclassified it fell to the write-class default, so a session of
  // ~57 mostly-read calls hit 429 and the SDK client threw out of the session
  // (w2/m28). The work each call actually performs is metered a level in, by
  // the per-tool and per-resource budgets `gateMcpCall` charges.
  [MCP_TRANSPORT_OP_ID]: { windowMs: MINUTE, max: 300 },
  "GQL Mutation.generateTempAssetUploadUrl": { windowMs: MINUTE, max: 10 },
  "GQL Query.getUserByExactMatch": { windowMs: MINUTE, max: 20 },
  // Minting a durable credential is rare by nature, and a flood of attempts is
  // more likely to be a loop than a user. The grouped MCP tool carries the
  // strictest member budget: its create branch mints, so the whole tool
  // spends 5/minute (w2/m27).
  "GQL Mutation.createApiKey": { windowMs: MINUTE, max: 5 },
  "REST POST /api-gateway/v1/api-keys": { windowMs: MINUTE, max: 5 },
  "MCP manageApiKeys": { windowMs: MINUTE, max: 5 },
  // Archive generation and transfer are substantially more expensive than a
  // normal metadata read. The canonical and compatibility routes share one
  // counter (see `operationBucket`) so changing URL cannot double this budget.
  "REST GET /api-gateway/v1/ledgers/{owner}/{name}/archive/{archive}":
    ARCHIVE_DOWNLOAD_BUDGET,
  "REST GET /api-gateway/ledgers/{ledgerId}/archive/{archive}":
    ARCHIVE_DOWNLOAD_BUDGET,
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
  // The compatibility archive route remains public for existing browser links.
  // Keep its expensive byte stream out of the general anonymous intake bucket.
  archive: ARCHIVE_DOWNLOAD_BUDGET,
  oauth: { windowMs: MINUTE, max: 60 },
  webhook: { windowMs: MINUTE, max: 120 },
  default: { windowMs: MINUTE, max: 120 },
};

/** Which anonymous family a path belongs to. */
export function anonymousFamily(path: string): keyof typeof ANONYMOUS_BUDGETS {
  if (
    /^\/api-gateway\/(?:v1\/ledgers\/[^/]+\/[^/]+|ledgers\/[^/]+)\/archive\/[^/]+$/.test(
      path,
    )
  ) {
    return "archive";
  }
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

/**
 * Per-op overrides, resolved to the verb they classify so the override follows
 * the operation to every surface. Without this, an override spelled for one
 * alias would share a counter with siblings holding a different max — the same
 * count refused at 5 on one surface and allowed to 60 on another.
 *
 * Built eagerly so two aliases of one verb declaring different budgets fail at
 * module load, in CI, rather than disagreeing quietly in production.
 */
const VERB_BUDGETS: ReadonlyMap<string, Budget> = (() => {
  const map = new Map<string, Budget>();
  for (const [opId, budget] of Object.entries(OP_BUDGETS)) {
    const { found, verb } = classifyOp(opId);
    if (!found || !verb) continue;
    const existing = map.get(verb);
    if (
      existing &&
      (existing.max !== budget.max || existing.windowMs !== budget.windowMs)
    ) {
      throw new Error(
        `rate-limit: aliases of ${verb} declare conflicting budgets`,
      );
    }
    map.set(verb, budget);
  }
  return map;
})();

export function budgetFor(
  opId: string,
  classification: OpClassification,
): Budget {
  const explicit = OP_BUDGETS[opId];
  if (explicit) return explicit;
  const { found, verb } = classification;
  // Archive aliases inherit the 30/minute budget here too: the two REST
  // spellings sit in OP_BUDGETS, so VERB_BUDGETS carries both archive verbs.
  const inherited = found && verb ? VERB_BUDGETS.get(verb) : undefined;
  return inherited ?? CLASS_BUDGETS[classification.class];
}

/**
 * Every spelling of one operation must spend the same budget. A verb reachable
 * over GraphQL, REST, and MCP is still one operation, so its aliases share the
 * classified verb's counter rather than earning one budget per surface. The
 * archive family goes further: two verbs — canonical and compatibility — share
 * one deliberately expensive bucket. An unclassified op falls back to its own
 * id; the coverage test already makes that state a bug.
 */
function operationBucket(
  opId: string,
  classification: OpClassification,
): string {
  const { found, verb } = classification;
  if (verb && ARCHIVE_VERBS.has(verb)) return ARCHIVE_DOWNLOAD_BUCKET;
  return found && verb ? `verb:${verb}` : opId;
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
  // One classification per request; budget and bucket both derive from it.
  const classification = classifyOp(args.opId);
  const budget = budgetFor(args.opId, classification);
  const key = `ratelimit:${subjectKey(args.identity, args.ip)}:${operationBucket(args.opId, classification)}`;

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
