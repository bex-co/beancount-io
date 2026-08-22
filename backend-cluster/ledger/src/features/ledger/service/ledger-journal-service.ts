import { parseLedgerId } from "@/shared/str";
import {
  BadUserInputError,
  ConflictError,
  NotFoundError,
  OperationNotAllowedError,
} from "@/shared/errors";
import type {
  DirectiveType,
  TransactionSubtype,
  DocumentSubtype,
  CustomSubtype,
} from "@/foundation/ledger-api-types";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import type { DirectiveJson, FileMap } from "@rustledger/wasm";
import {
  accountJournalItems,
  buildEntryIdMap,
  buildScaledPriceMap,
  clampDirectives,
  collectLedgerPlugins,
  deleteSliceFromFile,
  deriveReportAccounts,
  directiveToText,
  entryBalances,
  filterCustomSubtypes,
  filterDirectivesAsync,
  filterDirectiveTypes,
  filterDocumentSubtypes,
  filterTransactionSubtypes,
  findEntrySliceBySourceSha,
  findEntrySliceAsync,
  formatFiscalYearEnd,
  getDirectiveSourceId,
  hashEntry,
  parseDateRange,
  parseEntryId,
  parseFavaOptions,
  parseLedgerFiles,
  replaceSliceInFile,
  serializeDirective,
  sliceSha256,
  splitIntoBlocks,
  TimeFilterParseError,
  AdvancedFilterParseError,
  type EntrySlice,
  type JournalItem,
  type ReportAccounts,
} from "@/foundation/rustledger";
import {
  loadCachedFileMapForRepo,
  type GiteaCommitClient,
} from "@/foundation/clients/load-cached-ledger-file-map";
import {
  commitLedgerFiles,
  type GiteaFileCommitClient,
  type LedgerFileTransform,
} from "@/features/ledger/operations/commit-ledger-files";
import type { CacheHelper } from "@/shared/cache";

/** Public transformed entry ID -> original source-backed entry ID. */
function sourceEntryIds(directives: DirectiveJson[]): Map<string, string> {
  const publicIds = buildEntryIdMap(directives);
  const result = new Map<string, string>();
  directives.forEach((directive) => {
    const publicId = publicIds.get(directive);
    if (publicId !== undefined) {
      result.set(publicId, getDirectiveSourceId(directive) ?? publicId);
    }
  });
  return result;
}

/**
 * Error for an entry ID that resolves to no source block. Transformed entries
 * normally carry provenance and are resolved to their originating directive
 * before this fallback is reached. If provenance is unavailable (for example,
 * an entry produced by a future plugin that does not propagate it), surface a
 * clear read-only error rather than a misleading "not found". A plain
 * typo/stale hash on a non-plugin ledger stays a `NotFoundError`.
 */
function entryNotResolvableError(
  entryHash: string,
  files: FileMap,
  entryPoint: string,
): Error {
  const transforms = collectLedgerPlugins(files[entryPoint]).some(
    (name) =>
      name === "fava.plugins.amortize_over" ||
      name === "fava.plugins.link_documents",
  );
  if (transforms) {
    return new OperationNotAllowedError(
      "edit",
      "this entry is generated or modified by a fava plugin " +
        "(amortize_over / link_documents), so it has no editable source; edit " +
        "the originating directive instead",
    );
  }
  return new NotFoundError("Entry", entryHash);
}

/**
 * A single-file re-location target: the exact source-slice SHA + its occurrence
 * WITHIN that one file. Source identity is intentionally independent of the
 * booked entry hash: booking a lot reduction can require inventory from another
 * included file, which the single-file CAS transform does not have.
 */
interface SliceTarget {
  base: string;
  localOccurrence: number;
  sha256sum: string;
  startLine: number;
}

/**
 * Re-locate an entry's exact source block in ONE file's CURRENT content. Runs
 * against the FRESH content at commit time, so unrelated concurrent insertions
 * that shift line offsets are handled without re-booking the target in
 * isolation. If the old line now contains another dated block, treat the target
 * as changed; if it disappeared entirely, report it missing.
 */
