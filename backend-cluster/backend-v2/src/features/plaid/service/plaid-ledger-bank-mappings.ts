import type { DbExecutor } from "@/drizzle/drizzle";
import { unwrapFavaResponse } from "@/foundation/fava";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { Identity } from "@/server/api/identity";
import { parseLedgerId } from "@/shared/str";
import type { IModels } from "@/foundation/models/types";
import type {
  ILedgerBankMappings,
  LedgerBankMapping,
} from "@/features/ledger/workflow/account-rename-workflow.types";

/**
 * The bank-account mappings of one ledger, every member's (w1/m43/t003).
 *
 * A mapping names an account of this ledger, so a rename has to carry each
 * one along whoever connected the bank, or that member's next sync posts to
 * an account that no longer exists. The caller sees their own mappings by
 * name; another member's only as a mapping, never by its bank account name.
 */
export class PlaidLedgerBankMappings implements ILedgerBankMappings {
  constructor(
    private readonly favaClientFactory: IFavaClientFactory,
    private readonly models: Pick<IModels, "plaidItem" | "plaidAccount">,
    private readonly db: DbExecutor,
  ) {}

  async list({
    ledgerId,
    identity,
  }: {
    ledgerId: string;
    identity: Identity;
  }): Promise<LedgerBankMapping[]> {
    const client = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity.userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const { id: ledgerRepoId } = await unwrapFavaResponse(
      client.ledgers.getLedger(ledgerOwner, ledgerName),
      "get ledger",
    );
    const items = await this.models.plaidItem.getByLedgerRepoId(
      this.db,
      ledgerRepoId,
    );
    const mappings: LedgerBankMapping[] = [];
    for (const item of items) {
      const own = item.userId === identity.userId;
      const accounts = await this.models.plaidAccount.getByItemId(
        this.db,
        item.id,
      );
      for (const account of accounts) {
        if (!account.ledgerAccount) continue;
        mappings.push({
          id: account.id,
          plaidItemId: item.id,
          ledgerAccount: account.ledgerAccount,
          name: own
            ? `${item.institutionName} ${account.accountName}${account.mask ? ` ••${account.mask}` : ""}`
            : null,
        });
      }
    }
    return mappings;
  }

  async remap(changes: Omit<LedgerBankMapping, "name">[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const change of changes) {
        await this.models.plaidAccount.updateForItem(
          tx,
          change.id,
          change.plaidItemId,
          { ledgerAccount: change.ledgerAccount },
        );
      }
    });
  }
}
