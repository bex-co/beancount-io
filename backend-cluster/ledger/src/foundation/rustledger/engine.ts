import type {
  BeancountError,
  DirectiveJson,
  FileMap,
  FormatResult,
  Ledger,
  LedgerOptions,
  QueryResult,
} from "@rustledger/wasm";
import { loadRustledger } from "./loader";
import { queryResultToRecords, type QueryRecordsResult } from "./mappers";
import { buildSnapshotCacheKey, CoalescingLruCache } from "./snapshot-cache";
import { LedgerHandleCache } from "./ledger-handle-cache";
import {
  applyPlugins,
  captureDirectiveSourceIds,
  collectLedgerPlugins,
  getDirectiveSourceId,
  getDirectiveSourceLocation,
  HANDLED_PLUGIN_NAMES,
  inheritDirectiveSourceId,
  seedDirectiveSourceIds,
  restoreDirectiveSourceIds,
  localTodayStr,
  neutralizeIncludedOptionsAndPlugins,
  skippedPluginWarning,
  stripFavaPlugins,
  type DirectiveSourceLocation,
} from "./plugins";
import { reconcileDocumentErrors } from "./document-validation";
import { isDocumentValidationError } from "./document-validation";
import { OPTION_LINE_RE } from "./beancount-options";
import { directiveToText } from "./journal-serialize";
import {
  buildSourceDetailsProbe,
  sourceDetailsFromProbe,
  type EntrySourceDetails,
} from "./source-slice";
import { getRustledgerWorkerPool } from "./rustledger-worker-pool";

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
  /** Complete source index, built only for callers that explicitly request it. */
  sourceDetails?: Record<string, EntrySourceDetails>;
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
  const ledger = mod.Ledger.fromFiles(files, entryPoint);
  try {
    return fn(ledger);
  } finally {
    ledger.free();
  }
}

/** Materialize the plain snapshot out of a live WASM ledger. */
function snapshotOf(ledger: Ledger): LedgerSnapshot {
  return {
    valid: ledger.isValid(),
    errors: ledger.getErrors(),
    options: ledger.getOptions(),
    directives: ledger.getDirectives(),
    directiveCount: ledger.directiveCount(),
  };
}

const MATERIALIZED_ENTRY_POINT = "__plugin_transformed__.bean";

interface MaterializedDirectiveStream {
  files: FileMap;
  sourceByLine: ReadonlyMap<number, DirectiveSourceLocation>;
}

function materializeDirectiveStreamWithSourceMap(
  directives: DirectiveJson[],
  entryPointSource: string | undefined,
): MaterializedDirectiveStream {
  const options = (entryPointSource ?? "")
    .split(/\r\n|\r|\n/u)
    .filter((line) => OPTION_LINE_RE.test(line));
  const segments: Array<{
    text: string;
    source?: DirectiveSourceLocation;
  }> = [
    ...options.map((text) => ({ text })),
    ...directives.map((directive) => ({
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

/**
 * Materialize a post-plugin directive stream as a self-contained ledger. The
 * entry-point options are retained (custom account roots, tolerances, etc.), but
 * includes/plugins are intentionally absent: their effects are already present
 * in `directives` and running them again would duplicate transformations.
 */
export function materializeDirectiveStream(
  directives: DirectiveJson[],
  entryPointSource: string | undefined,
): FileMap {
  return materializeDirectiveStreamWithSourceMap(directives, entryPointSource)
    .files;
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

function mergeSourceDocumentSyntax(
  directives: DirectiveJson[],
  sourceDetails: ReadonlyMap<string, EntrySourceDetails>,
): DirectiveJson[] {
  return directives.map((directive) => {
    if (directive.type !== "document") return directive;
    const sourceId = getDirectiveSourceId(directive);
    const detail =
      sourceId === undefined ? undefined : sourceDetails.get(sourceId);
    const tags = [
      ...new Set([...(directive.tags ?? []), ...(detail?.documentTags ?? [])]),
    ];
    const links = [
      ...new Set([
        ...(directive.links ?? []),
        ...(detail?.documentLinks ?? []),
      ]),
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

  let directives = raw.directives;
  let errors = raw.errors;

  // rustledger 0.21's Document JSON omits inline tags/links. Recover them from
  // raw source, while also building the file/line sidecar needed by
  // link_documents' source-relative path resolution.
  let sourceDetails: Map<string, EntrySourceDetails> | undefined;
  if (
    options.includeSourceDetails === true ||
    hasHandledPlugin ||
    directives.some((directive) => directive.type === "document")
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
      documentsOnly: !needsCompleteSourceIndex,
    });
  }
  if (applyTs || sourceDetails !== undefined) {
    seedDirectiveSourceIds(directives, sourceDetails);
  }
  if (sourceDetails !== undefined) {
    directives = mergeSourceDocumentSyntax(directives, sourceDetails);
  }

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
        ...revalidated,
        ...pluginErrors,
      ];
    }
  }

  // The WASM engine has no filesystem, so its `document`/`option "documents"`
  // existence checks always fail. Reconcile them against the real repo file
  // inventory (`repoPaths`), then recompute validity from the resulting errors.
  errors = reconcileDocumentErrors(errors, options.repoPaths);

  const capturedSourceIds =
    applyTs || sourceDetails !== undefined
      ? captureDirectiveSourceIds(directives)
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
    needsTsPluginStream || sourceHasTaggedDocument(files);
  const materialized = needsMaterializedStream
    ? materializeDirectiveStreamWithSourceMap(
        (await parseLedgerFilesInProcess(files, entryPoint)).directives,
        files[entryPoint],
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
      return mod.Ledger.fromFiles(queryFiles, queryEntryPoint);
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
      return ledger.query(query);
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
 * Count the top-level directives in a single beancount source string. Mirrors
 * the Python service's `directive_limit.py` free-tier pre-check (which used
 * `beancount.loader.load_string` purely for a count) — the rustledger
 * replacement for that one non-fava beancount usage.
 */
export function countDirectives(
  content: string,
  entryPoint = "main.beancount",
): Promise<number> {
  return withLedger({ [entryPoint]: content }, entryPoint, (ledger) =>
    ledger.directiveCount(),
  );
}

/** Format a beancount source string with rustledger's canonical alignment. */
export async function formatSource(source: string): Promise<FormatResult> {
  const mod = await loadRustledger();
  return mod.format(source) as FormatResult;
}

/** The loaded `@rustledger/wasm` package version (e.g. `"0.21.0"`). */
export async function getRustledgerVersion(): Promise<string> {
  const mod = await loadRustledger();
  return mod.version();
}