function relocateSlice(
  file: string,
  content: string,
  target: SliceTarget,
): EntrySlice {
  const found = findEntrySliceBySourceSha(
    file,
    content,
    target.sha256sum,
    target.localOccurrence,
  );
  if (found !== null) return found;

  const blockAtOriginalLine = splitIntoBlocks(content).some(
    (block) => block.isDated && block.startLine === target.startLine,
  );
  if (blockAtOriginalLine) {
    throw new ConflictError(
      "Entry",
      "it has changed since it was loaded; refresh and retry",
    );
  }
  throw new NotFoundError("Entry", target.base);
}

/**
 * A {@link LedgerFileTransform} that deletes one or more entries' blocks from a
 * file, re-locating each in the fresh content and deleting bottom-to-top so
 * earlier line indices stay valid.
 */
function makeDeleteTransform(
  file: string,
  targets: SliceTarget[],
): LedgerFileTransform {
  return async (current) => {
    if (current === null) {
      throw new NotFoundError("Entry", targets[0]?.base ?? file);
    }
    const located: EntrySlice[] = [];
    for (const target of targets) {
      located.push(await relocateSlice(file, current, target));
    }
    let content = current;
    located
      .sort((a, b) => b.startLine - a.startLine)
      .forEach((slice) => {
        content = deleteSliceFromFile(content, slice.startLine, slice.endLine);
      });
    return content;
  };
}

/**
 * A {@link LedgerFileTransform} that replaces one entry's block with
 * `newContent`, re-locating it in the fresh content.
 */
function makeReplaceTransform(
  file: string,
  target: SliceTarget,
  newContent: string,
): LedgerFileTransform {
  return async (current) => {
    if (current === null) throw new NotFoundError("Entry", target.base);
    const slice = await relocateSlice(file, current, target);
    return replaceSliceInFile(
      current,
      slice.startLine,
      slice.endLine,
      newContent,
    );
  };
}

// Transaction flags that plaintextJournal excludes (padding/summarize/transfer/
// conversion/unrealized/etc.) — matches journal.py generate_beancount_content.
const PLAINTEXT_EXCLUDED_FLAGS = new Set(["P", "S", "T", "C", "U", "R", "M"]);

export type JournalResult = {
  total: number;
  data: Record<string, unknown>[];
  is_empty: boolean;
};

export type EntryContextResult = {
  entry: Record<string, unknown>;
  balances_before?: Record<string, string[]> | null;
  balances_after?: Record<string, string[]> | null;
  sha256sum: string;
  slice: string;
};

export type PlaintextJournalResult = { content: string };

export type AccountJournalResult = {
  items: {
    entry: Record<string, unknown>;
    change: Record<string, string>;
    balance: Record<string, string>;
  }[];
  total: number;
  account: string;
  with_children: boolean;
};

export type DeleteSliceResult = { message: string; entryHash: string };

export type DeleteMultiSlicesResult = {
  message: string;
  deletedHashes: string[];
};

export type UpdateSliceResult = {
  message: string;
  entryHash: string;
  newSha256sum: string;
};

export type JournalQueryParams = {
  account?: string;
  filter?: string;
  time?: string;
  directiveTypes?: DirectiveType[];
  transactionSubtypes?: TransactionSubtype[];
  documentSubtypes?: DocumentSubtype[];
  customSubtypes?: CustomSubtype[];
  limit?: number;
  offset?: number;
};

export type AccountJournalQueryParams = {
  account: string;
  filter?: string;
  time?: string;
  limit?: number;
  offset?: number;
  with_children?: boolean;
  conversion?: string;
};

export interface ILedgerJournalService {
  getJournal(params: {
    ledgerId: string;
    userId: string | undefined;
    query?: JournalQueryParams;
  }): Promise<JournalResult>;

  getContext(params: {
    ledgerId: string;
    userId: string | undefined;
    entryHash: string;
  }): Promise<EntryContextResult>;

