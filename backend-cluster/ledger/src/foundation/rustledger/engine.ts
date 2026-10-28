import type {
  BeancountError,
  DirectiveJson,
  FileMap,
  FormatResult,
  Ledger,
  LedgerOptions,
  QueryResult,
} from "@rustledger/wasm";
import { dropUnparsedTransactions, locateParseErrors } from "./parse-errors";
import { restoreEntrySortOrder } from "./entry-sort-order";
import { dropPaddingWithinTolerance } from "./pad-tolerance";
import { errorsHiddenByUnusedPads } from "./pad-recheck";
import { withBalanceErrorDates } from "./balance-error-dates";
import { loadRustledger } from "./loader";
import { queryResultToRecords, type QueryRecordsResult } from "./mappers";
import { buildSnapshotCacheKey, CoalescingLruCache } from "./snapshot-cache";
import { LedgerHandleCache } from "./ledger-handle-cache";
import {
  applyPlugins,
  captureDirectiveSourceIds,
  captureDirectiveSourceLocations,
  captureGeneratedDirectives,
  collectLedgerPlugins,
  getDirectiveSourceId,
  getDirectiveSourceLocation,
  HANDLED_PLUGIN_NAMES,
  inheritDirectiveSourceId,
  markGeneratedDirective,
  seedDirectiveSourceIds,
  restoreDirectiveSourceIds,
  restoreDirectiveSourceLocations,
  restoreGeneratedDirectives,
  localTodayStr,
  neutralizeIncludedOptionsAndPlugins,
  skippedPluginWarning,
  stripFavaPlugins,
  type DirectiveSourceLocation,
} from "./plugins";
import { reconcileDocumentErrors } from "./document-validation";
import { averageBookingErrors } from "./average-booking";
import { openAutoAccounts } from "./auto-accounts";
import { reportPreOpenUses } from "./pre-open-uses";
import { orderMetaAsWritten } from "./meta-order";
import {
  discoverDocuments,
  mergeDiscoveredDocuments,
} from "./document-discovery";
import {
  inactiveAfterGeneratedCloses,
  inactivePads,
  withoutDroppedCloseErrors,
  withoutGeneratedCloseErrors,
} from "./generated-closes";
import { reconcileCheckCommodityErrors } from "./check-commodity";
import { coherentCostErrors } from "./coherent-cost";
import { sellGainsErrors } from "./sell-gains";
import { reconcileLeafOnlyErrors } from "./leafonly";
import { duplicateEntryErrors, locateDuplicateErrors } from "./noduplicates";
import { reconcileNounusedErrors } from "./nounused";
import { reconcileOneCommodityErrors } from "./one-commodity";
import { reconcileUniquePriceErrors } from "./unique-prices";
import { locateBookErrors } from "./book-errors";
import {
  isRawPluginProcessing,
  locateOptionErrors,
  reconcileOptionErrors,
  withoutPadAndBalanceChecks,
} from "./option-validation";
import { isDocumentValidationError } from "./document-validation";
import {
  locateIncludeAndPluginErrors,
  reportUrlIncludes,
} from "./url-include-errors";
import { explainUnknownPlugins } from "./plugin-typos";
import { parseableFiles } from "./parseable-files";
import { reportUndecodableSources } from "./undecodable-sources";
import { collapsedCostOfSumError } from "./cost-of-sum-guard";
import { unresolvedNameError } from "./unresolved-name-guard";
import { integerOverflowError } from "./integer-overflow-guard";
import { windowFromError } from "./window-from-guard";
import { atValueError } from "./at-value-guard";
import { starAliasError } from "./star-alias-guard";
import { idColumnError } from "./id-column-guard";
import { compositeComparisonError } from "./composite-comparison-guard";
import { inventoryGroupByError } from "./inventory-group-by-guard";
import { groupByCoverageError } from "./group-by-coverage-guard";
import { mixedComparisonError } from "./mixed-comparison-guard";
import { OPTION_LINE_RE } from "./beancount-options";
import { directiveToText } from "./journal-serialize";
import {
  buildSourceDetailsProbe,
  sourceDetailsFromProbe,
  type EntrySourceDetails,
  type SourceSyntax,
} from "./source-slice";
import { getRustledgerWorkerPool } from "./rustledger-worker-pool";

const UNSUPPORTED_JS_INTEGER_MESSAGE =
  "can't be represented as a JavaScript number";

/** Rustledger rejects integer query cells outside JS safe-integer range. */
export function isUnsupportedIntegerResultError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes(UNSUPPORTED_JS_INTEGER_MESSAGE)
  );
}

function unsupportedIntegerResultQueryError(
  causeMessage?: string,
): QueryResult {
  const maxSafe = Number.MAX_SAFE_INTEGER;
  const minSafe = Number.MIN_SAFE_INTEGER;
  const detail =
    causeMessage ??
    `Query result integer is outside the supported JavaScript safe-integer range (${minSafe} to ${maxSafe}); use a decimal literal (for example ${maxSafe}.0) to preserve exact digits.`;
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message: detail,
        code: null,
        phase: "query",
        hint: null,
        file: null,
        line: null,
        column: null,
        end_line: null,
        end_column: null,
        severity: "error",
      },
    ],
  };
}

/**
 * A fully-materialized snapshot of a parsed ledger. Every field is plain JSON
 * copied out of the WASM ledger before its native memory is released, so the
 * snapshot is safe to hold, cache, and serialize across a request.
 */
