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
import { BadUserInputError, ValidationError } from "@/shared/errors";
import { resolveEntryFile } from "@/features/ledger/utils/entry-file-resolver";
import { parseDirectiveDate } from "@/features/ledger/utils/directive-date";
import { LEDGER_ENTRY_POINT } from "@/features/ledger/utils/ledger-entry-point";
import { directiveLimitExemptParams } from "@/features/ledger/operations/directive-limit-bypass";
import type { FavaApiClient } from "@/foundation/fava";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { Identity } from "@/server/api/identity";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import type { IAuthorizationService } from "@/server/api/authorization";
import { AUTHORIZATION_ACTIONS } from "@/server/api/authorization/authorization-contract";

type AmountInput = { number: string; currency: string };

type CostInput = AmountInput & { date?: string; label?: string };

type PostingInput = {
  /** Omitted on at most one posting per transaction; written elided. */
  units?: AmountInput;
  account: string;
  price?: AmountInput;
  cost?: CostInput;
  flag?: string;
  tags?: string[];
  links?: string[];
  meta?: Record<string, string>;
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

type BalanceInput = {
  date: string;
  account: string;
  amount: AmountInput;
  tolerance?: string;
};

/** The booking methods beancount parses on `open`; tracks the IDL enum. */
type BookingMethod = NonNullable<Open["booking"]>;

type OpenInput = {
  date: string;
  account: string;
  currencies: string[];
  booking?: BookingMethod;
};

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
/**
 * The numbers a structured write accepts: an optional sign, digits with an
 * optional fraction, and an optional exponent the ledger expands. A bank
 * spelling such as `(12.50)` or `-1,234.56` is the client's to normalize.
 */
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/** Every amount an entry carries, with the field path a refusal names. */
function entryAmounts(
  input: LedgerEntryInput,
): ReadonlyArray<readonly [string, unknown]> {
  switch (input.type) {
    case "transaction":
      return input.entry.postings.flatMap((posting, index) => [
        ...(posting.units
          ? [[`postings[${index}].units.number`, posting.units.number] as const]
          : []),
        ...(posting.price
          ? [[`postings[${index}].price.number`, posting.price.number] as const]
          : []),
        ...(posting.cost
          ? [[`postings[${index}].cost.number`, posting.cost.number] as const]
          : []),
      ]);
    case "balance":
      return [
        ["amount.number", input.entry.amount?.number],
        ...(input.entry.tolerance !== undefined
          ? [["tolerance", input.entry.tolerance] as const]
          : []),
      ];
    case "price":
    case "budget":
      return [["amount.number", input.entry.amount?.number]];
    default:
      return [];
  }
}

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
// `files` names the distinct ledger files the batch landed in, so MCP write
// results can say what they wrote (w2/m26).
export type AddBulkEntriesResult = {
  success: boolean;
  message?: string;
  files?: string[];
  /**
   * The hash each committed entry now carries, in request order; empty when
   * they could not be resolved after the commit (w23/060).
   */
  entryHashes?: string[];
  /**
   * Files the write routed to outside the include closure, now included
   * from the entry point in the same commit (w23/062).
   */
  includedFiles?: string[];
};

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

import type {
  AppendDirectiveTextInput,
  AppendDirectiveTextResult,
} from "@/features/ledger/utils/directive-text-contract";
import type { IDirectiveAppendWorkflow } from "@/features/ledger/workflow/directive-append-workflow";

export {
  MAX_APPENDED_DIRECTIVES,
  type AppendDirectiveTextInput,
  type AppendDirectiveTextResult,
} from "@/features/ledger/utils/directive-text-contract";

export interface ILedgerEntryService {
  addBulkEntries(
    identity: Identity,
    ledgerOwner: string,
    ledgerName: string,
    inputs: LedgerEntryInput[],
    platform: "web" | "mobile",
    allowInvalid?: boolean,
  ): Promise<AddBulkEntriesResult>;

  /**
   * Append Beancount directive text to the ledger, in date order.
   *
   * The write path for agents that already speak Beancount: no structured
   * entry schema to learn and no string surgery through `editLedgerFiles`,
   * which is what put entries in `main.bean` out of order (w2/m28:t005).
   */
  appendDirectiveText(
    identity: Identity,
    ledgerOwner: string,
    ledgerName: string,
    input: AppendDirectiveTextInput,
  ): Promise<AppendDirectiveTextResult>;
}

/** Internal mutation primitive for workflows that authorize a composite action. */
export interface ILedgerEntryWriter {
  writeBulkEntries(
    userId: string,
    ledgerOwner: string,
    ledgerName: string,
    inputs: LedgerEntryInput[],
    platform: "web" | "mobile",
    allowInvalid?: boolean,
    /** Run every check the write would and commit nothing (w23/058). */
    dryRun?: boolean,
  ): Promise<AddBulkEntriesResult>;
}

export class LedgerEntryService implements ILedgerEntryService {
  constructor(
    private readonly writer: ILedgerEntryWriter,
    private readonly authorization: IAuthorizationService,
    private readonly directiveAppend: IDirectiveAppendWorkflow,
  ) {}

  async addBulkEntries(
    identity: Identity,
    ledgerOwner: string,
    ledgerName: string,
    inputs: LedgerEntryInput[],
    platform: "web" | "mobile",
    allowInvalid = false,
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
      allowInvalid,
    );
  }

  async appendDirectiveText(
    identity: Identity,
    ledgerOwner: string,
    ledgerName: string,
    input: AppendDirectiveTextInput,
  ): Promise<AppendDirectiveTextResult> {
    // The same canonical action `addBulkEntries` selects: appending text and
    // appending structured entries are one capability in two dialects, and
    // giving them different authority would make the dialect the ceiling.
    await authorizeLedger(
      identity,
      `${ledgerOwner}/${ledgerName}`,
      AUTHORIZATION_ACTIONS.LEDGER_ENTRIES_WRITE,
      { authorization: this.authorization },
    );
    // The coordination itself lives in a workflow that drives the repository
    // service, so the append is guarded exactly like every other write to
    // these files rather than by a second implementation of the same rules
    // (w2/012). This service keeps the authorization decision.
    return this.directiveAppend.appendDirectiveText({
      identity,
      ledgerId: `${ledgerOwner}/${ledgerName}`,
      input,
    });
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
    allowInvalid = false,
    dryRun = false,
  ): Promise<AddBulkEntriesResult> {
    const ledgerId = `${ledgerOwner}/${ledgerName}`;
    // At most one posting per transaction may omit its amount; the ledger
    // enforces this again at the trust boundary, but refusing here names the
    // entry before any file is read or committed, on every surface at once.
    inputs.forEach((input, index) => {
      if (input.type !== "transaction") return;
      const elided = input.entry.postings.filter(
        (posting) => posting.units === undefined || posting.units === null,
      ).length;
      if (elided > 1) {
        throw new BadUserInputError(
          `entry ${index}: at most one posting may omit its amount, found ${elided}`,
        );
      }
      // A price without units has no meaning, and the ledger would render the
      // posting elided with the price silently gone. Refuse it here, naming
      // the posting, on every surface at once (w23/079).
      input.entry.postings.forEach((posting, postingIndex) => {
        const hasUnits =
          posting.units !== undefined && posting.units !== null;
        const hasPrice =
          posting.price !== undefined && posting.price !== null;
        if (hasPrice && !hasUnits) {
          throw new BadUserInputError(
            `entry ${index}: postings[${postingIndex}].price needs units; a posting without an amount can't carry a price`,
          );
        }
        const hasCost =
          posting.cost !== undefined && posting.cost !== null;
        if (hasCost && !hasUnits) {
          throw new BadUserInputError(
            `entry ${index}: postings[${postingIndex}].cost needs units; a posting without an amount can't carry a cost`,
          );
        }
      });
    });
    // A malformed amount was a 500 in the ledger, reported as "service
    // unavailable, retry", or was committed as unparseable text. Refuse it
    // here, naming the field, on GraphQL, REST and MCP at once.
    inputs.forEach((input, index) => {
      for (const [field, value] of entryAmounts(input)) {
        if (typeof value !== "string" || !DECIMAL_NUMBER.test(value)) {
          throw new BadUserInputError(
            `entry ${index}: ${field} ${JSON.stringify(value)} is not a decimal number`,
          );
        }
      }
    });
    // Refused before any file is read, and whether or not the ledger routes
    // by date — the router throws on a date that is not on the calendar.
    const dates = inputs.map((input, index) =>
      parseDirectiveDate(input.entry.date, `entry ${index}: date`),
    );
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    if (!allowInvalid) {
      await this.assertBudgetAccountsExist(
        favaApiClient,
        ledgerOwner,
        ledgerName,
        inputs,
      );
    }

    // Fetch routing options once for the whole batch.
    const bcioData = await this.fetchBcioOptions(
      favaApiClient,
      ledgerOwner,
      ledgerName,
    );

    const entries: BulkEntries = inputs.map((input, index) => {
      const filename = bcioData
        ? resolveEntryFile(ENTRY_FILE_TYPE[input.type], dates[index], bcioData)
        : undefined;
      return this.buildEntry(input, filename);
    });

    // Each distinct target file must exist before committing; a dry run
    // creates nothing, and the ledger checks a missing one as empty.
    const distinctFiles = [
      ...new Set(
        entries
          .map((entry) => entry.filename)
          .filter((filename): filename is string => Boolean(filename)),
      ),
    ];
    const missing: string[] = [];
    for (const filename of dryRun ? [] : distinctFiles) {
      if (
        !(await this.fileExists(
          favaApiClient,
          ledgerOwner,
          ledgerName,
          filename,
        ))
      ) {
        missing.push(filename);
      }
    }
    if (missing.length > 0) {
      // Ask the ledger first: a refused write (unbalanced, a new bean-check
      // error, the directive limit) must not leave an empty routed file and a
      // "chore: create file" commit behind (w21/683).
      await this.addEntries(
        favaApiClient,
        ledgerOwner,
        ledgerName,
        entries,
        platform,
        allowInvalid,
        true,
      );
      for (const filename of missing) {
        await this.createFile(favaApiClient, ledgerOwner, ledgerName, filename);
      }
    }

    const { entryHashes, includedFiles } = await this.addEntries(
      favaApiClient,
      ledgerOwner,
      ledgerName,
      entries,
      platform,
      allowInvalid,
      dryRun,
    );

    const noun = inputs.length === 1 ? "entry" : "entries";
    // A routed file nothing included is included from the entry point in the
    // same commit (w23/062); the result says so.
    const included =
      includedFiles.length > 0
        ? `; ${LEDGER_ENTRY_POINT} now includes ${includedFiles.join(", ")}`
        : "";
    return {
      success: true,
      message: `Added ${inputs.length} ${noun} successfully${included}`,
      files: distinctFiles,
      entryHashes,
      ...(includedFiles.length > 0 && { includedFiles }),
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
          payee: entry.payee ?? undefined,
          narration: entry.narration ?? undefined,
          postings: entry.postings.map((posting) => ({
            // An omitted amount stays omitted: the ledger interpolates it for
            // validation and renders the posting elided (w2/m26).
            ...(posting.units
              ? {
                  units: {
                    number: posting.units.number,
                    currency: posting.units.currency,
                  },
                }
              : {}),
            account: posting.account,
            price: posting.price
              ? {
                  number: posting.price.number,
                  currency: posting.price.currency,
                }
              : null,
            cost: posting.cost
              ? {
                  number: posting.cost.number,
                  currency: posting.cost.currency,
                  ...(posting.cost.date ? { date: posting.cost.date } : {}),
                  ...(posting.cost.label ? { label: posting.cost.label } : {}),
                }
              : null,
            flag: posting.flag ?? undefined,
            tags: posting.tags ?? undefined,
            links: posting.links ?? undefined,
            meta: posting.meta ?? undefined,
          })),
          tags: entry.tags ?? undefined,
          links: entry.links ?? undefined,
          meta: entry.meta ?? undefined,
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
          tolerance: input.entry.tolerance ?? undefined,
        };
        return { type: "balance", item, filename };
      }
      case "open": {
        const item: Open = {
          date: input.entry.date,
          account: input.entry.account,
          currencies: input.entry.currencies,
          booking: input.entry.booking ?? undefined,
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
            tags: entry.tags ?? undefined,
            links: entry.links ?? undefined,
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

  /**
   * A budget is a `custom "budget"` directive, whose account bean-check never
   * reads: one for an account the ledger lacks was committed with "no new
   * bean-check errors", and no report ever matched it (w23/071). Its account
   * must be opened, or be a parent of an opened one (w21/396), in the ledger
   * or by an `open` in the same batch.
   */
  private async assertBudgetAccountsExist(
    favaApiClient: LedgerEntryFavaClient,
    ledgerOwner: string,
    ledgerName: string,
    inputs: LedgerEntryInput[],
  ): Promise<void> {
    if (!inputs.some((input) => input.type === "budget")) return;
    const opened = [
      ...Object.keys(
        await unwrapFavaResponse(
          favaApiClient.reports.getLedgerAccounts(ledgerOwner, ledgerName),
          "get ledger accounts",
        ),
      ),
      ...inputs.flatMap((input) =>
        input.type === "open" ? [input.entry.account] : [],
      ),
    ];
    inputs.forEach((input, index) => {
      if (input.type !== "budget") return;
      const { account } = input.entry;
      const under = (parent: string) => (candidate: string) =>
        candidate === parent || candidate.startsWith(`${parent}:`);
      if (opened.some(under(account))) return;
      // The opened accounts beside it, under its deepest existing parent.
      const segments = account.split(":");
      let nearest: string[] = [];
      for (let depth = segments.length - 1; depth > 0; depth -= 1) {
        nearest = opened.filter(under(segments.slice(0, depth).join(":")));
        if (nearest.length > 0) break;
      }
      const suggestion =
        nearest.length > 0
          ? `; nearest: ${[...new Set(nearest)].sort().slice(0, 3).join(", ")}`
          : "";
      throw new ValidationError(
        "entries",
        `entry ${index}: budget account ${account} is not opened in this ledger, nor is any account under it${suggestion}`,
        "Budget an account the ledger opens, or a parent of one; add its `open` to the same call; or pass `allowInvalid: true` to record the budget anyway.",
        { entry: index, account },
      );
    });
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

  private async fileExists(
    favaApiClient: LedgerEntryFavaClient,
    ledgerOwner: string,
    ledgerName: string,
    filename: string,
  ): Promise<boolean> {
    const existsResponse = await favaApiClient.ledgers.getLedgerFile(
      ledgerOwner,
      ledgerName,
      { path: filename },
    );
    return Boolean(existsResponse.data.success && existsResponse.data.data);
  }

  private async createFile(
    favaApiClient: LedgerEntryFavaClient,
    ledgerOwner: string,
    ledgerName: string,
    filename: string,
  ): Promise<void> {
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
    allowInvalid = false,
    dryRun = false,
  ): Promise<{ entryHashes: string[]; includedFiles: string[] }> {
    const written = await unwrapFavaResponse(
      favaApiClient.entries.addBulkEntries(
        ledgerOwner,
        ledgerName,
        { entries, allowInvalid, ...(dryRun && { dryRun }) },
        directiveLimitExemptParams(platform),
      ),
      "add entries",
      (cause) => operationNotAllowedFromCause("add entries", cause),
    );
    // A ledger service older than w23/060 answers `null`.
    const result = written as Partial<typeof written> | null;
    return {
      entryHashes: result?.entry_hashes ?? [],
      includedFiles: result?.included_files ?? [],
    };
  }
}

/** Composition-only writer used after a protected boundary has authorized. */
export function createLedgerEntryWriter(
  favaClientFactory: IFavaClientFactory,
): ILedgerEntryWriter {
  return new FavaLedgerEntryWriter(favaClientFactory);
}