  plaintextJournal(params: {
    ledgerId: string;
    userId: string | undefined;
    query?: { account?: string; filter?: string; time?: string };
  }): Promise<PlaintextJournalResult>;

  getAccountJournal(params: {
    ledgerId: string;
    userId: string | undefined;
    query: AccountJournalQueryParams;
  }): Promise<AccountJournalResult>;

  deleteSourceSlice(params: {
    ledgerId: string;
    userId: string;
    entryHash: string;
    sha256sum: string;
  }): Promise<DeleteSliceResult>;

  deleteMultiSourceSlices(params: {
    ledgerId: string;
    userId: string;
    entries: { entryHash: string; sha256sum: string }[];
  }): Promise<DeleteMultiSlicesResult>;

  updateSourceSlice(params: {
    ledgerId: string;
    userId: string;
    entryHash: string;
    sha256sum: string;
    newContent: string;
  }): Promise<UpdateSliceResult>;
}

export class LedgerJournalService implements ILedgerJournalService {
  constructor(
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly cacheHelper: CacheHelper,
  ) {}

  private async loadSnapshot(ledgerId: string, userId: string | undefined) {
    const { files, entryPoint, repoPaths } = await this.loadFileMap(
      ledgerId,
      userId,
    );
    const snapshot = await parseLedgerFiles(files, entryPoint, { repoPaths });
    // The WASM does not surface `name_*` overrides; recover the real report root
    // names (and the derived clamp account names) from the raw entry-point source
    // so the account-journal `time` clamp and the plaintext export honor
    // `option "name_assets" "Actif"` etc. instead of the beancount defaults.
    const reportAccounts = deriveReportAccounts({
      source: files[entryPoint],
      operatingCurrencies: snapshot.options.operating_currencies ?? [],
    });
    // Fava `fiscal-year-end` (default `12-31`) as `MM-DD`, so `fyXXXX`/fiscal-
    // quarter `time` filters resolve to the ledger's real accounting periods.
    const fiscalYearEnd = formatFiscalYearEnd(
      parseFavaOptions(snapshot.directives).fiscal_year_end,
    );
    return { ...snapshot, reportAccounts, fiscalYearEnd };
  }

  /** Load the ledger's raw FileMap + entry point from Gitea (source-slice needs the text). */
  private async loadFileMap(
    ledgerId: string,
    userId: string | undefined,
  ): Promise<{ files: FileMap; entryPoint: string; repoPaths: string[] }> {
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const client = await this.giteaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    return loadCachedFileMapForRepo(
      client as GiteaCommitClient,
      this.cacheHelper,
      ledgerOwner,
      ledgerName,
    );
  }

  /** Locate an entry's source span, validating a caller-supplied sha256. */
  private async locateSlice(
    files: FileMap,
    entryPoint: string,
    entryHash: string,
    sha256sum: string,
  ): Promise<EntrySlice> {
    const found = await findEntrySliceAsync(files, entryPoint, entryHash);
    if (!found) throw entryNotResolvableError(entryHash, files, entryPoint);
    if (found.sha256 !== sha256sum) {
      throw new ConflictError(
        "Entry",
        "it has changed since it was loaded; refresh and retry",
      );
    }
    return found;
  }

  /** Resolve a journal ID through any TS-plugin rewrite to its source block ID. */
  private async resolveSourceEntryId(
    files: FileMap,
    entryPoint: string,
    repoPaths: string[],
    entryHash: string,
  ): Promise<string> {
    const snapshot = await parseLedgerFiles(files, entryPoint, { repoPaths });
    return sourceEntryIds(snapshot.directives).get(entryHash) ?? entryHash;
  }