export interface LedgerSnapshot {
  valid: boolean;
  errors: BeancountError[];
  options: LedgerOptions;
  directives: DirectiveJson[];
  directiveCount: number;
  /** Worker-safe provenance, parallel to `directives`; internal engine data. */
  sourceIds?: Array<string | null>;
  /**
   * Each directive's declaring file and line, parallel to `directives`, so a
   * Document path resolves against its own file after the worker clone
   * (w4/301).
   */
  sourceLocations?: Array<DirectiveSourceLocation | null>;
  /** Which directives are generated copies, parallel to `directives`. */
  generated?: boolean[];
  /** Complete source index, built only for callers that explicitly request it. */
  sourceDetails?: Record<string, EntrySourceDetails>;
}

/** Raw WASM snapshot plus the built-in pad plugin's synthesized postings. */
interface ParsedLedgerSnapshot extends LedgerSnapshot {
  paddingTransactions: DirectiveJson[];
}

export interface ParseLedgerOptions {
  applyTsPlugins?: boolean;
  today?: string;
  repoPaths?: string[];
  /** Build source metadata for every dated block inside the worker/cache. */
  includeSourceDetails?: boolean;
}

/**
 * Parse `files` (a `path -> contents` map, with `include` resolved from
 * `entryPoint`) into a stateful WASM {@link Ledger}, run `fn` against it, and
 * ALWAYS release the ledger's native memory afterward.
 *
 * `fn` must fully materialize whatever it needs (the WASM accessors return
 * plain JSON) — do not return the live `Ledger` or lazy references to it, since
 * it is freed as soon as `fn` returns.
 */
export async function withLedger<T>(
  files: FileMap,
  entryPoint: string,
  fn: (ledger: Ledger) => T,
): Promise<T> {
  const mod = await loadRustledger();
  const ledger = mod.Ledger.fromFiles(
    parseableFiles(files, entryPoint),
    entryPoint,
  );
  try {
    return fn(ledger);
  } finally {
    ledger.free();
  }
}

/** Materialize the plain snapshot out of a live WASM ledger. */
function snapshotOf(ledger: Ledger): ParsedLedgerSnapshot {
  const expandedPads = ledger.expandPads();
  return {
    valid: ledger.isValid(),
    errors: ledger.getErrors(),
    options: ledger.getOptions(),
    directives: expandedPads.directives,
    directiveCount: ledger.directiveCount(),
    paddingTransactions: expandedPads.padding_transactions,
  };
}

const DIRECTIVE_SORT_ORDER: Partial<Record<DirectiveJson["type"], number>> = {
  open: -2,
  balance: -1,
  document: 1,
  close: 2,
};

function paddingPairKey(
  date: string,
  account: string,
  sourceAccount: string,
): string {
  return `${date}\0${account}\0${sourceAccount}`;
}

function paddingTransactionKey(directive: DirectiveJson): string | undefined {
  if (
    directive.type !== "transaction" ||
    directive.flag !== "P" ||
    directive.postings.length < 2
  ) {
    return undefined;
  }
  return paddingPairKey(
    directive.date,
    directive.postings[0].account,
    directive.postings[1].account,
  );
}

/**
 * Insert rustledger's generated padding transactions into the directive stream.
 * Beancount's built-in pad plugin places each generated `P` transaction directly
 * after the `Pad` that produced it. Rustledger returns those transactions in a
 * side array instead, so restore that stream shape before any report walks it.
 */
function mergePaddingTransactions(
  directives: DirectiveJson[],
  paddingTransactions: DirectiveJson[],
): DirectiveJson[] {
  if (paddingTransactions.length === 0) return directives;

  const pending = new Map<string, DirectiveJson[]>();
  const unkeyed: DirectiveJson[] = [];
  paddingTransactions.forEach((transaction) => {
    const key = paddingTransactionKey(transaction);
    if (key === undefined) {
      unkeyed.push(transaction);
      return;
    }
    const transactions = pending.get(key);
    if (transactions) transactions.push(transaction);
    else pending.set(key, [transaction]);
  });

  const merged: DirectiveJson[] = [];
  directives.forEach((directive) => {
    merged.push(directive);
    if (directive.type !== "pad") return;
    const key = paddingPairKey(
      directive.date,
      directive.account,
      directive.source_account,
    );
    const transactions = pending.get(key);
    if (!transactions) return;
    transactions.forEach((transaction) => {
      inheritDirectiveSourceId(directive, transaction);
      markGeneratedDirective(transaction);
      merged.push(transaction);
    });
    pending.delete(key);
  });

  const unmatched = [...pending.values()].flat().concat(unkeyed);
  if (unmatched.length === 0) return merged;
  unmatched.forEach(markGeneratedDirective);

  // Defensive fallback for a future rustledger wire-shape change: retain every
  // generated posting and restore Beancount's entry_sortkey chronology.
  return [...merged, ...unmatched]
    .map((directive, index) => ({ directive, index }))
    .sort((left, right) => {
      const dateOrder = left.directive.date.localeCompare(right.directive.date);
      if (dateOrder !== 0) return dateOrder;
      const typeOrder =
        (DIRECTIVE_SORT_ORDER[left.directive.type] ?? 0) -
        (DIRECTIVE_SORT_ORDER[right.directive.type] ?? 0);
      return typeOrder !== 0 ? typeOrder : left.index - right.index;
    })
    .map(({ directive }) => directive);
}

