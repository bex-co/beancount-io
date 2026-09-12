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
import { BadUserInputError } from "@/shared/errors";
import { resolveEntryFile } from "@/features/ledger/utils/entry-file-resolver";
import {
  insertDirectives,
  parseDirectiveText,
} from "@/features/ledger/utils/directive-text";
import { assertSafeRepoPath } from "@/features/ledger/utils/safe-repo-path";
import { unifiedDiff } from "@/shared/unified-diff";
import { decodeFileContent } from "@/shared/file-content";
import {
  diffBeanCheckErrors,
  toBeanCheckErrors,
  type BeanCheckError,
} from "@/features/ledger/utils/bean-check-errors";
import { UnbalancedTransactionError, ValidationError } from "@/shared/errors";
import { directiveLimitExemptParams } from "@/features/ledger/operations/directive-limit-bypass";
import type { FavaApiClient } from "@/foundation/fava";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { Identity } from "@/server/api/identity";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import type { IAuthorizationService } from "@/server/api/authorization";
import { AUTHORIZATION_ACTIONS } from "@/server/api/authorization/authorization-contract";

type AmountInput = { number: string; currency: string };

type PostingInput = {
  /** Omitted on at most one posting per transaction; written elided. */
  units?: AmountInput;
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
// `files` names the distinct ledger files the batch landed in, so MCP write
// results can say what they wrote (w2/m26).
export type AddBulkEntriesResult = {
  success: boolean;
  message?: string;
  files?: string[];
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

/**
 * Most directives one `appendDirectiveText` call will accept (w2/m28:t005).
 *
 * A bounded batch keeps the projected bean-check — which loads the whole
 * ledger — proportional to one call, and a caller sending thousands of
 * directives wants an import, not an append.
 */
export const MAX_APPENDED_DIRECTIVES = 50;

/**
 * The refusal for text that would break the ledger.
 *
 * An unbalanced transaction gets its own code because it is the one failure
 * an agent can act on mechanically — add the missing posting, or say
 * `allowInvalid` and mean it — and because `addLedgerEntries` already answers
 * `UNBALANCED` for the same mistake made in the structured dialect. The two
 * write paths refusing the same thing under different codes is exactly the
 * dialect problem this milestone is removing.
 */
function unbalancedOrValidationError(
  newErrors: readonly DirectiveTextError[],
): Error {
  const detail = newErrors
    .map((error) =>
      error.source ? `${error.message} (${error.source})` : error.message,
    )
    .join("; ");
  const unbalanced = newErrors.some((error) =>
    /does not balance|residual/i.test(error.message),
  );
  if (unbalanced) {
    // bean-check states the residual in its own message; carrying it through
    // means the error's hint names the amount that is missing.
    const residual = /residual\s+(\S+\s*\S*)/i.exec(detail)?.[1] ?? "unknown";
    return new UnbalancedTransactionError(
      `Appending this text would leave a transaction unbalanced: ${detail}`,
      residual,
    );
  }
  return new ValidationError(
    "text",
    `appending it would introduce ${newErrors.length} new bean-check error${newErrors.length === 1 ? "" : "s"}: ${detail}`,
  );
}

/** What appending Beancount text asks for. */
export interface AppendDirectiveTextInput {
  /** Beancount directive text, as an agent would write it into a file. */
  readonly text: string;
  /** Target file. Omitted, each directive routes by the ledger's own rules. */
  readonly path?: string;
  /** Run every check and report the result without committing. */
  readonly dryRun?: boolean;
  /** Commit even when the text introduces new bean-check errors. */
  readonly allowInvalid?: boolean;
}

/** One bean-check error as the ledger service reports it. */
type DirectiveTextError = BeanCheckError;

export interface AppendDirectiveTextResult {
  readonly success: boolean;
  readonly message: string;
  readonly dryRun: boolean;
  /** Directives parsed out of the text. */
  readonly count: number;
  /** Where each directive landed: file and 1-based line. */
  readonly wrote: readonly { path: string; line: number }[];
  /** Unified diff per touched file. Populated on dry runs only. */
  readonly diff: readonly { path: string; diff: string }[];
  readonly errorsBefore: number;
  readonly errorsAfter: number;
  readonly newErrors: readonly DirectiveTextError[];
  /**
   * Files whose existing directives were out of date order, so the new ones
   * were appended at the end instead of threaded in.
   */
  readonly appendedUnsorted: readonly string[];
}

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
  ): Promise<AddBulkEntriesResult>;

  writeDirectiveText(
    userId: string,
    ledgerOwner: string,
    ledgerName: string,
    input: AppendDirectiveTextInput,
  ): Promise<AppendDirectiveTextResult>;
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
    return this.writer.writeDirectiveText(
      identity.userId,
      ledgerOwner,
      ledgerName,
      input,
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
    allowInvalid = false,
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
    });
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
      allowInvalid,
    );

    const noun = inputs.length === 1 ? "entry" : "entries";
    return {
      success: true,
      message: `Added ${inputs.length} ${noun} successfully`,
      files: distinctFiles,
    };
  }

  /**
   * Append directive text, in date order, after proving it does not break the
   * ledger (w2/m28:t005).
   *
   * The order matters: parse, route, project, *check the projection*, then
   * commit. Checking after the commit would leave the caller holding a broken
   * ledger and a refusal, which is the failure mode `allowInvalid` exists to
   * make a deliberate choice rather than an accident.
   */
  async writeDirectiveText(
    userId: string,
    ledgerOwner: string,
    ledgerName: string,
    input: AppendDirectiveTextInput,
  ): Promise<AppendDirectiveTextResult> {
    const { text, path, dryRun = false, allowInvalid = false } = input;
    const directives = parseDirectiveText(text);
    if (directives.length > MAX_APPENDED_DIRECTIVES) {
      throw new BadUserInputError(
        `text holds ${directives.length} directives; at most ${MAX_APPENDED_DIRECTIVES} may be appended per call. Split the text into several calls.`,
      );
    }
    if (path !== undefined) assertSafeRepoPath(path, "path");

    const ledgerId = `${ledgerOwner}/${ledgerName}`;
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const bcioData = await this.fetchBcioOptions(
      favaApiClient,
      ledgerOwner,
      ledgerName,
    );

    // Group by target file so one commit covers however many files the
    // ledger's own routing rules spread the text across.
    const byPath = new Map<string, typeof directives>();
    for (const directive of directives) {
      const target =
        path ??
        (bcioData
          ? resolveEntryFile(
              directive.kind,
              directive.date ? new Date(directive.date) : new Date(),
              bcioData,
            )
          : "main.bean");
      const group = byPath.get(target);
      if (group) group.push(directive);
      else byPath.set(target, [directive]);
    }

    // One record per touched file rather than five collections keyed on the
    // same path: the sha, the projected text, and where each directive landed
    // travel together, so nothing has to be re-looked-up to build the commit.
    const targets = await Promise.all(
      [...byPath].map(async ([target, targetDirectives]) => {
        const current = await this.readFile(
          favaApiClient,
          ledgerOwner,
          ledgerName,
          target,
        );
        const before = current?.content ?? "";
        const result = insertDirectives(before, targetDirectives);
        return {
          path: target,
          sha: current?.sha,
          before: current ? before : null,
          content: result.content,
          base64: Buffer.from(result.content, "utf8").toString("base64"),
          lines: result.inserted.map((inserted) => inserted.line),
          appended: result.appended,
        };
      }),
    );

    const [baseline, projected] = await Promise.all([
      this.checkProjected(favaApiClient, ledgerOwner, ledgerName, []),
      this.checkProjected(favaApiClient, ledgerOwner, ledgerName, targets),
    ]);
    const newErrors = diffBeanCheckErrors(baseline, projected);

    if (newErrors.length > 0 && !allowInvalid) {
      throw unbalancedOrValidationError(newErrors);
    }

    const paths = targets.map((target) => target.path);
    const noun = directives.length === 1 ? "directive" : "directives";
    const summary = `${directives.length} ${noun} to ${paths.join(", ")}`;
    if (!dryRun) {
      await unwrapFavaResponse(
        favaApiClient.ledgers.changeLedgerFiles(ledgerOwner, ledgerName, {
          files: targets.map((target) => ({
            operation: target.sha ? ("update" as const) : ("create" as const),
            path: target.path,
            content: target.base64,
            ...(target.sha && { sha: target.sha }),
          })),
          message: `Add ${summary}`,
        }),
        "append ledger directives",
        (cause) => operationNotAllowedFromCause("append ledger directives", cause),
      );
      this.logger.info("Appended directive text", {
        ledgerOwner,
        ledgerName,
        count: directives.length,
        paths,
      });
    }

    return {
      success: true,
      message: dryRun ? `Would add ${summary}` : `Added ${summary}`,
      dryRun,
      count: directives.length,
      wrote: dryRun
        ? []
        : targets.flatMap((target) =>
            target.lines.map((line) => ({ path: target.path, line })),
          ),
      // A commit's diff is the ledger's history; a preview's diff is the only
      // place the caller can see what it approved — so it is only computed
      // when it will be read. A line-by-line diff of a whole ledger file is
      // not free.
      diff: dryRun
        ? targets.map((target) => ({
            path: target.path,
            diff: unifiedDiff(target.path, target.before, target.content),
          }))
        : [],
      errorsBefore: baseline.length,
      errorsAfter: projected.length,
      newErrors,
      appendedUnsorted: targets
        .filter((target) => target.appended)
        .map((target) => target.path),
    };
  }

  /** One file's current text and sha, or `undefined` when it does not exist. */
  private async readFile(
    favaApiClient: LedgerEntryFavaClient,
    ledgerOwner: string,
    ledgerName: string,
    path: string,
  ): Promise<{ content: string; sha: string } | undefined> {
    const response = await favaApiClient.ledgers.getLedgerFile(
      ledgerOwner,
      ledgerName,
      { path },
    );
    const file = response.data.success ? response.data.data : undefined;
    if (!file) return undefined;
    return { content: decodeFileContent(file), sha: file.sha };
  }

  /** bean-check over the ledger with these files replaced. */
  private async checkProjected(
    favaApiClient: LedgerEntryFavaClient,
    ledgerOwner: string,
    ledgerName: string,
    overlays: readonly { path: string; base64: string }[],
  ): Promise<DirectiveTextError[]> {
    const errors = await unwrapFavaResponse(
      favaApiClient.reports.checkProjectedErrors(ledgerOwner, ledgerName, {
        files: overlays.map((overlay) => ({
          path: overlay.path,
          content: overlay.base64,
        })),
      }),
      "check projected ledger",
    );
    return toBeanCheckErrors(errors);
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
            flag: posting.flag ?? undefined,
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
    allowInvalid = false,
  ): Promise<void> {
    await unwrapFavaResponse(
      favaApiClient.entries.addBulkEntries(
        ledgerOwner,
        ledgerName,
        { entries, allowInvalid },
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
