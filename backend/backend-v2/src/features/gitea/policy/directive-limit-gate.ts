import type { FavaApiClient } from "@/foundation/fava";
import { logger } from "@/shared/logger";
import {
  lookupDirectiveLimit,
  type DirectiveLimitLookupDeps,
} from "@/features/ledger/operations/directive-limit-lookup";

const gateLogger = logger.child({ module: "directive-limit-gate" });

/**
 * How long the count may take before the gate gives up and fails open.
 *
 * This call sits on the push path and is awaited before anything is forwarded,
 * so its timeout is the worst case a push can stall for. `ApiClient` defaults to
 * 30s, which is the wrong order of magnitude here: measured on real ledgers the
 * endpoint answers in 64–377 ms (377 ms was a 1509-directive ledger on a cold
 * cache; warm is ~65 ms). Five seconds is a wide margin over that and still
 * bounds the damage from a hung ledger-v2 to something a user reads as slow
 * rather than broken — and, on SSH, bounds how much of the pack piles up in
 * memory while the client streams it without waiting.
 */
export const GATE_TIMEOUT_MS = 5_000;

/** Which git transport a push arrived on. Only used to label logs. */
export type GitTransport = "ssh" | "https";

export interface DirectiveLimitGateDeps extends DirectiveLimitLookupDeps {
  /**
   * A ledger-v2 client authenticated as the pushing user. The proxies have just
   * translated that user's credentials in order to talk to Gitea, so forwarding
   * the same identity keeps ledger-v2's view of who is asking identical to
   * Gitea's — the credential rule ADR 0004 set for the proxy.
   */
  ledgerClient: FavaApiClient;
}

/**
 * What the gate concluded about a ledger.
 *
 * `unknown` is not an error case to be handled at the call site — it is the
 * fail-open answer, and callers must treat it as "allow".
 */
export type DirectiveLimitVerdict =
  | { decision: "over"; count: number; limit: number }
  | { decision: "under"; count: number; limit: number }
  | { decision: "unlimited" }
  | { decision: "unknown"; reason: string };

/**
 * `GET /ledgers/{owner}/{repo}/directive-count` on ledger-v2 (w1/m17 t001).
 *
 * Hand-written rather than generated: `idl/beancount-ledger.openapi.json` is
 * exported from the Python service ledger-v2 replaces, so it cannot describe an
 * endpoint only ledger-v2 has. It still goes through the generated client's
 * `request`, so the timeout and the error translation are the shared ones —
 * only the path is local. Fold it into `Api.ts` once ledger-v2 becomes the spec
 * source and delete this.
 */
async function fetchDirectiveCount(
  client: FavaApiClient,
  owner: string,
  repo: string,
): Promise<number> {
  const response = await client.request<
    { success: true; data: { count: number; sha: string | null } },
    unknown
  >({
    // Encoded even though `parseGitRepoPath` and `parseGitExecCommand` both
    // reject anything outside `[A-Za-z0-9][A-Za-z0-9._-]*` today: this function
    // takes plain strings, and the next caller may not come from either parser.
    path: `/ledgers/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/directive-count`,
    method: "GET",
    format: "json",
  });
  const count = response.data?.data?.count;
  if (typeof count !== "number") {
    throw new Error("directive-count returned no count");
  }
  return count;
}

/**
 * Why a check failed, in a form the observation window can group on.
 *
 * The status matters more than the message: `FavaApiError` flattens a refused
 * connection to "Unknown API error", so without it a ledger-v2 outage and a
 * ledger that fails to parse read as the same line.
 */
function describe(err: unknown): string {
  const e = err as { message?: string; status?: number };
  const message = e?.message ?? String(err);
  return e?.status ? `${message} (${e.status})` : message;
}

/**
 * Is this ledger **currently** over its owner's directive limit?
 *
 * Deliberately not "will this push take it over": answering that needs the
 * pushed objects, and a thin pack carries no object store the proxy could read
 * (ADR 0001 Finding 3). Asking the smaller question sidesteps that at the cost
 * of atomicity — one push may cross the threshold and land, and the next is
 * refused (ADR 0005).
 *
 * **Every failure returns `unknown`, which means allow.** Not a preference:
 * once the pre-receive hook is gone, the app write path is an over-limit user's
 * only way back under the limit, so a check that failed closed would lock git
 * push and the shrinking write at the same moment — including locking a user
 * out of fixing a syntax error in their own ledger. Both ingresses share this
 * one rule so they cannot drift apart on it.
 */
