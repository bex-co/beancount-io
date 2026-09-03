import {
  EntryAddBulkEntriesRequest,
  Transaction,
  Commodity,
  Event,
  Price,
  Note,
  Balance,
  Open,
  Close,
  type BcioOptionsPublic,
  unwrapFavaResponse,
} from "@/foundation/fava";
import { logger } from "@/shared/logger";
import { operationNotAllowedFromCause } from "@/features/ledger/utils/operation-not-allowed-from-cause";
import { resolveEntryFile } from "@/features/ledger/utils/entry-file-resolver";
import { directiveLimitExemptParams } from "@/features/ledger/operations/directive-limit-bypass";
import type { FavaApiClient } from "@/foundation/fava";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { Identity } from "@/server/api/identity";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import type { IAuthorizationService } from "@/server/api/authorization";
import { AUTHORIZATION_ACTIONS } from "@/server/api/authorization/authorization-contract";

type AmountInput = { number: string; currency: string };

type PostingInput = {
  units: AmountInput;
  account: string;
  price?: AmountInput;
  flag?: string;
};

type TransactionInput = {
  date: string;
  flag: string;
  payee?: string;
  narration?: string;
  postings: PostingInput[];
  tags?: string[];
  links?: string[];
  meta?: Record<string, string>;
};

type CommodityInput = { date: string; currency: string };

type PriceInput = { date: string; currency: string; amount: AmountInput };

type NoteInput = { date: string; content: string; account: string };

type BalanceInput = { date: string; account: string; amount: AmountInput };

type OpenInput = { date: string; account: string; currencies: string[] };

type CloseInput = { date: string; account: string };

type DocumentInput = {
  date: string;
  account: string;
  filename: string;
  tags?: string[];
  links?: string[];
};

type EventInput = {
  date: string;
  type: string;
  description: string;
};

type BudgetInput = {
  date: string;
  account: string;
  interval: string;
  amount: AmountInput;
};

/**
 * Discriminated union of all supported entry inputs. Every variant shares the
 * uniform `{ type, entry }` shape; `type` selects how `entry` is built into a
 * Fava directive and which file it is routed to.
 */
export type LedgerEntryInput =
  | { type: "transaction"; entry: TransactionInput }
  | { type: "commodity"; entry: CommodityInput }
  | { type: "price"; entry: PriceInput }
  | { type: "note"; entry: NoteInput }
  | { type: "balance"; entry: BalanceInput }
  | { type: "open"; entry: OpenInput }
  | { type: "close"; entry: CloseInput }
  | { type: "budget"; entry: BudgetInput }
  | { type: "document"; entry: DocumentInput }
  | { type: "event"; entry: EventInput };

// Atomic on the ledger side (all-or-nothing commit) — no partial counts to report.
export type AddBulkEntriesResult = { success: boolean; message?: string };

type BulkEntries = EntryAddBulkEntriesRequest["entries"];
type BulkEntry = BulkEntries[number];

/** The narrow slice of the Fava client this service drives. */
type LedgerEntryFavaClient = Pick<
  FavaApiClient,
  "entries" | "ledgers" | "reports"
>;

/** Entry type → file-routing type passed to `resolveEntryFile`. */
const ENTRY_FILE_TYPE: Record<
  LedgerEntryInput["type"],
  Parameters<typeof resolveEntryFile>[0]
> = {
  transaction: "Transaction",
  commodity: "Commodity",
  price: "Price",
  note: "Note",
  balance: "Balance",
  open: "Open",
  close: "Close",
  budget: "Budget",
  document: "Document",
  event: "Event",
};

export interface ILedgerEntryService {
  addBulkEntries(
    identity: Identity,
    ledgerOwner: string,
    ledgerName: string,
    inputs: LedgerEntryInput[],
    platform: "web" | "mobile",
  ): Promise<AddBulkEntriesResult>;
}

