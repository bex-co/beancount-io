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
import { parsePostingAmount } from "./legacy-posting-amount";

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
  /** Retry key: the same id and request return the first result (w3/m61). */
  requestId?: string | null;
}
export interface ILegacyEntryWorkflow {
  addEntries(
    input: LegacyEntryCommand,
  ): Promise<{ data: string; success: boolean }>;
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
      false,
      false,
      input.requestId,
    );
    return { data: "", success: true };
  }
}
