import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { Identity } from "@/server/api/identity";
import type {
  AuthorizationAction,
  IAuthorizationService,
} from "@/server/api/authorization";
import { resolveLegacyLedgerId } from "@/features/ledger/utils/resolve-legacy-ledger";

export abstract class BaseLedgerResolver {
  constructor(
    protected readonly favaClientFactory: IFavaClientFactory,
    private readonly authorization: IAuthorizationService,
  ) {}

  protected resolveLedgerId(
    identity: Identity,
    ledgerId?: string | null,
    contentAction?: AuthorizationAction,
  ): Promise<string> {
    return resolveLegacyLedgerId(
      this.favaClientFactory,
      this.authorization,
      identity,
      ledgerId,
      contentAction,
    );
  }
}
