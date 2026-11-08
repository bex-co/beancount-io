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
 * User totals and credential sub-budgets follow the caller across surfaces.
 * Changing a token or protocol cannot buy another user allowance. A bounded
 * local shadow keeps charging through a Redis outage; it is conservative per
 * process, not a replacement for Redis's cross-instance coordination.
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
  "ledger.downloadArchive.mcp",
]);
const ARCHIVE_DOWNLOAD_BUCKET = "REST archive-download";

/**
 * The MCP endpoint's transport op id, and the op its handshake spends instead.
 *
 * Budget keys, so they live here with the budgets — but a hand-copied route
 * string is exactly what w2/014 called out, so `setMcpRoute` derives the op id
 * from the path it actually mounts and `mcp-rate-policy.test.ts` fails if the
 * two ever disagree.
 */
export const MCP_TRANSPORT_OP_ID = "REST POST /api-gateway/mcp";
export const MCP_HANDSHAKE_OP_ID = "REST POST /api-gateway/mcp#handshake";

/**
 * A mount's say in how its requests are charged (w2/014).
 *
 * The limiter's job is "look up the op, charge the budget". Deciding that
 * *this* POST is protocol ceremony rather than work needs to understand the
 * body, and only the mount does — the limiter previously knew that one route
 * string was MCP, that MCP bodies are JSON-RPC, and which methods are
 * handshake. The next transport with a handshake would have added a second
 * `if`, and renaming the route would have silently re-charged the handshake
 * with no test failing.
 *
 * So a mount registers a policy against the same op id it mounts under, and
 * returns the op whose budget this request should spend. Returning a different
 * op is the only power on offer: a policy cannot exempt a request, because a
 * total bypass at the one limiter meant to be unbypassable is how unlimited
 * `{"method":"ping"}` posts came to cost a credential nothing.
 */
export type RouteRateLimitPolicy = (body: unknown) => string;

const ROUTE_POLICIES = new Map<string, RouteRateLimitPolicy>();

/** Register a mount's charging policy. Registering twice replaces. */
export function setRouteRateLimitPolicy(
  opId: string,
  policy: RouteRateLimitPolicy,
): void {
  ROUTE_POLICIES.set(opId, policy);
}

/** The op a request should be charged under — its own, unless a mount says otherwise. */
export function rateLimitOpIdFor(opId: string, body: unknown): string {
  const policy = ROUTE_POLICIES.get(opId);
  return policy ? policy(body) : opId;
}

/** Test seam: forget every registered policy. */
export function clearRouteRateLimitPolicies(): void {
  ROUTE_POLICIES.clear();
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
  // Ordinary first-party operations. Password ceremonies have dedicated
  // overrides and domain admission regardless of the request's identity.
  "session-only": { windowMs: MINUTE, max: 300 },
  public: { windowMs: MINUTE, max: 600 },
};

/**
 * A preview draws on its own bucket, three times as wide as the write budget it
 * previews (w23/m26). The recommended agent flow is preview, then commit, so
 * sharing one bucket halved a credential's write throughput; a preview does
 * the same authorization and bean-check projection but never commits, so it is
 * cheaper than the write it stands for, though not free.
 */
export const PREVIEW_BUDGET_MULTIPLIER = 3;

/**
 * Whether a request body or argument object asks for a preview: a boolean
 * `true` on the `dry_run` spelling or its `dryRun` twin. Strictly `=== true`,
 * the only value every surface's handler also reads as a preview, so a value
 * the handler would ignore (a string, `1`) cannot earn the wider bucket while
 * the write goes through. A conflicting pair is refused by the handler before
 * it does any work.
 */
export function isPreviewRequest(args: unknown): boolean {
  if (args === null || typeof args !== "object") return false;
  const { dry_run: snake, dryRun: camel } = args as Record<string, unknown>;
  return snake === true || camel === true;
}

/**
 * Per-op overrides, for the handful of ops whose cost is not their class's.
 *
 * The first two are the budgets `GraphQLRateLimiter` enforced per-resolver
 * before this existed; they are kept because they were chosen deliberately, and
 * they live here so that "which ops are special" is one list rather than a
 * property of whichever resolver remembered to construct a limiter.
 */
