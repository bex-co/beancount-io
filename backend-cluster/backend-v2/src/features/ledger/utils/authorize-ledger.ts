import { assertIdentityCapability, type Identity } from "@/server/api/identity";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { ForbiddenError, UnauthenticatedError } from "@/shared/errors";
import {
  auditSubject,
  emitAuditEvent,
  shouldAudit,
  type AuditOutcome,
} from "@/server/api/audit";
import {
  assertLedgerAccess,
  type AssertLedgerAccessDeps,
  type LedgerPermission,
} from "./ledger-access-check";

/** The access level a single-ledger verb requires. */
export type LedgerRel = "read" | "write" | "admin";

const REL_RANK: Record<LedgerRel, number> = { read: 0, write: 1, admin: 2 };
const PERMISSION_RANK: Record<LedgerPermission, number> = {
  read: 0,
  write: 1,
  admin: 2,
};

export type AuthorizeLedgerDeps = AssertLedgerAccessDeps;

/** What a successful authorization hands the caller: enough to act, nothing more. */
export interface AuthorizedLedger {
  ledgerRepoId: number;
  ownerUserId: string;
}

/**
 * Per-request memo of `assertLedgerAccess` lookups, keyed on the `Identity`
 * object itself. `resolveIdentity` allocates a fresh `Identity` per request
 * (mcp-route.ts calls it once per incoming HTTP request; so does GraphQL's
 * `createContext`), so the WeakMap entry for one caller's identity cannot
 * outlive that request — which is exactly what makes it safe: a memo that
 * survived across requests would mean a revoked collaborator keeps their old
 * answer on the next call, the one behavior ADR 0006 D4 requires NOT happen.
 * Anonymous calls (no identity) are not memoized; there is no stable
 * per-request object to key them on, and there is only ever one ledger in
 * play for an anonymous read.
 */
const memoByIdentity = new WeakMap<
  Identity,
  Map<string, ReturnType<typeof assertLedgerAccess>>
>();

function memoizedAssertLedgerAccess(
  identity: Identity,
  ledgerId: string,
  deps: AuthorizeLedgerDeps,
): ReturnType<typeof assertLedgerAccess> {
  let forIdentity = memoByIdentity.get(identity);
  if (!forIdentity) {
    forIdentity = new Map();
    memoByIdentity.set(identity, forIdentity);
  }
  let lookup = forIdentity.get(ledgerId);
  if (!lookup) {
    lookup = assertLedgerAccess(ledgerId, identity.userId, deps);
    forIdentity.set(ledgerId, lookup);
  }
  return lookup;
}

/**
 * Reject a credential pinned to a different ledger than the one named, before
 * any database or Fava work — a scope mismatch fails cheap and never leaks
 * whether the other ledger even exists.
 *
 * This is `authorizeLedger`'s first check, factored out so callers that never
 * reach `authorizeLedger` at all can still enforce it. That gap is real: a
 * verb whose only "authorization" is building a Fava client from the caller's
 * own credentials (receipt parsing/insertion, the LLM categorization and
 * file-parse verbs) has no seam to call `authorizeLedger` from, but every one
 * of them takes a caller-supplied `ledgerId` wired to a GraphQL argument the
 * OAuth token's own scope has nothing to do with.
 *
 * Enforce it in the *service or workflow* that reads that `ledgerId`, not in
 * each resolver and tool executor: a check placed per-surface is a check the
 * next surface forgets. And enforce it with the caller's REAL `Identity` — a
 * `systemIdentity()` stand-in has no `ledgerScope` to check by construction,
 * so passing one turns this into a no-op.
 */
export function assertLedgerScope(
  identity: Identity | undefined,
  ledgerId: string,
): void {
  if (identity?.ledgerScope && identity.ledgerScope !== ledgerId) {
    throw new ForbiddenError(
      "Forbidden - this credential is not authorized for this ledger",
    );
  }
}

export function assertLedgerAuthorization(
  identity: Identity,
  ledgerId: string,
  rel: LedgerRel,
): void {
  assertIdentityCapability(identity, rel);
  assertLedgerScope(identity, ledgerId);
}

