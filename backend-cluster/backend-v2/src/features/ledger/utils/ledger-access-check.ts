import { unwrapFavaResponse } from "@/foundation/fava";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IModels } from "@/foundation/models/types";
import type { DbExecutor } from "@/drizzle/drizzle";
import { parseLedgerId } from "@/shared/str";
import { ForbiddenError } from "@/shared/errors";
import { logger } from "@/shared/logger";

const accessLogger = logger.child({ module: "ledger-access-check" });

export interface AssertLedgerAccessDeps {
  models: Pick<IModels, "user">;
  db: DbExecutor;
  favaClientFactory: IFavaClientFactory;
}

/** The closed vocabulary of ledger permissions this service understands. */
export type LedgerPermission = "read" | "write" | "admin";

const LEDGER_PERMISSIONS: readonly string[] = ["read", "write", "admin"];

/**
 * The ledger service hands Gitea's permission string back verbatim (typed
 * `string | null`), and Gitea's vocabulary is wider than ours: a caller with no
 * access to the repo gets a 200 carrying `"none"`, not an error. Casting that
 * straight to `LedgerPermission` would make it outrank every rel, so anything
 * outside the three levels we understand is treated as no collaborator grant
 * at all and falls through to the public-visibility check.
 */
export function asLedgerPermission(
  value: string | null | undefined,
): LedgerPermission | null {
  return typeof value === "string" && LEDGER_PERMISSIONS.includes(value)
    ? (value as LedgerPermission)
    : null;
}

/**
 * `userId` is optional so this one function also serves anonymous callers —
 * the read-only, non-private-ledger access that `FavaClientFactory
 * .getPublicApiClient` has always granted implicitly when no user id is
 * given. Every existing caller passes a real userId, so their code path
 * (owner check, then collaborator lookup, then the public-ledger fallback)
 * is unchanged; `userId === undefined` only adds a new branch that skips
 * straight to that same public-ledger fallback.
 */
export async function assertLedgerAccess(
  ledgerId: string,
  userId: string | undefined,
  deps: AssertLedgerAccessDeps,
): Promise<{
  permission: LedgerPermission;
  ledgerOwnerId: string;
  ledgerRepoId: number;
}> {
  let ledgerOwner: string;
  let ledgerName: string;
  try {
    ({ ledgerOwner, ledgerName } = parseLedgerId(ledgerId));
  } catch {
    accessLogger.warn("Access denied", {
      reason: "invalid_ledger_id",
      ledgerId,
    });
    throw new ForbiddenError("Forbidden - invalid ledger ID");
  }

  const ledgerOwnerUser = await deps.models.user.getUserByUsername(
    deps.db,
    ledgerOwner,
  );

  if (!ledgerOwnerUser) {
    accessLogger.warn("Access denied", {
      reason: "ledger_owner_not_found",
      ledgerId,
    });
    throw new ForbiddenError("Forbidden - ledger owner does not exist");
  }

  const ledgerOwnerId = ledgerOwnerUser.id;

  // Fetched once, up front, so every permission branch below (admin,
  // collaborator, public) can return the numeric ledgerRepoId.
  const adminClient = deps.favaClientFactory.getAdminClient();
  const ledgerData = await unwrapFavaResponse(
    adminClient.ledgers.getLedger(ledgerOwner, ledgerName),
    "fetch ledger detail",
    () =>
      new ForbiddenError("Forbidden - you do not have access to this ledger"),
  );
  const ledgerRepoId = ledgerData.id;

  if (userId !== undefined && ledgerOwnerUser.id === userId) {
    return { permission: "admin", ledgerOwnerId, ledgerRepoId };
  }

  // Anonymous callers skip the owner/collaborator checks entirely — there is
  // no identity to look up — and fall straight to the public-ledger check
  // below, same as an authenticated non-collaborator would.
  if (userId !== undefined) {
    const requestingUser = await deps.models.user.getById(deps.db, userId);
    if (!requestingUser) {
      accessLogger.warn("Access denied", {
        reason: "not_authorized",
        ledgerId,
      });
      throw new ForbiddenError(
        "Forbidden - you do not have access to this ledger",
      );
    }

    const { favaApiClient } =
      await deps.favaClientFactory.getApiContext(userId);
    let collaboratorPermission: LedgerPermission | null = null;

    try {
      const data = await unwrapFavaResponse(
        favaApiClient.collaborators.getLedgerCollaboratorPermission(
          ledgerOwner,
          ledgerName,
          requestingUser.ledger_username,
        ),
        "check collaborator permission",
        () =>
          new ForbiddenError(
            "Forbidden - you do not have access to this ledger",
          ),
      );
      collaboratorPermission = asLedgerPermission(data?.permission);
    } catch (error) {
      accessLogger.warn(
        "Failed to fetch collaborator permission, falling back to visibility check",
        {
          ledgerId,
          error,
        },
      );
    }

    if (collaboratorPermission) {
      return {
        permission: collaboratorPermission,
        ledgerOwnerId,
        ledgerRepoId,
      };
    }
  }

  // Not a collaborator (or no identity at all) — check if the ledger is public
  if (!ledgerData.private) {
    return { permission: "read", ledgerOwnerId, ledgerRepoId };
  }

  accessLogger.warn("Access denied", { reason: "not_authorized", ledgerId });
  throw new ForbiddenError("Forbidden - you do not have access to this ledger");
}