export const OP_BUDGETS: Record<string, Budget> = {
  "GQL Mutation.signIn": { windowMs: MINUTE, max: 60 },
  // The MCP endpoint is a *transport*, not an operation: one agent session is
  // dozens of JSON-RPC POSTs to this one path, and almost all of them are
  // reads. Unclassified it fell to the write-class default, so a session of
  // ~57 mostly-read calls hit 429 and the SDK client threw out of the session
  // (w2/m28). The work each call actually performs is metered a level in, by
  // the per-tool and per-resource budgets `gateMcpCall` charges.
  [MCP_TRANSPORT_OP_ID]: { windowMs: MINUTE, max: 300 },
  // Protocol ceremony a client must perform before it can do anything, so it
  // is not the caller's work and should not eat the session's allowance
  // (w2/m28). But it is not free either: a generous separate bucket still
  // bounds a client that only ever posts `{"method":"ping"}` (w2/014).
  [MCP_HANDSHAKE_OP_ID]: { windowMs: MINUTE, max: 1200 },
  "GQL Mutation.generateTempAssetUploadUrl": { windowMs: MINUTE, max: 10 },
  "GQL Query.getUserByExactMatch": { windowMs: MINUTE, max: 20 },
  // Minting a durable credential is rare by nature, and a flood of attempts is
  // more likely to be a loop than a user.
  "GQL Mutation.createApiKey": { windowMs: MINUTE, max: 5 },
  "REST POST /api-gateway/v1/api-keys": { windowMs: MINUTE, max: 5 },
  // Introspection is admin-classed for audit and credential-ceiling purposes,
  // but the admin budget is built for operations that *change* a credential,
  // and 30/minute would make the endpoint useless to the validator it exists
  // for. It does not get the full read budget either: every call is a lookup
  // against the credential stores.
  //
  // A flood buys an attacker nothing it does not already hold — ADR 0017 D2
  // confines every answer to the caller's own credentials, so this cannot be
  // used to probe somebody else's token. The budget is about load, not secrecy.
  "GQL Query.introspectToken": { windowMs: MINUTE, max: 120 },
  "REST POST /api-gateway/v1/token/introspect": { windowMs: MINUTE, max: 120 },
  // Archive generation and transfer are substantially more expensive than a
  // normal metadata read. The canonical and compatibility routes share one
  // counter (see `operationBucket`) so changing URL cannot double this budget.
  "REST GET /api-gateway/v1/ledgers/{owner}/{name}/archive/{archive}":
    ARCHIVE_DOWNLOAD_BUDGET,
  "REST GET /api-gateway/ledgers/{ledgerId}/archive/{archive}":
    ARCHIVE_DOWNLOAD_BUDGET,
  "REST GET /api-gateway/mcp/archive/{owner}/{name}/{archive}":
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
  "GQL Query.previewPlanChange": CLASS_BUDGETS["session-only"],
  "GQL Mutation.changePlan": CLASS_BUDGETS["session-only"],
  "GQL Mutation.cancelScheduledPlanChange": CLASS_BUDGETS["session-only"],
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
  "device-poll": { windowMs: MINUTE, max: 120 },
  default: { windowMs: MINUTE, max: 120 },
};

