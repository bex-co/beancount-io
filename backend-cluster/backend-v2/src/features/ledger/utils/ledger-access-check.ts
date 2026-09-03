import { FavaApiError, unwrapFavaResponse } from "@/foundation/fava";
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

export interface AssertLedgerAccessOptions {
  /** Fail closed on dependency outages instead of the legacy public fallback. */
  sourceFailures?: "fallback" | "throw";
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
function asLedgerPermission(
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
  options: AssertLedgerAccessOptions = {},
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
  let ledgerData: { id: number; private: boolean };
  if (options.sourceFailures === "throw") {
    try {
      const response = await adminClient.ledgers.getLedger(
        ledgerOwner,
        ledgerName,
      );
      if (!response.data.success) {
        throw new Error("Ledger source returned an unsuccessful response");
      }
      ledgerData = response.data.data;
    } catch (error) {
      if (
        error instanceof FavaApiError &&
        error.status !== undefined &&
        [401, 403, 404].includes(error.status)
      ) {
        throw new ForbiddenError(
          "Forbidden - you do not have access to this ledger",
        );
      }
      throw error;
    }
  } else {
    ledgerData = await unwrapFavaResponse(
      adminClient.ledgers.getLedger(ledgerOwner, ledgerName),
      "fetch ledger detail",
      () =>
        new ForbiddenError("Forbidden - you do not have access to this ledger"),
    );
  }
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
      const response =
        await favaApiClient.collaborators.getLedgerCollaboratorPermission(
          ledgerOwner,
          ledgerName,
          requestingUser.ledger_username,
        );
      if (!response.data.success && options.sourceFailures === "throw") {
        throw new Error(
          "Ledger collaborator source returned an unsuccessful response",
        );
      }
      collaboratorPermission = asLedgerPermission(
        response.data.success ? response.data.data?.permission : null,
      );
    } catch (error) {
      if (
        options.sourceFailures === "throw" &&
        !(
          error instanceof FavaApiError &&
          error.status !== undefined &&
          [401, 403, 404].includes(error.status)
        )
      ) {
        throw error;
      }
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