  /**
   * Commit source-slice edits (delete/replace) with optimistic-concurrency
   * safety: each transform re-locates + re-applies against the FRESH file
   * content immediately before the commit, and retries on a concurrent-write
   * conflict — so an edit can't silently clobber another writer.
   */
  private async commitTransforms(
    ledgerId: string,
    userId: string,
    transforms: Map<string, LedgerFileTransform>,
    message: string,
  ): Promise<void> {
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const client = await this.giteaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    await commitLedgerFiles(
      client as unknown as GiteaFileCommitClient,
      ledgerOwner,
      ledgerName,
      transforms,
      message,
    );
  }

  /** Apply Fava `get_filtered`, including TimeFilter's clamp semantics. */
  private async clampForJournal(
    directives: DirectiveJson[],
    opts: {
      account?: string;
      filter?: string;
      time?: string;
      fiscalYearEnd?: string;
      clamp: ReportAccounts["clamp"];
    },
  ): Promise<DirectiveJson[]> {
    try {
      const filtered = await filterDirectivesAsync(directives, {
        account: opts.account,
        filter: opts.filter,
      });
      if (!opts.time) return filtered;
      const range = parseDateRange(opts.time, opts.fiscalYearEnd);
      if (!range) throw new TimeFilterParseError(opts.time);
      return clampDirectives(filtered, range.begin, range.end, opts.clamp);
    } catch (error) {
      if (
        error instanceof TimeFilterParseError ||
        error instanceof AdvancedFilterParseError
      ) {
        throw new BadUserInputError(error.message);
      }
      throw error;
    }
  }

  /**
   * Apply the advanced filter, then — when `time` is set — CLAMP the stream
   * (Fava's TimeFilter runs `summarize.clamp_opt`, synthesizing the
   * opening-balance / retained-earnings / conversion entries) rather than
   * plain-truncating. The account journal's running balance MUST start from the
   * pre-window opening balance; a plain truncate would restart it from zero
   * inside the window.
   * Account selection stays in {@link accountJournalItems}, so the whole stream
   * is clamped here. Maps a bad `time`/`filter` to a 400.
   */
  private async clampForAccountJournal(
    directives: DirectiveJson[],
    opts: {
      filter?: string;
      time?: string;
      fiscalYearEnd?: string;
      clamp: ReportAccounts["clamp"];
    },
  ): Promise<DirectiveJson[]> {
    try {
      const filtered = await filterDirectivesAsync(directives, {
        filter: opts.filter,
      });
      if (!opts.time) return filtered;
      const range = parseDateRange(opts.time, opts.fiscalYearEnd);
      if (!range) throw new TimeFilterParseError(opts.time);
      return clampDirectives(filtered, range.begin, range.end, opts.clamp);
    } catch (error) {
      if (
        error instanceof TimeFilterParseError ||
        error instanceof AdvancedFilterParseError
      ) {
        throw new BadUserInputError(error.message);
      }
      throw error;
    }
  }

  /**
   * Serialize a directive, stamping its occurrence-disambiguated entry ID (so
   * two identical entries get distinct IDs — {@link buildEntryIdMap}). Falls
   * back to the bare content hash for a directive absent from the id map (e.g. a
   * synthetic clamp entry), which is never a user-editable duplicate.
   */
  private serialize(directive: DirectiveJson, entryId: string): JournalItem {
    return { ...serializeDirective(directive), entry_hash: entryId };
  }

