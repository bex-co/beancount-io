import {
  assertIdentityCapability,
  identityAllowsLedgerScope,
  type Identity,
} from "@/server/api/identity";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { ForbiddenError } from "@/shared/errors";
import {
  anonymousPrincipal,
  ledgerResource,
  type AuthorizationAction,
} from "@/server/api/authorization/authorization-contract";
import type { IAuthorizationService } from "@/server/api/authorization";

/** The access level a single-ledger verb requires. */
export type LedgerRel = "read" | "write" | "admin";

export type AuthorizeLedgerDeps = { authorization: IAuthorizationService };

/** Legacy pin assertion retained for operations not yet routed to the PDP. */
export function assertLedgerScope(
  identity: Identity | undefined,
  ledgerId: string,
): void {
  if (!identityAllowsLedgerScope(identity, ledgerId)) {
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
 * Compatibility-named thin PEP used by ledger-content services. The shared
 * PDP catalog and source-backed relationship evaluator are the only final
 * authority; this helper contains no relationship policy and no decision memo.
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
