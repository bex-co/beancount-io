import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { Identity } from "@/server/api/identity";
import type { IAuthorizationService } from "@/server/api/authorization";
import type {
  ILedgerEntryService,
  LedgerEntryInput,
} from "../service/ledger-entry-service";
import { resolveLegacyLedgerId } from "../utils/resolve-legacy-ledger";
import { parseLedgerId } from "@/shared/str";
import { BadUserInputError } from "@/shared/errors";

export interface LegacyEntryInput {
  type: string;
  date: string;
  flag: string;
  meta: Record<string, unknown>;
  narration: string;
  payee: string;
  postings: { account: string; amount: string }[];
}
export interface LegacyEntryCommand {
  identity: Identity;
  ledgerId?: string | null;
  entriesInput: LegacyEntryInput[];
  platform: "web" | "mobile";
}
export interface ILegacyEntryWorkflow {
  addEntries(
    input: LegacyEntryCommand,
  ): Promise<{ data: string; success: boolean }>;
}
/** Parse a legacy amount string like "11.11 EUR" into a { number, currency } pair. */
function parsePostingAmount(amount: string): {
  number: string;
  currency: string;
} {
  const amountMatch = amount.match(/^(-?[\d,.]+)\s+([A-Z]{3})$/);
  if (amountMatch) {
    const [, numberStr, currencyStr] = amountMatch;
    return { number: numberStr.replace(/,/g, ""), currency: currencyStr };
  }
  // Fallback: no currency suffix found — treat the whole string as the number.
  const stripped = amount.replace(/,/g, "");
  return {
    number: Number.isNaN(parseFloat(stripped)) ? "0" : stripped,
    currency: "USD",
  };
}

export class LegacyEntryWorkflow implements ILegacyEntryWorkflow {
  constructor(
    private readonly fava: IFavaClientFactory,
    private readonly ledgerEntry: ILedgerEntryService,
    private readonly authorization: IAuthorizationService,
  ) {}
  async addEntries(input: LegacyEntryCommand) {
    const { identity, platform } = input;
    const ledgerId = await resolveLegacyLedgerId(
      this.fava,
      this.authorization,
      identity,
      input.ledgerId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const inputs: LedgerEntryInput[] = input.entriesInput.map((entry) => {
      if (entry.type !== "Transaction") {
        throw new BadUserInputError("Invalid entry type");
      }
      return {
        type: "transaction",
        entry: {
          date: entry.date,
          flag: entry.flag,
          payee: entry.payee,
          narration: entry.narration,
          postings: entry.postings.map((posting) => ({
            account: posting.account,
            units: parsePostingAmount(posting.amount),
          })),
        },
      };
    });

    await this.ledgerEntry.addBulkEntries(
      identity,
      ledgerOwner,
      ledgerName,
      inputs,
      platform,
    );
    return { data: "", success: true };
  }
}