  async getJournal(params: {
    ledgerId: string;
    userId: string | undefined;
    query?: JournalQueryParams;
  }): Promise<JournalResult> {
    const { ledgerId, userId, query } = params;
    const snapshot = await this.loadSnapshot(ledgerId, userId);
    const isEmpty = snapshot.directives.length === 0;

    // Assign occurrence-disambiguated entry IDs over the FULL unfiltered stream
    // (the same stream `getContext`/`findEntrySlice` resolve against), so a
    // duplicate's ID is stable regardless of how the journal is filtered/paged.
    const entryIds = buildEntryIdMap(snapshot.directives);

    const filtered = await this.clampForJournal(snapshot.directives, {
      account: query?.account || undefined,
      filter: query?.filter || undefined,
      time: query?.time || undefined,
      fiscalYearEnd: snapshot.fiscalYearEnd,
      clamp: snapshot.reportAccounts.clamp,
    });

    // Drop synthetic conversion ("C") and summarize ("S") transactions, reverse
    // (newest first), then serialize — mirrors journal.py get_journal.
    let items: JournalItem[] = filtered
      .filter(
        (d) =>
          !(d.type === "transaction" && (d.flag === "C" || d.flag === "S")),
      )
      .reverse()
      .map((d) => this.serialize(d, entryIds.get(d) ?? hashEntry(d)));

    if (query?.directiveTypes?.length) {
      const types = query.directiveTypes;
      items = items.filter((item) => filterDirectiveTypes(item, types));
    }
    if (query?.transactionSubtypes?.length) {
      const subtypes = query.transactionSubtypes;
      items = items.filter((item) => filterTransactionSubtypes(item, subtypes));
    }
    if (query?.documentSubtypes?.length) {
      const subtypes = query.documentSubtypes;
      items = items.filter((item) => filterDocumentSubtypes(item, subtypes));
    }
    if (query?.customSubtypes?.length) {
      const subtypes = query.customSubtypes;
      items = items.filter((item) => filterCustomSubtypes(item, subtypes));
    }

    const total = items.length;
    const offset = query?.offset ?? 0;
    const limit = query?.limit ?? 20;
    return {
      total,
      data: items.slice(offset, offset + limit) as unknown as Record<
        string,
        unknown
      >[],
      is_empty: isEmpty,
    };
  }

  async getContext(params: {
    ledgerId: string;
    userId: string | undefined;
    entryHash: string;
  }): Promise<EntryContextResult> {
    const { ledgerId, userId, entryHash } = params;
    const { files, entryPoint, repoPaths } = await this.loadFileMap(
      ledgerId,
      userId,
    );
    const { directives } = await parseLedgerFiles(files, entryPoint, {
      repoPaths,
    });
    const entryIds = buildEntryIdMap(directives);
    const directive = directives.find(
      (item) => entryIds.get(item) === entryHash,
    );
    const sourceEntryHash =
      directive === undefined
        ? entryHash
        : (getDirectiveSourceId(directive) ?? entryHash);

    const found = await findEntrySliceAsync(files, entryPoint, sourceEntryHash);
    if (!found) throw entryNotResolvableError(entryHash, files, entryPoint);

    const balances = entryBalances(directives, entryHash);

    return {
      entry: (directive
        ? this.serialize(directive, entryHash)
        : {}) as unknown as Record<string, unknown>,
      balances_before: balances?.before ?? null,
      balances_after: balances?.after ?? null,
      sha256sum: found.sha256,
      slice: found.slice,
    };
  }

  async plaintextJournal(params: {
    ledgerId: string;
    userId: string | undefined;
    query?: { account?: string; filter?: string; time?: string };
  }): Promise<PlaintextJournalResult> {
    const { ledgerId, userId, query } = params;
    const snapshot = await this.loadSnapshot(ledgerId, userId);
    const filtered = await this.clampForJournal(snapshot.directives, {
      account: query?.account || undefined,
      filter: query?.filter || undefined,
      time: query?.time || undefined,
      fiscalYearEnd: snapshot.fiscalYearEnd,
      clamp: snapshot.reportAccounts.clamp,
    });

    // The parsed title is a raw string that may itself contain quotes (escaped
    // quotes are legal beancount syntax); re-escape it so the emitted option
    // directive stays parseable instead of producing an invalid export.
    const title = (snapshot.options.title ?? "Journal Export")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
    const roots = snapshot.reportAccounts.roots;
    let content = ";; -*- mode: org; mode: beancount; -*-\n\n";
    content += `option "title" "${title} - Journal Export"\n\n`;
    for (const currency of snapshot.options.operating_currencies) {
      content += `option "operating_currency" "${currency}"\n`;
    }
    // Emit the ledger's ACTUAL root-account names (recovered from the source,
    // since the WASM doesn't surface `name_*` overrides). Hardcoding the
    // beancount defaults would make a ledger that renames a root — e.g.
    // `option "name_assets" "Actif"` — export an INVALID file where every
    // `Actif:*` posting fails validation (E1005) on re-parse.
    content += `\noption "name_assets" "${roots.assets}"\n`;
    content += `option "name_liabilities" "${roots.liabilities}"\n`;
    content += `option "name_equity" "${roots.equity}"\n`;
    content += `option "name_income" "${roots.income}"\n`;
    content += `option "name_expenses" "${roots.expenses}"\n`;
    content += 'plugin "beancount.plugins.auto_accounts"\n\n';

    for (const directive of filtered) {
      const isTxn = directive.type === "transaction";
      const isBalance = directive.type === "balance";
      if (!isTxn && !isBalance) continue;
      if (isTxn && PLAINTEXT_EXCLUDED_FLAGS.has(directive.flag)) continue;
      content += `${directiveToText(directive)}\n`;
    }

    return { content };
  }