/**
 * The single seam every single-ledger service verb starts with: it authorizes
 * the caller against the ledger AND returns the ledger metadata the verb
 * needs, in one call (ADR 0006 D4). Never pair this with a second, separate
 * access check on the same resource — two independent gates make effective
 * permission their intersection, which is the exact bug this seam exists to
 * close.
 *
 * `identity` may be `undefined` (no credential presented at all); an
 * anonymous caller can still satisfy `rel: "read"` on a non-private ledger,
 * matching the access `FavaClientFactory.getPublicApiClient` has always
 * granted implicitly. Anything stronger than `read` requires a credential.
 */
export async function authorizeLedger(
  identity: Identity | undefined,
  ledgerId: string,
  rel: LedgerRel,
  deps: AuthorizeLedgerDeps,
): Promise<AuthorizedLedger> {
  try {
    if (identity) {
      assertLedgerAuthorization(identity, ledgerId, rel);
    }

    if (!identity) {
      if (rel !== "read") {
        throw new UnauthenticatedError("Authentication required");
      }
      const { permission, ledgerOwnerId, ledgerRepoId } =
        await assertLedgerAccess(ledgerId, undefined, deps);
      const authorized = authorizeRank(
        rel,
        permission,
        ledgerOwnerId,
        ledgerRepoId,
      );
      auditLedgerAccess(identity, ledgerId, rel, "allowed");
      return authorized;
    }

    const { permission, ledgerOwnerId, ledgerRepoId } =
      await memoizedAssertLedgerAccess(identity, ledgerId, deps);
    const authorized = authorizeRank(
      rel,
      permission,
      ledgerOwnerId,
      ledgerRepoId,
    );
    auditLedgerAccess(identity, ledgerId, rel, "allowed");
    return authorized;
  } catch (err) {
    // The one place a per-ledger refusal is decided, so the one place it has to
    // be recorded. Catch-audit-rethrow rather than a wrapper at each call site:
    // there are dozens of call sites and one of this function.
    auditLedgerAccess(identity, ledgerId, rel, "denied");
    throw err;
  }
}

/**
 * Record a ledger-access decision (w1/m22 t005).
 *
 * Allowed reads are skipped — they are most of the traffic, and burying the
 * interesting events under them is how an audit trail stops being read. What is
 * recorded is the ledger's name and the caller's ids: never a path, a query, or
 * anything a caller supplied.
 */
function auditLedgerAccess(
  identity: Identity | undefined,
  ledgerId: string,
  rel: LedgerRel,
  outcome: AuditOutcome,
): void {
  if (!shouldAudit(outcome, rel)) return;
  emitAuditEvent({
    op: `LEDGER ${rel}`,
    ...auditSubject(identity),
    ledgerId,
    outcome,
    at: new Date(),
  });
}

function authorizeRank(
  rel: LedgerRel,
  permission: LedgerPermission,
  ledgerOwnerId: string,
  ledgerRepoId: number,
): AuthorizedLedger {
  // Read the rank as possibly-missing even though the parameter's type says it
  // cannot be: the value originates upstream of this process, and a bare
  // `PERMISSION_RANK[permission] < REL_RANK[rel]` fails OPEN on anything the
  // record does not know — `undefined < 0` is `false`, which would authorize
  // every rel including admin. `asLedgerPermission` is the gate; this is the
  // second lock on the same door.
  const rank: number | undefined = PERMISSION_RANK[permission];
  if (rank === undefined || rank < REL_RANK[rel]) {
    throw new ForbiddenError(`Forbidden - ${rel} access required`);
  }
  return { ledgerRepoId, ownerUserId: ledgerOwnerId };
}

/**
 * Base for every ledger service whose verbs call `authorizeLedger`: wires the
 * `favaClientFactory` + `models` + `db` triple into `this.authDeps` once,
 * instead of each service repeating the identical constructor. Seven services
 * carried this verbatim before it graduated here.
 */
export abstract class AuthorizedLedgerService {
  protected readonly authDeps: AuthorizeLedgerDeps;

  constructor(
    protected readonly favaClientFactory: IFavaClientFactory,
    models: AuthorizeLedgerDeps["models"],
    db: AuthorizeLedgerDeps["db"],
  ) {
    this.authDeps = { models, db, favaClientFactory };
  }
}
