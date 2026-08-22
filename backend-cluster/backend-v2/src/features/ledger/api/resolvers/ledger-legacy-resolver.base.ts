import { InternalServerError } from "@/shared/errors";
import { unwrapFavaResponse } from "@/foundation/fava";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";

export abstract class BaseLedgerResolver {
  constructor(protected readonly favaClientFactory: IFavaClientFactory) {}

  protected async getDefaultLedgerId(
    userId: string,
    ledgerId?: string | null,
  ): Promise<string> {
    if (ledgerId) {
      return ledgerId;
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