const MATERIALIZED_ENTRY_POINT = "__plugin_transformed__.bean";

interface MaterializedDirectiveStream {
  files: FileMap;
  sourceByLine: ReadonlyMap<number, DirectiveSourceLocation>;
}

function materializeDirectiveStreamWithSourceMap(
  directives: DirectiveJson[],
  entryPointSource: string | undefined,
  materializeOptions: { omitPadDirectives?: boolean } = {},
): MaterializedDirectiveStream {
  const optionLines = (entryPointSource ?? "")
    .split(/\r\n|\r|\n/u)
    .filter((line) => OPTION_LINE_RE.test(line));
  const segments: Array<{
    text: string;
    source?: DirectiveSourceLocation;
  }> = [
    ...optionLines.map((text) => ({ text })),
    ...directives
      .filter(
        (directive) =>
          materializeOptions.omitPadDirectives !== true ||
          directive.type !== "pad",
      )
      .map((directive) => ({
        text: directiveToText(directive),
        source: getDirectiveSourceLocation(directive),
      })),
  ];
  const sourceByLine = new Map<number, DirectiveSourceLocation>();
  let currentLine = 1;
  segments.forEach((segment, index) => {
    if (index > 0) currentLine += 2; // `join("\n\n")`
    const lineCount =
      segment.text.split("\n").length - (segment.text.endsWith("\n") ? 1 : 0);
    if (segment.source !== undefined) {
      for (let offset = 0; offset < lineCount; offset += 1) {
        sourceByLine.set(currentLine + offset, segment.source);
      }
    }
    currentLine += segment.text.match(/\n/gu)?.length ?? 0;
  });
  const source = segments.map((segment) => segment.text).join("\n\n");
  return {
    files: {
      [MATERIALIZED_ENTRY_POINT]: source.length > 0 ? `${source}\n` : "",
    },
    sourceByLine,
  };
}

function remapMaterializedError(
  error: BeancountError,
  sourceByLine: ReadonlyMap<number, DirectiveSourceLocation>,
): BeancountError {
  const source =
    error.line === null || error.line === undefined
      ? undefined
      : sourceByLine.get(error.line);
  return {
    ...error,
    file: source?.filename ?? null,
    line: source?.lineno ?? null,
    column: null,
    end_line: null,
    end_column: null,
  };
}

/** Re-run the built-in pad plugin after a TS user plugin changed the stream. */
async function expandTransformedPads(
  directives: DirectiveJson[],
  entryPointSource: string | undefined,
): Promise<DirectiveJson[]> {
  if (!directives.some((directive) => directive.type === "pad")) return [];
  const materialized = materializeDirectiveStreamWithSourceMap(
    directives,
    entryPointSource,
  );
  return withLedger(
    materialized.files,
    MATERIALIZED_ENTRY_POINT,
    (ledger) => ledger.expandPads().padding_transactions,
  );
}

async function transformedValidationErrors(
  directives: DirectiveJson[],
  entryPointSource: string | undefined,
): Promise<BeancountError[] | null> {
  const materialized = materializeDirectiveStreamWithSourceMap(
    directives,
    entryPointSource,
  );
  const snapshot = await withLedger(
    materialized.files,
    MATERIALIZED_ENTRY_POINT,
    snapshotOf,
  );
  // A renderer defect must not replace trustworthy errors from the original
  // parse with validation over a partial synthetic stream.
  if (snapshot.errors.some((error) => error.phase === "parse")) return null;
  return snapshot.errors
    .filter(
      (error) =>
        error.phase === "validate" && !isDocumentValidationError(error),
    )
    .map((error) => remapMaterializedError(error, materialized.sourceByLine));
}

/**
 * Restore the tags and links rustledger leaves off a Document (inline ones,
 * pushed tags) or a Note (all of them, w21/655) from the source.
 */
function mergeSourceSyntax(
  directives: DirectiveJson[],
  sourceDetails: ReadonlyMap<string, EntrySourceDetails>,
): DirectiveJson[] {
  return directives.map((directive) => {
    if (directive.type !== "document" && directive.type !== "note") {
      return directive;
    }
    const sourceId = getDirectiveSourceId(directive);
    const detail =
      sourceId === undefined ? undefined : sourceDetails.get(sourceId);
    const own = directive as SourceSyntax;
    const tags = [
      ...new Set([...(own.tags ?? []), ...(detail?.syntaxTags ?? [])]),
    ];
    const links = [
      ...new Set([...(own.links ?? []), ...(detail?.syntaxLinks ?? [])]),
    ];
    if (tags.length === 0 && links.length === 0) return directive;
    const enriched: DirectiveJson = {
      ...directive,
      ...(tags.length > 0 ? { tags } : {}),
      ...(links.length > 0 ? { links } : {}),
    };
    inheritDirectiveSourceId(directive, enriched);
    return enriched;
  });
}

/**
 * Whether any file declares a `pad`. The engine pads every non-zero difference,
 * and the parse path drops the padding a balance's tolerance would not (w21/135),
 * so BQL has to run over that corrected stream or it sums the padded balance the
 * journal and trial balance do not show (w21/323).
 */
function sourceHasPad(files: FileMap): boolean {
  return Object.values(files).some((source) =>
    /^\d{4}-\d{2}-\d{2}\s+pad\s/mu.test(source),
  );
}

