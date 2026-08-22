import { parseLedgerId } from "@/shared/str";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IModels } from "@/foundation/models/types";
import type { DbExecutor } from "@/drizzle/drizzle";
import {
  NotFoundError,
  UnauthenticatedError,
  ForbiddenError,
} from "@/shared/errors";

export interface ResolveLedgerCallerDeps {
  favaClientFactory: IFavaClientFactory;
  models: Pick<IModels, "jwt">;
  db: DbExecutor;
}

/**
 * Resolves who is making a REST request to a ledger endpoint.
 *
 * - Public ledger: no token required, returns null (anonymous access allowed).
 * - Private ledger: requires a valid JWT and confirms the user can read the
 *   ledger via the Fava API. Returns the verified userId.
 *
 * The token must be extracted and provided by the caller (e.g. from
 * ctx.query.token or the Authorization header).
 */
export async function resolveLedgerCaller(
  ledgerId: string,
  token: string | undefined,
  deps: ResolveLedgerCallerDeps,
): Promise<string | null> {
  const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);

  const adminClient = deps.favaClientFactory.getAdminClient();
  const ledgerResponse = await adminClient.ledgers.getLedger(
    ledgerOwner,
    ledgerName,
  );

  if (!ledgerResponse.data?.success) {
    throw new NotFoundError("Ledger", ledgerId);
  }

  if (!ledgerResponse.data.data.private) {
    return null; // public ledger — no auth required
  }

  if (!token) {
    throw new UnauthenticatedError("Unauthorized - no token provided");
  }

  const userId = await deps.models.jwt.verify(deps.db, token);
  if (!userId) {
    throw new UnauthenticatedError("Invalid or expired token");
  }

  const { favaApiClient } = await deps.favaClientFactory.getApiContext(userId);
  const accessResponse = await favaApiClient.ledgers.getLedger(
    ledgerOwner,
    ledgerName,
  );
  if (!accessResponse.data?.success) {
    throw new ForbiddenError("Access denied");
  }

  return userId;
}
