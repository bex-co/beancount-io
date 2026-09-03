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

export abstract class BaseLedgerResolver {
  constructor(
    protected readonly favaClientFactory: IFavaClientFactory,
    private readonly authorization: IAuthorizationService,
  ) {}

  /**
   * Which ledger a legacy verb acts on, for a caller that may not have named
   * one.
   *
   * The pin needs its own seam here because these verbs declare `ledgerId`
   * nullable and fall back to "the account's first ledger" — a ledger no
   * argument named, which is why the argument-keyed pin middleware cannot see
   * it. A credential confined to one book would otherwise read whichever
   * ledger happened to sort first.
   *
   * For a pinned credential the pin IS the default: it is the only ledger the
   * caller may act on, so resolving to anything else could only ever produce a
   * refusal. An unpinned caller keeps the original fallback exactly.
   */
  protected async resolveLedgerId(
    identity: Identity,
    ledgerId?: string | null,
    contentAction?: AuthorizationAction,
  ): Promise<string> {
    const userId = identity.userId;
    let resolvedLedgerId = ledgerId ?? identity.ledgerScope;
    if (!resolvedLedgerId) {
      await this.authorization.authorizeOrThrow({
        principal: identity,
        action: AUTHORIZATION_ACTIONS.LEDGER_CATALOG_READ,
        resource: userResource(userId),
      });
      const { favaApiClient } =
        await this.favaClientFactory.getApiContext(userId);
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
      await this.authorization.authorizeOrThrow({
        principal: identity,
        action: contentAction,
        resource: ledgerResource(resolvedLedgerId),
      });
    }
    return resolvedLedgerId;
  }
}