/** Which anonymous family a path belongs to. */
export function anonymousFamily(path: string): keyof typeof ANONYMOUS_BUDGETS {
  // @koa/router accepts static path case variants and one trailing slash.
  // Family classification must agree or those aliases earn another budget.
  path = path.toLowerCase().replace(/\/$/, "");
  if (/^\/api-gateway\/v1\/cli-sessions\/[^/]+$/.test(path))
    return "device-poll";
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
 * Every authenticated caller spends the user's total, plus a credential
 * sub-budget when it has one. Revocation and successful authentication never
 * clear request volume; replacing a credential cannot buy a fresh allowance.
 */
function subjectKeys(identity: Identity | undefined, ip: string): string[] {
  if (!identity) return [`ip:${ip}`];
  const keys = [`usr:${identity.userId}`];
  if (identity.tokenId) keys.push(`tok:${identity.tokenId}`);
  return keys;
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

type Shadow = { count: number; remoteCount: number; expiresAt: number };
const MAX_SHADOWS = 10_000;
const SHADOW_SWEEP_MS = 1_000;
const shadows = new Map<string, Shadow>();
let sweepAfter = 0;
let earliestExpiry = Infinity;

/** Test seam: a fresh process has no local request history. */
export function clearRateLimitShadows(): void {
  shadows.clear();
  sweepAfter = 0;
  earliestExpiry = Infinity;
}

function precharge(keys: readonly string[], budget: Budget, now: number) {
  // Request-driven and amortized: a saturated map is not scanned for each new
  // attacker-controlled subject. Live entries are never evicted to make room.
  if (now >= sweepAfter) {
    earliestExpiry = Infinity;
    for (const [key, shadow] of shadows) {
      if (shadow.expiresAt <= now) shadows.delete(key);
      else earliestExpiry = Math.min(earliestExpiry, shadow.expiresAt);
    }
    sweepAfter = now + SHADOW_SWEEP_MS;
  }
  for (const key of keys) {
    const shadow = shadows.get(key);
    if (shadow && shadow.expiresAt <= now) shadows.delete(key);
  }
  const attempts = [];
  for (const key of keys) {
    let shadow = shadows.get(key);
    if (!shadow) {
      if (shadows.size >= MAX_SHADOWS) return undefined;
      shadow = { count: 0, remoteCount: 0, expiresAt: now + budget.windowMs };
      shadows.set(key, shadow);
      earliestExpiry = Math.min(earliestExpiry, shadow.expiresAt);
    }
    // Saturate numeric state too; rejected traffic cannot grow it forever.
    shadow.count = Math.min(budget.max + 1, shadow.count + 1);
    attempts.push({ key, shadow, count: shadow.count });
    // The user total is first. Once spent, rotating credentials must not
    // allocate thousands of fresh sub-budgets or evict other users from RAM.
    if (shadow.count > budget.max) break;
  }
  return attempts;
}

async function charge(
  keys: readonly string[],
  budget: Budget,
): Promise<RateLimitDecision> {
  const now = Date.now();
  // This is synchronous before the first Redis await. Concurrent requests and
  // an outage/recovery transition cannot all start with an empty local quota.
  const attempts = precharge(keys, budget, now);
  if (!attempts) {
    return {
      allowed: false,
      count: budget.max + 1,
      budget,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(Math.min(budget.windowMs, earliestExpiry - now) / 1000),
      ),
    };
  }
  const results = await Promise.all(
    attempts.map(async ({ key, shadow, count }) => {
      const result =
        count > budget.max
          ? undefined
          : await incrementInWindow(key, budget.windowMs);
      // A delayed reply belongs only to the generation it charged. Never extend
      // that generation's fixed deadline: ordinary traffic must eventually reset
      // it even when Redis's windows and this process's first request differ.
      if (
        result &&
        shadows.get(key) === shadow &&
        shadow.expiresAt > Date.now()
      ) {
        shadow.remoteCount = Math.min(
          budget.max + 1,
          Math.max(shadow.remoteCount, result.count),
        );
        shadow.count = Math.min(
          budget.max + 1,
          Math.max(shadow.count, result.count),
        );
      }
      return {
        count: Math.max(count, shadow.remoteCount, result?.count ?? 0),
        resetInMs: Math.max(
          1,
          shadow.expiresAt - Date.now(),
          result?.resetInMs ?? 0,
        ),
      };
    }),
  );
  return {
    allowed: results.every((result) => result.count <= budget.max),
    count: Math.max(...results.map((result) => result.count)),
    budget,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil(Math.max(...results.map((result) => result.resetInMs)) / 1000),
    ),
  };
}

/**
 * Charge independent user and credential budgets for this operation. Local
 * history is charged even while Redis is healthy, and merged conservatively
 * on recovery so unpersisted requests cannot receive a second allowance.
 */
export async function consume(args: {
  opId: string;
  identity?: Identity;
  ip: string;
  /** The request asks for a preview ({@link isPreviewRequest}); only a write op earns the preview bucket. */
  preview?: boolean;
}): Promise<RateLimitDecision> {
  // One classification per request; budget and bucket both derive from it.
  const classification = classifyOp(args.opId);
  const commit = budgetFor(args.opId, classification);
  const preview = args.preview === true && classification.class === "write";
  const budget: Budget = preview
    ? { ...commit, max: commit.max * PREVIEW_BUDGET_MULTIPLIER }
    : commit;
  const bucket = `${operationBucket(args.opId, classification)}${preview ? "#preview" : ""}`;
  return charge(
    subjectKeys(args.identity, args.ip).map(
      (subject) => `ratelimit:${subject}:${bucket}`,
    ),
    budget,
  );
}

/** Charge an anonymous request against its intake family's IP budget. */
export async function consumeAnonymous(args: {
  path: string;
  ip: string;
}): Promise<RateLimitDecision> {
  const family = anonymousFamily(args.path);
  const budget = ANONYMOUS_BUDGETS[family];
  return charge([`ratelimit:anon:${family}:${args.ip}`], budget);
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
  preview?: boolean;
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

  throw new RateLimitedError(decision.retryAfterSeconds);
}