export async function evaluateDirectiveLimit(
  deps: DirectiveLimitGateDeps,
  owner: string,
  repo: string,
): Promise<DirectiveLimitVerdict> {
  let limit: number;
  try {
    ({ maxDirectives: limit } = await lookupDirectiveLimit(deps, owner));
  } catch (err) {
    return { decision: "unknown", reason: `limit: ${describe(err)}` };
  }

  // Premium. Skip the count — it costs a Gitea read and a ledger parse to
  // answer a question whose answer cannot change the outcome.
  if (limit < 0) return { decision: "unlimited" };

  let count: number;
  try {
    count = await fetchDirectiveCount(deps.ledgerClient, owner, repo);
  } catch (err) {
    return { decision: "unknown", reason: `count: ${describe(err)}` };
  }

  return { decision: count > limit ? "over" : "under", count, limit };
}

/**
 * What an over-limit user is told, on either transport.
 *
 * Three things have to be in it, and the third is the one that is easy to get
 * wrong:
 *
 * 1. **What happened** — the ledger is over, with the numbers, so it does not
 *    read as an outage.
 * 2. **How to get out** — and the way out has *moved*. The pre-receive hook
 *    refused only a push that made an over-limit ledger bigger, so a user could
 *    push a smaller version. The proxy cannot tell whether a push shrinks the
 *    ledger, because the push has not landed and a thin pack carries no object
 *    store (ADR 0001 Finding 3). So git push is locked outright and the way back
 *    under is to delete entries in the dashboard, which still works because the
 *    app write path *can* compute the resulting count.
 * 3. **The upgrade path**, for the users for whom deleting is not the answer.
 *
 * The wording is deliberately unlike the hook's
 * `ERROR: Push rejected — free-tier directive limit exceeded.` — that difference
 * is the proof in t012 and t013 that the enforcement point actually moved, the
 * same way `only refs/heads/main may be pushed` proved it for w1/m13.
 *
 * Kept to one line per ref because `report-status` renders it beside the ref
 * name; the fuller version goes to the sideband, where both transports show it.
 */
export function directiveLimitRefusal(count: number, limit: number): string {
  return `over the ${limit}-directive limit (${count} now) — delete entries in the dashboard to push again`;
}

/**
 * The unhurried version, for the progress sideband where there is room to say
 * what to do next rather than only what went wrong.
 */
export function directiveLimitExplanation(
  count: number,
  limit: number,
): string {
  return [
    `This ledger has ${count} directives, over the ${limit} the free plan allows.`,
    "",
    "Pushing is paused until it is back under the limit. Deleting entries in the",
    "dashboard still works and is the way to get there — that path can tell what",
    "the ledger would become, and this one cannot.",
    "",
    "If the ledger should keep growing, upgrading removes the limit entirely.",
    "",
  ].join("\n");
}

/**
 * What `enforce-directive-limit.sh` did, read out of Gitea's receive-pack
 * response.
 *
 * The hook is inside Gitea, past the proxy, so the response is the only place
 * its verdict is visible. Its three fail-open messages all begin
 * `WARNING: directive limit check`, and its refusal is a fixed sentence, so a
 * substring search over the response bytes identifies it without parsing the
 * sideband framing.
 */
export type HookSignal =
  | "refused-by-limit"
  | "fail-open"
  | "refused-other"
  | "allowed";

/** Substrings short enough that sideband framing is unlikely to split them. */
const HOOK_REFUSAL = "free-tier directive limit exceeded";
const HOOK_FAIL_OPEN = "directive limit check";
const ANY_REFUSAL = "ng refs/";

export function scanHookSignal(response: Buffer): HookSignal {
  const text = response.toString("binary");
  if (text.includes(HOOK_REFUSAL)) return "refused-by-limit";
  if (text.includes(HOOK_FAIL_OPEN)) return "fail-open";
  if (text.includes(ANY_REFUSAL)) return "refused-other";
  return "allowed";
}

/**
 * Collects the head of a receive-pack response so it can be scanned, without
 * getting between the response and the client: chunks are observed on their way
 * past, never held.
 *
 * A push's response is report-status plus whatever the hooks printed — kilobytes
 * — but the cap means a hook that decides to print a megabyte cannot turn an
 * observation into a memory problem.
 */
