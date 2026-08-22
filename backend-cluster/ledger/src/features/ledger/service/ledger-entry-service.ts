import { logger } from "@/shared/logger";
import {
  parseEntryDate,
  resolveEntryFile,
} from "@/features/ledger/utils/entry-file-resolver";
import {
  assertRepoSizeWithinLimit,
  type GiteaTreeSizeClient,
} from "@/features/ledger/operations/assert-repo-size-within-limit";
import {
  commitLedgerFiles,
  type GiteaFileCommitClient,
  type RawFileCreate,
} from "@/features/ledger/operations/commit-ledger-files";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import type { CacheHelper } from "@/shared/cache";
import {
  entryInputToText,
  parseBcioOptions,
  parseLedgerFiles,
} from "@/foundation/rustledger";
import {
  loadCachedFileMapForRepo,
  type GiteaCommitClient,
} from "@/foundation/clients/load-cached-ledger-file-map";
import { BadUserInputError } from "@/shared/errors";

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
 * uniform `{ type, entry }` shape; `type` selects how `entry` is rendered to
 * beancount text (`entryInputToText`) and which file it is routed to.
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
  /**
   * Render + commit ledger entries in ONE atomic Gitea commit. Optional
   * `attachments` (e.g. a receipt binary) are created in the SAME commit as the
   * entries that reference them, so an attachment can never be orphaned by a
   * later failure. The free-tier size cap is gated once over the entries + the
   * attachments together.
   */
  addBulkEntries(
    userId: string,
    ledgerOwner: string,
    ledgerName: string,
    inputs: LedgerEntryInput[],
    platform: "web" | "mobile",
    attachments?: RawFileCreate[],
  ): Promise<AddBulkEntriesResult>;
}

export class LedgerEntryService implements ILedgerEntryService {
  private readonly logger = logger.child({ module: "ledger-entry-service" });

  constructor(
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly cacheHelper: CacheHelper,
  ) {}

  /** See {@link ILedgerEntryService.checkRepoSizeLimit}. */
  /**
   * Render every input to beancount text (`entryInputToText`, a faithful port of
   * fava's `format_entries`), route each to its target file (via the parsed
   * ledger's beancount.io options), append to the current file contents, and
   * commit them — together with any `attachments` (e.g. a receipt binary) — in
   * ONE atomic Gitea commit. So an attachment and the entries that reference it
   * land together or not at all (no orphan). The free-tier storage cap is
   * enforced once (owner's tier, projected post-write size) over the entries +
   * attachments before the commit.
   */
  async addBulkEntries(
    userId: string,
    ledgerOwner: string,
    ledgerName: string,
    inputs: LedgerEntryInput[],
    platform: "web" | "mobile",
    attachments: RawFileCreate[] = [],
  ): Promise<AddBulkEntriesResult> {
    const datedInputs = inputs.map((input) => {
      const date = parseEntryDate(input.entry.date);
      if (date === null) {
        throw new BadUserInputError(
          `Invalid entry date "${input.entry.date}" (expected a real YYYY-MM-DD calendar date)`,
        );
      }
      return { input, date };
    });
    const ledgerId = `${ledgerOwner}/${ledgerName}`;
    const client = await this.giteaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );

    // Routing options come from the parsed ledger (bcio custom directives).
    const { files, entryPoint, repoPaths, sourceFiles } =
      await loadCachedFileMapForRepo(
        client as unknown as GiteaCommitClient,
        this.cacheHelper,
        ledgerOwner,
        ledgerName,
      );
    const { directives } = await parseLedgerFiles(files, entryPoint, {
      repoPaths,
    });
    const bcioData = parseBcioOptions(directives);

    // Group each input's rendered text block by its resolved target file.
    const blocksByFile = new Map<string, string>();
    for (const { input, date } of datedInputs) {
      const filename =
        resolveEntryFile(ENTRY_FILE_TYPE[input.type], date, bcioData) ||
        "main.bean";
      blocksByFile.set(
        filename,
        (blocksByFile.get(filename) ?? "") + entryInputToText(input),
      );
    }

    // Same silent-swallow guard as the Plaid submit path: bcio routing may
    // resolve to a file the entry point never `include`s (e.g. a brand-new
    // `transactions/{year}.bean` at a year boundary). Committing there would
    // report success while the entries never reach the journal, reports, or
    // balances — fail loudly with the remedy instead.
    for (const filename of blocksByFile.keys()) {
      if (!sourceFiles.includes(filename)) {
        throw new BadUserInputError(
          `Entry target file "${filename}" is not included by the ledger entry point; add \`include "${filename}"\` to "${entryPoint}" first`,
        );
      }
    }

    // Friendly free-tier snapshot-size check: reject when the *owner's* cap
    // would be exceeded by the bytes this write adds — the rendered entry text
    // PLUS any attachment binaries. Checked once, before the single atomic
    // commit, so nothing (entries or binary) is left behind on rejection.
    const entryBytes = [...blocksByFile.values()].reduce(
      (sum, block) => sum + Buffer.byteLength(`\n${block}`, "utf-8"),
      0,
    );
    const attachmentBytes = attachments.reduce(
      (sum, file) => sum + Buffer.byteLength(file.contentBase64, "base64"),
      0,
    );
    await assertRepoSizeWithinLimit({
      giteaClient: client as unknown as GiteaTreeSizeClient,
      ledgerOwner,
      ledgerName,
      pendingBytes: entryBytes + attachmentBytes,
    });

    const noun = inputs.length === 1 ? "entry" : "entries";
    this.logger.info("Committing bulk entries", {
      ledgerOwner,
      ledgerName,
      platform,
      count: inputs.length,
      files: [...blocksByFile.keys()],
      attachments: attachments.map((file) => file.path),
    });

    // Append each block to its target file, computing the new content from the
    // FRESH file content + matching blob SHA (via commitLedgerFiles), so a
    // concurrent write can't be silently overwritten — matching entries.py
    // (`current_contents + "\n" + format_entries`). Attachments are created in
    // the SAME commit, so a receipt binary + its entries are atomic.
    const transforms = new Map(
      [...blocksByFile.entries()].map(
        ([path, block]) =>
          [
            path,
            (current: string | null): string => `${current ?? ""}\n${block}`,
          ] as const,
      ),
    );
    await commitLedgerFiles(
      client as unknown as GiteaFileCommitClient,
      ledgerOwner,
      ledgerName,
      transforms,
      `Add ${inputs.length} ${noun}`,
      attachments,
    );

    return {
      success: true,
      message: `Added ${inputs.length} ${noun} successfully`,
    };
  }
}