/** Internal mutation primitive for workflows that authorize a composite action. */
export interface ILedgerEntryWriter {
  writeBulkEntries(
    userId: string,
    ledgerOwner: string,
    ledgerName: string,
    inputs: LedgerEntryInput[],
    platform: "web" | "mobile",
  ): Promise<AddBulkEntriesResult>;
}

export class LedgerEntryService implements ILedgerEntryService {
  constructor(
    private readonly writer: ILedgerEntryWriter,
    private readonly authorization: IAuthorizationService,
  ) {}

  async addBulkEntries(
    identity: Identity,
    ledgerOwner: string,
    ledgerName: string,
    inputs: LedgerEntryInput[],
    platform: "web" | "mobile",
  ): Promise<AddBulkEntriesResult> {
    const ledgerId = `${ledgerOwner}/${ledgerName}`;
    await authorizeLedger(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_ENTRIES_WRITE,
      { authorization: this.authorization },
    );
    return this.writer.writeBulkEntries(
      identity.userId,
      ledgerOwner,
      ledgerName,
      inputs,
      platform,
    );
  }
}

class FavaLedgerEntryWriter implements ILedgerEntryWriter {
  private readonly logger = logger.child({ module: "ledger-entry-service" });

  constructor(private readonly favaClientFactory: IFavaClientFactory) {}

  /**
   * Build every entry into its Fava directive, route each to its target file,
   * ensure those files exist, then commit them atomically via the single
   * canonical bulk endpoint. All-or-nothing: throws on any failure.
   */
  async writeBulkEntries(
    userId: string,
    ledgerOwner: string,
    ledgerName: string,
    inputs: LedgerEntryInput[],
    platform: "web" | "mobile",
  ): Promise<AddBulkEntriesResult> {
    const ledgerId = `${ledgerOwner}/${ledgerName}`;
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );

    // Fetch routing options once for the whole batch.
    const bcioData = await this.fetchBcioOptions(
      favaApiClient,
      ledgerOwner,
      ledgerName,
    );

    const entries: BulkEntries = inputs.map((input) => {
      const filename = bcioData
        ? resolveEntryFile(
            ENTRY_FILE_TYPE[input.type],
            new Date(input.entry.date),
            bcioData,
          )
        : undefined;
      return this.buildEntry(input, filename);
    });

    // Ensure each distinct target file exists before committing.
    const distinctFiles = [
      ...new Set(
        entries
          .map((entry) => entry.filename)
          .filter((filename): filename is string => Boolean(filename)),
      ),
    ];
    for (const filename of distinctFiles) {
      await this.ensureFileExists(
        favaApiClient,
        ledgerOwner,
        ledgerName,
        filename,
      );
    }

    await this.addEntries(
      favaApiClient,
      ledgerOwner,
      ledgerName,
      entries,
      platform,
    );

