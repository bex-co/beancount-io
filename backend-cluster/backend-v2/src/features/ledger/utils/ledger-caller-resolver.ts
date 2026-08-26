import { parseLedgerId } from "@/shared/str";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { NotFoundError, UnauthenticatedError } from "@/shared/errors";

export interface ResolveLedgerCallerDeps {
  favaClientFactory: IFavaClientFactory;
}

/**
 * Resolves an *anonymous* REST request against a ledger endpoint.
 *
 * - Public ledger: returns null — anonymous access is allowed, and downstream
 *   runs with no credential at all.
 * - Private ledger: throws `UnauthenticatedError`.
 *
 * Authenticated callers never reach this helper: they resolve through
 * `resolveIdentity` + `authorizeLedger` upstream. There is deliberately no
 * token parameter — this route family once accepted `?token=<JWT>`, which put
 * a long-lived credential into every URL it touched; the single-use ticket
 * flow (`v1/archive-handler.ts`) is the replacement for link-shaped downloads.
 */
export async function resolveLedgerCaller(
  ledgerId: string,
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

  throw new UnauthenticatedError(
    "Unauthorized - credentials required for a private ledger",
  );
}
