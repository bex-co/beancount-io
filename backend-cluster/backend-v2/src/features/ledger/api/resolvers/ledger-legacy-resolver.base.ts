import { InternalServerError } from "@/shared/errors";
import { unwrapFavaResponse } from "@/foundation/fava";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { Identity } from "@/server/api/identity";
import { assertLedgerScope } from "@/features/ledger/utils/authorize-ledger";

export abstract class BaseLedgerResolver {
  constructor(protected readonly favaClientFactory: IFavaClientFactory) {}

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
    identity: Identity | undefined,
    userId: string,
    ledgerId?: string | null,
  ): Promise<string> {
    if (ledgerId) {
      // Belt and braces: every caller reaches this through a field whose
      // `ledgerId` argument the pin middleware already checked. Re-asserting
      // costs a string compare and keeps this helper correct on its own terms.
      assertLedgerScope(identity, ledgerId);
      return ledgerId;
    }
    if (identity?.ledgerScope) {
      return identity.ledgerScope;
    }
    const { favaApiClient } =
      await this.favaClientFactory.getApiContext(userId);
    const ledgers = await unwrapFavaResponse(
      favaApiClient.ledgers.listLedgers(),
      "get find out the ledgers",
    );
    if (!ledgers || ledgers.length === 0) {
      throw new InternalServerError("Failed to get the default ledger");
    }
    const fullName = ledgers[0].full_name;
    if (!fullName) {
      throw new InternalServerError("Failed to get the default ledger");
    }
    return fullName;
  }
}