export class HookResponseScanner {
  static readonly MAX_BYTES = 64 * 1024;
  private head: Buffer[] = [];
  private size = 0;

  observe(chunk: Buffer): void {
    if (this.size >= HookResponseScanner.MAX_BYTES) return;
    this.head.push(chunk);
    this.size += chunk.length;
  }

  signal(): HookSignal {
    return scanHookSignal(Buffer.concat(this.head));
  }
}

/**
 * Which of the expected disagreements this push is, if any.
 *
 * The observation window's question is not "do the two agree" — two
 * disagreements are designed in and will never go away (ADR 0005):
 *
 * - **boundary-crossing** — the ledger was under the limit, so the proxy allows;
 *   the push takes it over, so the hook refuses. This is the price of asking
 *   "is it currently over" instead of "will this take it over", and counting
 *   these measures that price.
 * - **over-limit-shrinking** — the ledger is over, so the proxy refuses; the
 *   hook allows it because the push does not *grow* the ledger. Counting these
 *   says how many people use the escape hatch, and so how prominent t007's
 *   message must be. The name is ADR 0005's; note the hook's actual predicate is
 *   `new <= old`, not `new < old` as the ADR's table says, so a push that leaves
 *   the count unchanged (a comment, a rename) lands in this class too. That
 *   inflates the class above the number of people genuinely shrinking a ledger —
 *   worth remembering when reading the frequency in t006.
 *
 * `unclassified` is the only result that means something is wrong with the
 * model, so it is the one that is logged loudly.
 */
export type PushClass =
  | "agree"
  | "boundary-crossing"
  | "over-limit-shrinking"
  | "hook-fail-open"
  | "proxy-fail-open"
  | "not-applicable"
  | "unclassified";

export function classifyPush(
  verdict: DirectiveLimitVerdict,
  signal: HookSignal,
): PushClass {
  // Our own gate gave no verdict, so there is nothing to compare. Not a
  // disagreement class — a gap in the observation, and worth its own label so
  // it cannot be mistaken for agreement.
  if (verdict.decision === "unknown") return "proxy-fail-open";

  // The hook let a push through without deciding. Whatever we concluded, the
  // two were not answering the same question.
  if (signal === "fail-open") return "hook-fail-open";

  // Refused, but not over the limit — a non-fast-forward, say. Nothing to do
  // with the policy either side is enforcing.
  if (signal === "refused-other") return "not-applicable";

  // Premium, or a live mobile bypass ticket. The hook reads the same ticket
  // through the same lookup, so it refusing here means the two disagree about
  // who is exempt — the fourth class this window exists to rule out.
  if (verdict.decision === "unlimited") {
    return signal === "allowed" ? "agree" : "unclassified";
  }

  if (verdict.decision === "over") {
    return signal === "refused-by-limit" ? "agree" : "over-limit-shrinking";
  }
  return signal === "refused-by-limit" ? "boundary-crossing" : "agree";
}

/**
 * One line per push, carrying both verdicts and the class.
 *
 * Deliberately self-contained: a line can be classified and counted without
 * joining it back to the push it came from, so the two frequencies that decide
 * how much the atomicity trade costs are a grep away.
 */
export function logPushObservation(
  verdict: DirectiveLimitVerdict,
  signal: HookSignal,
  where: { owner: string; repo: string; transport: GitTransport },
): void {
  const pushClass = classifyPush(verdict, signal);
  const line = {
    ...where,
    shadow: true,
    class: pushClass,
    proxy: verdict.decision,
    hook: signal,
    ...("count" in verdict
      ? { count: verdict.count, limit: verdict.limit }
      : {}),
    ...(verdict.decision === "unknown" ? { reason: verdict.reason } : {}),
  };

  if (pushClass === "unclassified") {
    // The only outcome the three known classes do not explain, and the only
    // reason to keep watching. Loud on purpose.
    gateLogger.error("directive limit: UNCLASSIFIED disagreement", line);
    return;
  }
  if (pushClass === "agree" || pushClass === "not-applicable") {
    gateLogger.debug("directive limit: push observed", line);
    return;
  }
  gateLogger.info("directive limit: push observed", line);
}