  async getAccountJournal(params: {
    ledgerId: string;
    userId: string | undefined;
    query: AccountJournalQueryParams;
  }): Promise<AccountJournalResult> {
    const { ledgerId, userId, query } = params;
    const conversion = query.conversion || "at_cost";
    const withChildren =
      query.with_children !== undefined ? query.with_children : true;

    const snapshot = await this.loadSnapshot(ledgerId, userId);
    // Occurrence-disambiguated IDs over the full stream (as in getJournal), so
    // the account view's edit/delete links target the right duplicate.
    const entryIds = buildEntryIdMap(snapshot.directives);
    // Clamp (not truncate) on `time` so the running balance carries the opening
    // balance into the window; honors the ledger's fiscal-year-end + clamp
    // account names.
    const filtered = await this.clampForAccountJournal(snapshot.directives, {
      filter: query.filter || undefined,
      time: query.time || undefined,
      fiscalYearEnd: snapshot.fiscalYearEnd,
      clamp: snapshot.reportAccounts.clamp,
    });
    // Value/currency conversions use the FULL ledger's price map (fava values
    // against `ledger.prices`, not the filtered/clamped stream).
    const prices =
      conversion !== "units" && conversion !== "at_cost"
        ? buildScaledPriceMap(snapshot.directives)
        : undefined;
    // account_journal returns chronological; the endpoint reverses + paginates.
    const rows = accountJournalItems(filtered, query.account, {
      withChildren,
      conversion,
      prices,
    }).reverse();
    const total = rows.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    return {
      items: rows.slice(offset, offset + limit).map((row) => ({
        entry: this.serialize(
          row.entry,
          entryIds.get(row.entry) ?? hashEntry(row.entry),
        ) as unknown as Record<string, unknown>,
        change: row.change,
        balance: row.balance,
      })),
      total,
      account: query.account,
      with_children: withChildren,
    };
  }

  async deleteSourceSlice(params: {
    ledgerId: string;
    userId: string;
    entryHash: string;
    sha256sum: string;
  }): Promise<DeleteSliceResult> {
    const { ledgerId, userId, entryHash, sha256sum } = params;
    const { files, entryPoint, repoPaths } = await this.loadFileMap(
      ledgerId,
      userId,
    );
    const sourceEntryHash = await this.resolveSourceEntryId(
      files,
      entryPoint,
      repoPaths,
      entryHash,
    );

    // Locate on the loaded snapshot to find WHICH file the entry is in (and
    // fast-fail if it changed since the client loaded it); the commit transform
    // re-locates + re-deletes against the fresh content under CAS.
    const found = await this.locateSlice(
      files,
      entryPoint,
      sourceEntryHash,
      sha256sum,
    );
    await this.commitTransforms(
      ledgerId,
      userId,
      new Map([
        [
          found.file,
          makeDeleteTransform(found.file, [
            {
              base: parseEntryId(sourceEntryHash).base,
              localOccurrence: found.localOccurrence,
              sha256sum,
              startLine: found.startLine,
            },
          ]),
        ],
      ]),
      "Delete entry",
    );
    return { message: "Entry deleted successfully", entryHash };
  }

