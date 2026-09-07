import { InternalServerError } from "@/shared/errors";
import { unwrapFavaResponse } from "@/foundation/fava";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  ledgerResource,
  userResource,
  type AuthorizationAction,
  type IAuthorizationService,
} from "@/server/api/authorization";

/** Preserve the historical explicit-ledger, credential-pin, then first-ledger order. */
export async function resolveLegacyLedgerId(
  favaClientFactory: IFavaClientFactory,
  authorization: IAuthorizationService,
  identity: Identity,
  ledgerId?: string | null,
  contentAction?: AuthorizationAction,
): Promise<string> {
  const userId = identity.userId;
  let resolvedLedgerId = ledgerId ?? identity.ledgerScope;
  if (!resolvedLedgerId) {
    await authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_CATALOG_READ,
      resource: userResource(userId),
    });
    const { favaApiClient } = await favaClientFactory.getApiContext(userId);
    const ledgers = await unwrapFavaResponse(
      favaApiClient.ledgers.listLedgers(),
      "get find out the ledgers",
    );
    resolvedLedgerId = ledgers?.[0]?.full_name;
  }
  if (!resolvedLedgerId) {
    throw new InternalServerError("Failed to get the default ledger");
  }
  if (contentAction) {
    await authorization.authorizeOrThrow({
      principal: identity,
      action: contentAction,
      resource: ledgerResource(resolvedLedgerId),
    });
  }
  return resolvedLedgerId;
}