/**
 * Whether a note may carry tags or links rustledger drops: a note line with a
 * `#`/`^` token, or a note in a file that pushes tags (w21/655). Cheap and
 * loose; a false positive only costs the source probe.
 */
function sourceHasNoteSyntax(files: FileMap): boolean {
  return Object.values(files).some((source) => {
    const notes = source.match(/^\d{4}-\d{2}-\d{2}\s+note\s.*$/gmu);
    if (notes === null) return false;
    return (
      /^pushtag\s/mu.test(source) ||
      notes.some((line) => /\s[#^][A-Za-z0-9\-_/.]+/u.test(line))
    );
  });
}

function sourceHasTaggedDocument(files: FileMap): boolean {
  return Object.values(files).some((source) =>
    source
      .split(/\r\n|\r|\n/u)
      .some(
        (line) =>
          /^\d{4}-\d{2}-\d{2}\s+document\s/u.test(line) &&
          /\s[#^][A-Za-z0-9\-_/.]+/u.test(line),
      ),
  );
}

/**
 * Parse a (multi-file) ledger into a plain {@link LedgerSnapshot}.
 *
 * When the entry point declares any `fava.plugins.*` plugin (which the WASM
 * cannot run — it would emit `E8005` and mark the ledger invalid), those
 * directives are stripped before parsing and the plugins are reimplemented in
 * the TS post-parse layer (`./plugins`): the returned `directives` are already
 * transformed, `valid` reflects post-strip validity, `directiveCount` is
 * recomputed from the transformed stream, and unsupported fava plugins surface a
 * friendly `TS_PLUGIN_SKIPPED` warning instead of the raw `E8005`. Native
 * beancount plugins (e.g. `auto_accounts`) are left for the WASM to run.
 *
 * **Snapshots are cached and SHARED across requests** (see the cache below):
 * treat the returned snapshot as immutable — the top-level object and its
 * `errors`/`directives` arrays are frozen; derive new arrays instead of
 * mutating (the codebase's filter/clamp/serialize layers already do).
 *
 * @param options.applyTsPlugins - set `false` to skip the TS plugin layer (raw parse).
 * @param options.today - inject a fixed `YYYY-MM-DD` "today" (amortize future-filter; for tests).
 */
export async function parseLedgerFiles(
  files: FileMap,
  entryPoint: string,
  options: ParseLedgerOptions = {},
): Promise<LedgerSnapshot> {
  // Jest transforms TypeScript in-process and cannot bootstrap the production
  // worker entry. Unit tests exercise the identical in-process implementation;
  // the real-WASM verifier exercises the worker-thread boundary.
  if (process.env.JEST_WORKER_ID !== undefined) {
    return parseLedgerFilesInProcess(files, entryPoint, options);
  }
  const workerOptions = {
    ...options,
    today: options.today ?? localTodayStr(),
  };
  const key = buildSnapshotCacheKey({
    files,
    entryPoint,
    effectiveToday: workerOptions.today,
    repoPaths: options.repoPaths,
    applyTsPlugins: options.applyTsPlugins,
    includeSourceDetails: options.includeSourceDetails,
  });
  return workerSnapshotCache.getOrLoad(key, async () => {
    const snapshot = await getRustledgerWorkerPool().parse(
      files,
      entryPoint,
      workerOptions,
    );
    if (snapshot.sourceIds !== undefined) {
      restoreDirectiveSourceIds(snapshot.directives, snapshot.sourceIds);
    }
    if (snapshot.sourceLocations !== undefined) {
      restoreDirectiveSourceLocations(
        snapshot.directives,
        snapshot.sourceLocations,
      );
    }
    if (snapshot.generated !== undefined) {
      restoreGeneratedDirectives(snapshot.directives, snapshot.generated);
    }
    return Object.freeze({
      ...snapshot,
      errors: Object.freeze(snapshot.errors) as BeancountError[],
      directives: Object.freeze(snapshot.directives) as DirectiveJson[],
      ...(snapshot.sourceIds
        ? {
            sourceIds: Object.freeze(snapshot.sourceIds) as Array<
              string | null
            >,
          }
        : {}),
      ...(snapshot.generated
        ? { generated: Object.freeze(snapshot.generated) as boolean[] }
        : {}),
      ...(snapshot.sourceLocations
        ? {
            sourceLocations: Object.freeze(
              snapshot.sourceLocations,
            ) as Array<DirectiveSourceLocation | null>,
          }
        : {}),
      ...(snapshot.sourceDetails
        ? { sourceDetails: Object.freeze(snapshot.sourceDetails) }
        : {}),
    });
  });
}

/** Worker-local implementation; request-path callers use parseLedgerFiles. */
export async function parseLedgerFilesInProcess(
  files: FileMap,
  entryPoint: string,
  options: ParseLedgerOptions = {},
): Promise<LedgerSnapshot> {
  const key = buildSnapshotCacheKey({
    files,
    entryPoint,
    // Resolve the plugin-effective day into the key so a snapshot can never
    // serve past midnight (amortize_over drops future-dated copies by "today").
    effectiveToday: options.today ?? localTodayStr(),
    repoPaths: options.repoPaths,
    applyTsPlugins: options.applyTsPlugins,
    includeSourceDetails: options.includeSourceDetails,
  });
  return snapshotCache.getOrLoad(key, () =>
    parseLedgerFilesUncached(files, entryPoint, options),
  );
}

/**
 * Worker-local parsed-snapshot cache: `Ledger.fromFiles` is synchronous WASM
 * parse (~100ms+/MB), and one dashboard screen fans out to many resolvers that
 * each re-parse the same commit — without this, N resolvers = N parses of
 * identical content back-to-back. Keyed by full content hash (files +
 * entry point + effective today + repoPaths + plugin switch), so correctness
 * is content-addressed: a push changes the FileMap → new key; midnight → new
 * key. Capacity bounds memory by ENTRY COUNT — a 1 MB ledger's snapshot is a
 * few MB of heap, so 8 entries ≈ tens of MB worst case.
 */
const SNAPSHOT_CACHE_MAX_ENTRIES = 8;
const snapshotCache = new CoalescingLruCache<LedgerSnapshot>(
  SNAPSHOT_CACHE_MAX_ENTRIES,
);
// Worker responses cross a structured-clone boundary, so retain the same
// content-addressed object identity/coalescing contract for request callers.
const workerSnapshotCache = new CoalescingLruCache<LedgerSnapshot>(
  SNAPSHOT_CACHE_MAX_ENTRIES,
);

/** Test hook: reset the shared snapshot cache (stubs vary per test case). */
export function clearLedgerSnapshotCache(): void {
  snapshotCache.clear();
  workerSnapshotCache.clear();
}

async function parseLedgerFilesUncached(
  files: FileMap,
  entryPoint: string,
  options: ParseLedgerOptions = {},
): Promise<LedgerSnapshot> {
  const declared = collectLedgerPlugins(files[entryPoint]);
  const applyTs =
    options.applyTsPlugins !== false &&
    declared.some((name) => name.startsWith("fava.plugins."));
  const hasHandledPlugin =
    applyTs && declared.some((name) => HANDLED_PLUGIN_NAMES.has(name));

  // Beancount reads option/plugin ONLY from the entry point; the WASM applies
  // them from included files too, which can invalidate an otherwise-valid ledger
  // (e.g. an included `option "name_assets"` renames a root so entry-point
  // postings fail E1005). Blank those included directives (line-preserving) first.
  const scoped = neutralizeIncludedOptionsAndPlugins(files, entryPoint);
  const stripResult = applyTs
    ? stripFavaPlugins(scoped, entryPoint)
    : undefined;
  const raw = await withLedger(
    stripResult?.strippedFiles ?? scoped,
    entryPoint,
    snapshotOf,
  );

  // Beancount's same-day order, before plugins and pad expansion walk it: the
  // engine groups a day by directive kind (w21/134).
  // A syntax error is reported once per file with no location; find it
  // (w21/187).
  const located = locateParseErrors(
    raw.errors,
    parseableFiles(stripResult?.strippedFiles ?? scoped, entryPoint),
    entryPoint,
    await loadRustledger(),
  );
  let directives = dropUnparsedTransactions(
    restoreEntrySortOrder(
      raw.directives,
      stripResult?.strippedFiles ?? scoped,
      entryPoint,
    ),
    located,
    stripResult?.strippedFiles ?? scoped,
  );
  let errors = located;
  let paddingTransactions = raw.paddingTransactions;
  // Beancount finds `option "documents"` files before any plugin (w21/738).
  const discovered = discoverDocuments(
    directives,
    files[entryPoint],
    entryPoint,
    options.repoPaths,
  );
  errors = [...errors, ...discovered.errors];

  // rustledger 0.21's Document JSON omits inline tags/links. Recover them from
  // raw source, while also building the file/line sidecar needed by
  // link_documents' source-relative path resolution.
  let sourceDetails: Map<string, EntrySourceDetails> | undefined;
  if (
    options.includeSourceDetails === true ||
    hasHandledPlugin ||
    directives.some((directive) => directive.type === "document") ||
    discovered.documents.length > 0 ||
    sourceHasNoteSyntax(files)
  ) {
    const needsCompleteSourceIndex =
      options.includeSourceDetails === true || hasHandledPlugin;
    const sourceProbe = buildSourceDetailsProbe(
      stripResult?.strippedFiles ?? scoped,
      files,
    );
    const probedDirectives = await withLedger(
      sourceProbe.files,
      entryPoint,
      (ledger) => ledger.getDirectives(),
    );
    sourceDetails = sourceDetailsFromProbe(probedDirectives, sourceProbe, {
      syntaxOnly: !needsCompleteSourceIndex,
    });
  }
  // A padding entry takes the ID of the pad it came from, so its detail opens
  // on a ledger with no plugins too (w21/875).
  const tracksSourceIds =
    applyTs ||
    sourceDetails !== undefined ||
    raw.paddingTransactions.length > 0;
  if (tracksSourceIds) {
    seedDirectiveSourceIds(directives, sourceDetails);
  }
  if (sourceDetails !== undefined) {
    directives = mergeSourceSyntax(directives, sourceDetails);
  }
  // After the source is indexed: a discovered document has no source of its
  // own, and an identical written one must keep its identity.
  directives = mergeDiscoveredDocuments(directives, discovered.documents);

  // Whether the balances were checked on the plugins' transformed stream.
  let validatedTransformed = false;
  if (applyTs && stripResult) {
    const applied = applyPlugins(declared, directives, raw.options, {
      today: options.today ?? localTodayStr(),
    });
    directives = applied.directives;
    const warnings = stripResult.stripped
      .filter((plugin) => !HANDLED_PLUGIN_NAMES.has(plugin.name))
      .map((plugin) =>
        skippedPluginWarning(plugin.name, plugin.line, entryPoint),
      );
    const pluginErrors = [...applied.errors, ...warnings];
    const revalidated = hasHandledPlugin
      ? await transformedValidationErrors(directives, files[entryPoint])
      : null;
    validatedTransformed = revalidated !== null;
    if (revalidated === null) {
      errors = [...errors, ...pluginErrors];
    } else {
      // Beancount validates AFTER plugins. Preserve parse/lint/native-plugin
      // errors and the original file-aware document checks, but replace every
      // other pre-transform validation result with validation of the transformed
      // stream (notably balance assertions affected by amortize_over).
      errors = [
        ...errors.filter(
          (error) =>
            error.phase !== "validate" || isDocumentValidationError(error),
        ),
        // Discovery placed a misdated document's error already (w21/758).
        ...revalidated.filter(
          (error) =>
            error.file !== null ||
            ![...discovered.misdated].some(
              (account) =>
                error.message ===
                `Invalid reference to unknown account '${account}'`,
            ),
        ),
        ...pluginErrors,
      ];
    }

    if (hasHandledPlugin) {
      paddingTransactions = await expandTransformedPads(
        directives,
        files[entryPoint],
      );
    }
  }

  // The WASM engine has no filesystem, so its `document`/`option "documents"`
  // existence checks always fail. Reconcile them against the real repo file
  // inventory (`repoPaths`), then recompute validity from the resulting errors.
  errors = reconcileDocumentErrors(errors, options.repoPaths);
  errors = locateOptionErrors(reconcileOptionErrors(errors), files, entryPoint);
  // Beancount refuses a sale from an AVERAGE position; rustledger books it.
  errors = [...errors, ...averageBookingErrors(directives, files, entryPoint)];
  // Beancount's unique_prices refuses only same-day prices that disagree.
  errors = reconcileUniquePriceErrors(errors, directives, files, entryPoint);
  // Beancount's onecommodity honours its opt-outs; rustledger's does not.
  errors = reconcileOneCommodityErrors(errors, directives, files, entryPoint);
  // Beancount's nounused and check_commodity report errors, not advice.
  errors = reconcileNounusedErrors(errors, directives, files, entryPoint);
  errors = reconcileCheckCommodityErrors(errors, directives, files, entryPoint);
  // Beancount places these plugins' errors; leafonly once per account, and
  // coherent_cost, which the engine does not run (w21/740).
  errors = reconcileLeafOnlyErrors(errors, directives, files, entryPoint);
  errors = locateDuplicateErrors(errors, files, entryPoint);
  errors = [...errors, ...duplicateEntryErrors(files, entryPoint)];
  errors = [...errors, ...coherentCostErrors(directives, files, entryPoint)];
  errors = [...errors, ...sellGainsErrors(directives, files, entryPoint)];
  // The engine validates before its plugins add close_tree's closes, and its
  // auto_accounts opens no account named only by a note or a close (w21/737).
  // A stream revalidated after the fava plugins saw those closes already, as
  // the engine makes them: its errors give way to these, or each posting was
  // reported twice (w21/755) and a late child's close lost its place (w21/776).
  if (validatedTransformed) {
    errors = withoutGeneratedCloseErrors(errors, directives, files, entryPoint);
  }
  errors = [
    ...errors,
    ...inactiveAfterGeneratedCloses(directives, files, entryPoint),
  ];
  // The engine checks only transactions against a close (w21/756).
  errors = [...errors, ...inactivePads(directives, files, entryPoint)];
  ({ directives, errors } = openAutoAccounts(
    directives,
    errors,
    files[entryPoint],
  ));
  // Beancount's close_tree drops a close whose account it does not see opened.
  errors = withoutDroppedCloseErrors(errors, files, entryPoint);
  // Read after the close reconcilers above, which match "never opened" text.
  errors = reportPreOpenUses(errors, directives, files);
  errors = locateBookErrors(errors, files, entryPoint);
  errors = reportUrlIncludes(errors, files, entryPoint);
  errors = locateIncludeAndPluginErrors(errors, files, entryPoint);
  errors = explainUnknownPlugins(errors);
  errors = reportUndecodableSources(errors, files, entryPoint);

  if (isRawPluginProcessing(files, entryPoint)) {
    paddingTransactions = [];
    errors = withoutPadAndBalanceChecks(errors);
  }
  const padding = dropPaddingWithinTolerance(
    directives,
    paddingTransactions,
    stripResult?.strippedFiles ?? scoped,
  );
  errors = [...errors, ...padding.errors];
  if (!isRawPluginProcessing(files, entryPoint)) {
    const scopedFiles = stripResult?.strippedFiles ?? scoped;
    const transformed = directives;
    const hidden = await errorsHiddenByUnusedPads(
      transformed,
      padding.paddingTransactions,
      scopedFiles,
      errors,
      // Checked again as the first pass was: the blanked source has no
      // amortize_over or forecast copies, so every balance on an account a
      // plugin moved failed against the untransformed postings (w21/704).
      (blanked, removed, standIns) =>
        validatedTransformed
          ? transformedValidationErrors(
              [
                ...transformed.filter(
                  (directive) => !removed.includes(directive),
                ),
                ...standIns,
              ].sort((a, b) =>
                a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
              ),
              files[entryPoint],
            ).then((found) => found ?? [])
          : withLedger(blanked, entryPoint, (ledger) => ledger.getErrors()),
    );
    const cleared = new Set(hidden.cleared);
    errors = [
      ...errors.filter((error) => !cleared.has(error)),
      ...hidden.added,
    ];
  }
  directives = mergePaddingTransactions(
    directives,
    padding.paddingTransactions,
  );

  errors = withBalanceErrorDates(errors, stripResult?.strippedFiles ?? scoped);
  // The engine's meta is a hash map; show it as written (w21/778).
  orderMetaAsWritten(directives, files, entryPoint);

  const capturedSourceIds = tracksSourceIds
    ? captureDirectiveSourceIds(directives)
    : undefined;
  // Whenever anything was generated, padding included: a written `P`, `S` or
  // `R` transaction is told from a synthetic one by this mark, not its flag
  // (w21/745), so it has to survive the worker for every ledger.
  const generatedMarks = captureGeneratedDirectives(directives);
  const capturedGenerated =
    capturedSourceIds !== undefined || generatedMarks.includes(true)
      ? generatedMarks
      : undefined;
  const capturedLocations =
    capturedSourceIds !== undefined
      ? captureDirectiveSourceLocations(directives)
      : undefined;
  const serializedSourceDetails =
    options.includeSourceDetails === true && sourceDetails !== undefined
      ? Object.fromEntries(sourceDetails)
      : undefined;

  // Shallow-frozen: the snapshot is shared across requests via the cache, so
  // accidental top-level mutation must throw instead of corrupting neighbors.
  return Object.freeze({
    valid: !errors.some((error) => error.severity === "error"),
    options: raw.options,
    errors: Object.freeze(errors) as BeancountError[],
    directives: Object.freeze(directives) as DirectiveJson[],
    directiveCount: directives.length,
    ...(capturedSourceIds !== undefined
      ? {
          sourceIds: Object.freeze(capturedSourceIds) as Array<string | null>,
        }
      : {}),
    ...(capturedGenerated !== undefined
      ? { generated: Object.freeze(capturedGenerated) as boolean[] }
      : {}),
    ...(capturedLocations !== undefined
      ? {
          sourceLocations: Object.freeze(
            capturedLocations,
          ) as Array<DirectiveSourceLocation | null>,
        }
      : {}),
    ...(serializedSourceDetails !== undefined
      ? { sourceDetails: Object.freeze(serializedSourceDetails) }
      : {}),
  });
}

// NOTE: there is intentionally no `validateLedgerFiles(files, entryPoint)`
// convenience export. It parsed the RAW files — skipping the neutralize+strip
// sanitization pre-pass above — so it reported E8005 (fava plugins) and
// included-option artifacts for ledgers the report path calls valid. Derive
// validity from `parseLedgerFiles(...)` (`snapshot.valid` / `snapshot.errors`)
// instead; a deliberate RAW-WASM contrast check can use `withLedger` directly
// (see `scripts/verify-rustledger.ts`).

/**
 * Run a BQL query against a (multi-file) ledger and return the raw
 * {@link QueryResult} (columns + rows + query errors). This is the ONE BQL
 * entry point — every caller must go through it (not raw `withLedger` +
 * `ledger.query`) so the source is sanitized the same way the reports are:
 * included files' option/plugin directives are neutralized (entry-point-only
 * in beancount) and `fava.plugins.*` directives are stripped so the query
 * does not fail with `E8005`.
 *
 * For ledgers using a handled Fava plugin, the transformed directive stream is
 * materialized and reparsed before the query so BQL observes the same entries
 * as reports and journal views. `result.errors` carries syntax/execution
 * failures — callers decide how to surface them (the shell service maps
 * severity-`error` entries to `BadUserInputError`).
 */
export async function queryLedgerFilesResult(
  files: FileMap,
  entryPoint: string,
  query: string,
): Promise<QueryResult> {
  if (process.env.JEST_WORKER_ID !== undefined) {
    return queryLedgerFilesResultInProcess(files, entryPoint, query);
  }
  return getRustledgerWorkerPool().query(files, entryPoint, query);
}

/** Worker-local implementation; request-path callers use queryLedgerFilesResult. */
export async function queryLedgerFilesResultInProcess(
  files: FileMap,
  entryPoint: string,
  query: string,
): Promise<QueryResult> {
  const scoped = neutralizeIncludedOptionsAndPlugins(files, entryPoint);
  const { strippedFiles } = stripFavaPlugins(scoped, entryPoint);
  const declared = collectLedgerPlugins(files[entryPoint]);
  const needsTsPluginStream = declared.some((name) =>
    HANDLED_PLUGIN_NAMES.has(name),
  );
  const needsMaterializedStream =
    needsTsPluginStream ||
    sourceHasTaggedDocument(files) ||
    sourceHasPad(files);
  const materialized = needsMaterializedStream
    ? materializeDirectiveStreamWithSourceMap(
        (await parseLedgerFilesInProcess(files, entryPoint)).directives,
        files[entryPoint],
        { omitPadDirectives: true },
      )
    : undefined;
  const queryFiles = materialized?.files ?? strippedFiles;
  const queryEntryPoint = needsMaterializedStream
    ? MATERIALIZED_ENTRY_POINT
    : entryPoint;
  // Reuse a LIVE parsed ledger across queries on the same content: a query
  // needs the WASM object (the snapshot cache can't serve it), and re-running
  // Ledger.fromFiles per query is an expensive synchronous parse. Request-path
  // callers execute this inside the bounded worker pool. Key on
  // the SANITIZED source (what is actually parsed) + the resolved day (WASM-
  // native plugins may read the clock — same rationale as the snapshot cache).
  const key = buildSnapshotCacheKey({
    files: queryFiles,
    entryPoint: queryEntryPoint,
    effectiveToday: localTodayStr(),
    repoPaths: undefined,
    applyTsPlugins: undefined,
    includeSourceDetails: undefined,
  });
  // QueryResult is plain JSON copied out of the WASM, so it stays valid after
  // the ledger is released/evicted.
  return queryLedgerCache.withLedger(
    key,
    async () => {
      const mod = await loadRustledger();
      return mod.Ledger.fromFiles(
        parseableFiles(queryFiles, queryEntryPoint),
        queryEntryPoint,
      );
    },
    (ledger) => {
      if (materialized !== undefined) {
        const parseErrors = ledger
          .getErrors()
          .filter((error) => error.phase === "parse")
          .map((error) =>
            remapMaterializedError(error, materialized.sourceByLine),
          );
        // A renderer defect must never let BQL execute over a partially parsed
        // synthetic stream: return the parse diagnostics and no rows instead.
        if (parseErrors.length > 0) {
          return { columns: [], rows: [], errors: parseErrors };
        }
      }
      try {
        const refused =
          integerOverflowError(query) ??
          windowFromError(query) ??
          atValueError(query) ??
          starAliasError(query) ??
          idColumnError(query) ??
          compositeComparisonError(query) ??
          inventoryGroupByError(query) ??
          groupByCoverageError(query) ??
          mixedComparisonError(query);
        if (refused !== undefined) return refused;
        const result = ledger.query(query);
        return (
          collapsedCostOfSumError(query, result, (probe) =>
            ledger.query(probe),
          ) ??
          unresolvedNameError(query, result, (probe) => ledger.query(probe)) ??
          result
        );
      } catch (error) {
        if (isUnsupportedIntegerResultError(error)) {
          return unsupportedIntegerResultQueryError(
            error instanceof Error ? error.message : undefined,
          );
        }
        throw error;
      }
    },
  );
}

/**
 * Live-ledger cache for the BQL path. Each entry holds WASM linear memory
 * until eviction, so the capacity is deliberately small — queries cluster on
 * one ledger (a dashboard shell session, an AI request's 1-5 queries).
 */
const QUERY_LEDGER_CACHE_MAX_ENTRIES = 4;
const queryLedgerCache = new LedgerHandleCache<Ledger>(
  QUERY_LEDGER_CACHE_MAX_ENTRIES,
);

/** Test hook: evict + free all cached query ledgers. */
export function clearQueryLedgerCache(): void {
  queryLedgerCache.clear();
}

/**
 * {@link queryLedgerFilesResult} reshaped into row records (same sanitization).
 */
export async function queryLedgerFiles(
  files: FileMap,
  entryPoint: string,
  query: string,
): Promise<QueryRecordsResult> {
  return queryResultToRecords(
    await queryLedgerFilesResult(files, entryPoint, query),
  );
}

/**
 * Counts by content, so the map one write projects is a hit when it comes back
 * as the next write's committed ledger, and a commit is counted once however
 * many writes and push checks ask. Values are numbers: a few hundred entries
 * cost nothing but their keys.
 */
const directiveCountCache = new CoalescingLruCache<number>(256);

/**
 * How many directives a ledger holds, following `include` from `entryPoint`.
 * The parse is CPU-proportional to the ledger's size, so request-path callers
 * use this and it runs in the worker pool, under its queue bound and timeout.
 * A failed count is not cached.
 */
export function countLedgerDirectives(
  files: FileMap,
  entryPoint: string,
): Promise<number> {
  const key = buildSnapshotCacheKey({
    files,
    entryPoint,
    // WASM-native plugins may read the clock; same rationale as the snapshot cache.
    effectiveToday: localTodayStr(),
    repoPaths: undefined,
    applyTsPlugins: false,
  });
  return directiveCountCache.getOrLoad(key, () =>
    // Jest cannot bootstrap the worker entry; see parseLedgerFiles.
    process.env.JEST_WORKER_ID !== undefined
      ? countLedgerDirectivesInProcess(files, entryPoint)
      : getRustledgerWorkerPool().countDirectives(files, entryPoint),
  );
}

/** Worker-local implementation; request-path callers use countLedgerDirectives. */
export function countLedgerDirectivesInProcess(
  files: FileMap,
  entryPoint: string,
): Promise<number> {
  return withLedger(files, entryPoint, (ledger) => ledger.directiveCount());
}

/**
 * Count the top-level directives in a single beancount source string. Mirrors
 * the Python service's `directive_limit.py` free-tier pre-check (which used
 * `beancount.loader.load_string` purely for a count) — the rustledger
 * replacement for that one non-fava beancount usage.
 */
export function countDirectives(
  content: string,
  entryPoint = "main.beancount",
): Promise<number> {
  return countLedgerDirectivesInProcess({ [entryPoint]: content }, entryPoint);
}

/** Format a beancount source string with rustledger's canonical alignment. */
export async function formatSource(source: string): Promise<FormatResult> {
  const mod = await loadRustledger();
  return mod.format(source) as FormatResult;
}

/** The loaded `@rustledger/wasm` package version (e.g. `"0.24.0"`). */
export async function getRustledgerVersion(): Promise<string> {
  const mod = await loadRustledger();
  return mod.version();
}