    const noun = inputs.length === 1 ? "entry" : "entries";
    return {
      success: true,
      message: `Added ${inputs.length} ${noun} successfully`,
    };
  }

  private buildEntry(
    input: LedgerEntryInput,
    filename: string | undefined,
  ): BulkEntry {
    switch (input.type) {
      case "transaction": {
        const { entry } = input;
        const item: Transaction = {
          date: entry.date,
          flag: entry.flag,
          payee: entry.payee,
          narration: entry.narration,
          postings: entry.postings.map((posting) => ({
            units: {
              number: posting.units.number,
              currency: posting.units.currency,
            },
            account: posting.account,
            price: posting.price
              ? {
                  number: posting.price.number,
                  currency: posting.price.currency,
                }
              : null,
            flag: posting.flag,
          })),
          tags: entry.tags,
          links: entry.links,
          meta: entry.meta,
        };
        return { type: "transaction", item, filename };
      }
      case "commodity": {
        const item: Commodity = {
          date: input.entry.date,
          currency: input.entry.currency,
        };
        return { type: "commodity", item, filename };
      }
      case "price": {
        const { entry } = input;
        const item: Price = {
          date: entry.date,
          currency: entry.currency,
          amount: {
            number: entry.amount.number,
            currency: entry.amount.currency,
          },
        };
        return { type: "price", item, filename };
      }
      case "note": {
        const item: Note = {
          date: input.entry.date,
          account: input.entry.account,
          comment: input.entry.content,
        };
        return { type: "note", item, filename };
      }
      case "balance": {
        const item: Balance = {
          date: input.entry.date,
          account: input.entry.account,
          amount: input.entry.amount,
        };
        return { type: "balance", item, filename };
      }
      case "open": {
        const item: Open = {
          date: input.entry.date,
          account: input.entry.account,
          currencies: input.entry.currencies,
        };
        return { type: "open", item, filename };
      }
      case "close": {
        const item: Close = {
          date: input.entry.date,
          account: input.entry.account,
        };
        return { type: "close", item, filename };
      }
      case "budget": {
        const { entry } = input;
        return {
          type: "custom",
          item: {
            date: entry.date,
            type: "budget",
            values: [
              { kind: "account", value: entry.account },
              { kind: "text", value: entry.interval },
              {
                kind: "amount",
                number: entry.amount.number,
                currency: entry.amount.currency,
              },
            ],
          },
          filename,
        };
      }
      case "document": {
        const { entry } = input;
        return {
          type: "document",
          item: {
            date: entry.date,
            account: entry.account,
            filename: entry.filename,
            tags: entry.tags,
            links: entry.links,
          },
          filename,
        };
      }
      case "event": {
        const item: Event = {
          date: input.entry.date,
          type: input.entry.type,
          description: input.entry.description,
        };
        return { type: "event", item, filename };
      }
    }
  }

  private async fetchBcioOptions(
    favaApiClient: LedgerEntryFavaClient,
    ledgerOwner: string,
    ledgerName: string,
  ): Promise<BcioOptionsPublic | undefined> {
    const bcioResponse = await favaApiClient.reports.getLedgerBcioOptions(
      ledgerOwner,
      ledgerName,
    );
    return bcioResponse.data.success ? bcioResponse.data.data : undefined;
  }

  private async ensureFileExists(
    favaApiClient: LedgerEntryFavaClient,
    ledgerOwner: string,
    ledgerName: string,
    filename: string,
  ): Promise<void> {
    const existsResponse = await favaApiClient.ledgers.getLedgerFile(
      ledgerOwner,
      ledgerName,
      { path: filename },
    );
    if (existsResponse.data.success && existsResponse.data.data) return;

    this.logger.info("Creating missing ledger file", {
      filename,
      ledgerOwner,
      ledgerName,
    });
    await unwrapFavaResponse(
      favaApiClient.ledgers.createLedgerFile(ledgerOwner, ledgerName, {
        path: filename,
        content: "",
        message: "chore: create file",
      }),
      "create ledger file before inserting entry",
      (cause) =>
        operationNotAllowedFromCause(
          "create ledger file before inserting entry",
          cause,
        ),
    );
  }

  /**
   * Commit a batch of already-built entries via the canonical bulk endpoint.
   * All-or-nothing: throws on any failure.
   */
  private async addEntries(
    favaApiClient: LedgerEntryFavaClient,
    ledgerOwner: string,
    ledgerName: string,
    entries: BulkEntries,
    platform: "web" | "mobile" = "web",
  ): Promise<void> {
    await unwrapFavaResponse(
      favaApiClient.entries.addBulkEntries(
        ledgerOwner,
        ledgerName,
        { entries },
        directiveLimitExemptParams(platform),
      ),
      "add entries",
      (cause) => operationNotAllowedFromCause("add entries", cause),
    );
  }
}

/** Composition-only writer used after a protected boundary has authorized. */
export function createLedgerEntryWriter(
  favaClientFactory: IFavaClientFactory,
): ILedgerEntryWriter {
  return new FavaLedgerEntryWriter(favaClientFactory);
}
