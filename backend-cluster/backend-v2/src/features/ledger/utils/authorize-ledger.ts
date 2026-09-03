import type { Identity } from "@/server/api/identity";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import {
  anonymousPrincipal,
  ledgerResource,
  type AuthorizationAction,
} from "@/server/api/authorization/authorization-contract";
import type { IAuthorizationService } from "@/server/api/authorization";

export type AuthorizeLedgerDeps = { authorization: IAuthorizationService };

/**
 * Thin PEP used by ledger-content services. The shared PDP catalog and
 * source-backed relationship evaluator are the only final authority; this
 * helper contains no relationship policy and no decision memo.
 *
 * An omitted identity becomes the module-issued anonymous principal used for
 * public-ledger reads; the action catalog decides whether it is permitted.
 */
export async function authorizeLedger(
  identity: Identity | undefined,
  ledgerId: string,
  action: AuthorizationAction,
  deps: AuthorizeLedgerDeps,
): Promise<void> {
  await deps.authorization.authorizeOrThrow({
    principal: identity ?? anonymousPrincipal(),
    action,
    resource: ledgerResource(ledgerId),
  });
}

/** Base for ledger services that share a Fava factory and PDP dependency. */
export abstract class AuthorizedLedgerService {
  protected readonly authDeps: AuthorizeLedgerDeps;

  constructor(
    protected readonly favaClientFactory: IFavaClientFactory,
    authorization: IAuthorizationService,
  ) {
    this.authDeps = { authorization };
  }
}