  async deleteMultiSourceSlices(params: {
    ledgerId: string;
    userId: string;
    entries: { entryHash: string; sha256sum: string }[];
  }): Promise<DeleteMultiSlicesResult> {
    const { ledgerId, userId, entries } = params;
    const { files, entryPoint, repoPaths } = await this.loadFileMap(
      ledgerId,
      userId,
    );
    const snapshot = await parseLedgerFiles(files, entryPoint, { repoPaths });
    const sourceIds = sourceEntryIds(snapshot.directives);
    const sourceHashes = entries.map(
      (entry) => sourceIds.get(entry.entryHash) ?? entry.entryHash,
    );

    // Locate + validate every entry on the loaded snapshot (all-or-nothing) to
    // find which file each lives in and fast-fail on a stale load.
    const located: EntrySlice[] = [];
    for (const [index, entry] of entries.entries()) {
      located.push(
        await this.locateSlice(
          files,
          entryPoint,
          sourceHashes[index],
          entry.sha256sum,
        ),
      );
    }

    // Group targets by file (base + LOCAL occurrence per entry), DEDUPING by
    // resolved identity first: a double-submitted {entryHash, sha256sum} pair
    // resolves to the same block, and applying the same line-range deletion
    // twice (bottom-to-top) would delete whatever content shifted into the
    // range on the second pass. Then one re-locating delete transform per file
    // — each re-locates + deletes bottom-to-top against fresh content.
    const byFile = new Map<string, SliceTarget[]>();
    const seenTargets = new Set<string>();
    const deletedHashes: string[] = [];
    located.forEach((slice, index) => {
      const { base } = parseEntryId(sourceHashes[index]);
      const identity = `${slice.file}\u0000${slice.sha256}\u0000${slice.localOccurrence}`;
      if (seenTargets.has(identity)) return;
      seenTargets.add(identity);
      deletedHashes.push(entries[index].entryHash);
      const target: SliceTarget = {
        base,
        localOccurrence: slice.localOccurrence,
        sha256sum: entries[index].sha256sum,
        startLine: slice.startLine,
      };
      const list = byFile.get(slice.file);
      if (list) list.push(target);
      else byFile.set(slice.file, [target]);
    });

    const transforms = new Map(
      [...byFile.entries()].map(
        ([file, fileEntries]) =>
          [file, makeDeleteTransform(file, fileEntries)] as const,
      ),
    );

    await this.commitTransforms(ledgerId, userId, transforms, "Delete entries");
    return {
      message: `Deleted ${deletedHashes.length} entries successfully`,
      deletedHashes,
    };
  }

  async updateSourceSlice(params: {
    ledgerId: string;
    userId: string;
    entryHash: string;
    sha256sum: string;
    newContent: string;
  }): Promise<UpdateSliceResult> {
    const { ledgerId, userId, entryHash, sha256sum, newContent } = params;
    const { files, entryPoint, repoPaths } = await this.loadFileMap(
      ledgerId,
      userId,
    );
    const sourceEntryHash = await this.resolveSourceEntryId(
      files,
      entryPoint,
      repoPaths,
      entryHash,
    );

    const found = await this.locateSlice(
      files,
      entryPoint,
      sourceEntryHash,
      sha256sum,
    );
    await this.commitTransforms(
      ledgerId,
      userId,
      new Map([
        [
          found.file,
          makeReplaceTransform(
            found.file,
            {
              base: parseEntryId(sourceEntryHash).base,
              localOccurrence: found.localOccurrence,
              sha256sum,
              startLine: found.startLine,
            },
            newContent,
          ),
        ],
      ]),
      "Update entry",
    );
    return {
      message: "Entry updated successfully",
      entryHash,
      newSha256sum: sliceSha256(newContent),
    };
  }
}
