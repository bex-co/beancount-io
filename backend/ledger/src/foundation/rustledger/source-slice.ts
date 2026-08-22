import { createHash } from "node:crypto";
import BigNumber from "bignumber.js";
import type { DirectiveJson, FileMap, PostingJson } from "@rustledger/wasm";
import {
  buildEntryIdMap,
  entryIdFor,
  hashEntry,
  parseEntryId,
} from "./entry-hash";
import {
  extractIncludeTargets,
  GlobWorkBudget,
  globToRegExp,
  isGlob,
  resolveIncludeTarget,
} from "./file-map-loader";

/**
 * Fava-EXACT source-slice location + editing — a faithful port of
 * fava-slim's `fava.modules.source_slice.SourceSliceModule`
 * (`beancount-ledger/fava-slim/fava/modules/source_slice.py`) and the
 * ledger service's `getContext` / `deleteSourceSlice` / `updateSourceSlice`
 * endpoints (`beancount-ledger/server/app/api/source_slice.py`).
 *
 * ## The problem: rustledger has no filename/lineno
 *
 * Fava recovers an entry's exact source text via `get_position(entry)` →
 * `(filename, lineno)` from `entry.meta`, then reads that file and slices out
 * the entry's lines. rustledger's `DirectiveJson` deliberately carries no
 * `meta.filename` / `meta.lineno`, so the production path annotates every
 * source block with a temporary metadata marker and performs one correctly
 * booked full-ledger parse ({@link buildSourceDetailsProbe}). The resulting
 * entry-id → filename/line sidecar locates the raw block without trying to
 * reconstruct booking state from an isolated transaction.
 *
 * {@link findEntrySlice} remains as a compatibility fallback and for pure unit
 * tests. It recovers each entry's source span by **block-splitting** the raw file
 * text and matching on {@link hashEntry}:
 *
 *   - split every file into top-level *blocks* — a block starts at a column-0
 *     line that begins a directive (`YYYY-MM-DD` or a keyword like
 *     `option`/`plugin`/`include`/`pushtag`/…) and runs through its indented
 *     continuation lines, stopping at the first blank or non-indented line
 *     (exactly fava's `_find_entry_lines`, which does NOT consume trailing
 *     blanks);
 *   - parse each *date-started* block on its own with rustledger, hash the
 *     resulting directive with {@link hashEntry}, and compare to the target
 *     `entryHash`. Because a block is parsed in ISOLATION, file-level `pushtag`
 *     state is re-applied by hand ({@link hashWithActiveTags}) so a transaction
 *     tagged only via an enclosing `pushtag` hashes the same as the WASM's
 *     full-parse directive (else edit/delete would resolve to the wrong entry).
 *
 * The matching/marker-located block IS the source slice; its SHA-256 (of the
 * trailing-newline-stripped text) is the `sha256sum` fava validates
 * delete/update against.
 *
 * ## Hash identity
 *
 * The `entryHash` this module matches on is {@link hashEntry}'s value — the
 * `exclude_meta=True` variant of `beancount.core.compare.hash_entry`, the only
 * hash reproducible from a `DirectiveJson`. The whole rustledger port keys
 * source-slice deep links on that same hash, so this is internally consistent.
 * (Real fava keys on the meta-INCLUSIVE hash, which is unreproducible here — see
 * `entry-hash.ts`. The golden fixture for this module is captured with
 * `exclude_meta=True` to match the value the port actually uses.)
 */

/** Currencies fava's `Position.sortkey` orders first (`CURRENCY_ORDER`). */
const CURRENCY_ORDER: Record<string, number> = {
  USD: 0,
  EUR: 1,
  JPY: 2,
  CAD: 3,
  GBP: 4,
  AUD: 5,
  NZD: 6,
  CHF: 7,
};
const NCURRENCIES = 8;

const Amount = BigNumber.clone({
  DECIMAL_PLACES: 28,
  ROUNDING_MODE: BigNumber.ROUND_HALF_EVEN,
});

/**
 * A decimal that tracks its Python-`Decimal`-style scale (fractional digits),
 * so `to_string(pos)` reproduces beancount's `f"{number}"` — which preserves
 * trailing zeros. Python `Decimal` add takes `max` of operand scales; a plain
 * `bignumber.js` value strips trailing zeros on construction, so we track scale
 * explicitly (mirrors `journal-running-balance.ts`).
 */
interface ScaledDecimal {
  value: BigNumber;
  scale: number;
}

/** Number of fractional digits in a source string ("100.00" -> 2). */
function scaleOf(source: string): number {
  const dot = source.indexOf(".");
  if (dot === -1) return 0;
  const exp = source.search(/[eE]/);
  const end = exp === -1 ? source.length : exp;
  return end - dot - 1;
}

function scaledFromSource(source: string): ScaledDecimal {
  return { value: new Amount(source), scale: scaleOf(source) };
}

/** Python `Decimal.__add__`: value sum, scale = max(operand scales). */
function addScaled(a: ScaledDecimal, b: ScaledDecimal): ScaledDecimal {
  return { value: a.value.plus(b.value), scale: Math.max(a.scale, b.scale) };
}

/** Format like `str(Decimal)` — preserve scale as trailing zeros. */
function formatScaled(dec: ScaledDecimal): string {
  return dec.value.toFixed(dec.scale);
}

/** Top-level directive keywords that start a block at column 0 (besides a date). */
const TOP_LEVEL_KEYWORDS = new Set([
  "option",
  "plugin",
  "include",
  "pushtag",
  "poptag",
  "pushmeta",
  "popmeta",
]);

/** A `YYYY-MM-DD` date anchored at the start of a line. */
const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}\b/;

/** A `pushtag #tag` / `poptag #tag` directive line (beancount's tag stack). */
const PUSH_POP_TAG_RE = /^(pushtag|poptag)[^\S\r\n]+#(\S+)/;

/**
 * Hash a directive as beancount would under the file-level `pushtag` set active
 * at its source location. beancount applies the tag stack to TRANSACTIONS (the
 * pushed tags are unioned into the transaction's own tags), so a transaction that
 * gets `#trip` only via an enclosing `pushtag #trip` hashes IDENTICALLY to one
 * that writes `#trip` explicitly — which is exactly how the WASM full-parse
 * numbers their entry IDs. Block-splitting parses each block in ISOLATION and so
 * loses that file-level state; re-applying the active tags here keeps the source
 * scan's hash in lockstep with the entry ID, so edit/delete/context resolve to
 * the correct entry instead of a same-content sibling.
 *
 * `pushmeta`/`popmeta` inject METADATA, which {@link hashEntry} excludes
 * (`exclude_meta=True`), so they never affect this hash and are not tracked.
 * Non-transaction directives are unaffected by `pushtag`.
 */
function hashWithActiveTags(
  directive: DirectiveJson,
  activeTags: readonly string[],
): string {
  // rustledger 0.21's full-ledger `getDirectives()` omits Document tags/links,
  // although its single-block `parse()` includes them. Source IDs are seeded
  // from the full-ledger stream, so normalize the block parse to that wire shape
  // before hashing; the public enriched directive retains a provenance pointer
  // to this source-backed ID.
  if (directive.type === "document") {
    const { tags: _tags, links: _links, ...wireDirective } = directive;
    return hashEntry(wireDirective as DirectiveJson);
  }
  if (directive.type !== "transaction" || activeTags.length === 0) {
    return hashEntry(directive);
  }
  // Union (beancount's `frozenset(self.tags) | entry_tags`); order is irrelevant
  // because hashEntry sorts the per-tag hashes.
  const tags = [...new Set([...directive.tags, ...activeTags])];
  return hashEntry({ ...directive, tags });
}

/** A source span located inside a specific file. */
export interface EntrySlice {
  file: string;
  slice: string;
  sha256: string;
  /** 0-based inclusive start line of the block. */
  startLine: number;
  /** 0-based exclusive end line of the block (first line NOT in the block). */
  endLine: number;
  /**
   * The occurrence index of this exact source slice (same SHA-256) WITHIN its
   * own `file` (0-based). Commit-time CAS re-location deliberately uses source
   * identity rather than re-booking the block: a lot-reducing posting such as
   * `-5 HOOL {}` needs inventory from the full ledger to reproduce its booked
   * cost date and cannot be identified from an isolated file/block hash.
   */
  localOccurrence: number;
}

/** Beancount's automatic source metadata for one parsed directive. */
export interface EntrySourceLocation {
  /** Repository-relative source filename. */
  filename: string;
  /** 1-based line number, matching `meta.lineno`. */
  lineno: number;
}

/** Source details recoverable from raw text but absent from DirectiveJson. */
export interface EntrySourceDetails extends EntrySourceLocation {
  /** Inline tags on a Document directive, when present in source. */
  documentTags?: string[];
  /** Inline links on a Document directive, when present in source. */
  documentLinks?: string[];
}

export interface EntrySourceDetailsOptions {
  /**
   * Parse only Document blocks. This is sufficient for recovering syntax that
   * rustledger omits and avoids reparsing every transaction in large ledgers.
   * Callers that need filename/line provenance for arbitrary directives (for
   * example `link_documents`) leave this disabled.
   */
  documentsOnly?: boolean;
}

/** Annotated parse input used to recover filename/line metadata in one parse. */
export interface SourceDetailsProbe {
  files: FileMap;
  markerKey: string;
  detailsByMarker: Map<string, EntrySourceDetails>;
}

/** A candidate top-level block extracted from a file's text. */
export interface SourceBlock {
  /** 0-based inclusive start line. */
  startLine: number;
  /** 0-based exclusive end line. */
  endLine: number;
  /** The block's exact text (no trailing newline). */
  text: string;
  /** Whether the block starts with a date (a parseable directive). */
  isDated: boolean;
}

/**
 * Parse a single block's text into its directives. Injected so the pure
 * block-matching logic is testable with captured `DirectiveJson`s; the
 * orchestrator supplies a real rustledger-backed parser (see integration
 * notes). Returns the block's directives (typically one).
 */
export type BlockParser = (blockText: string) => DirectiveJson[];

/** Whether `line` begins a top-level directive block (a date or a keyword). */
function isTopLevelStart(line: string): boolean {
  if (line.length === 0) return false;
  if (line[0] === " " || line[0] === "\t") return false;
  if (DATE_PREFIX.test(line)) return true;
  const firstToken = line.split(/\s/, 1)[0];
  return TOP_LEVEL_KEYWORDS.has(firstToken);
}

/**
 * Split a file's text into top-level blocks, mirroring fava's
 * `_find_entry_lines`: a block is a column-0 directive line plus its
 * immediately-following indented continuation lines, stopping at the first
 * blank or non-indented line. Blank lines and non-directive column-0 lines
 * between blocks are NOT part of any block (they are the whitespace fava's
 * delete/update preserve).
 */
export function splitIntoBlocks(fileText: string): SourceBlock[] {
  const lines = fileText.split("\n");
  const blocks: SourceBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!isTopLevelStart(line)) {
      index += 1;
      continue;
    }
    let end = index + 1;
    while (end < lines.length) {
      const next = lines[end];
      if (next.trim().length === 0) break;
      if (next[0] === " " || next[0] === "\t") {
        end += 1;
        continue;
      }
      break;
    }
    blocks.push({
      startLine: index,
      endLine: end,
      text: lines.slice(index, end).join("\n"),
      isDated: DATE_PREFIX.test(line),
    });
    index = end;
  }
  return blocks;
}

/**
 * Add a unique metadata marker to every dated source block. Parsing this
 * annotated FileMap once lets the booked directives carry their source block
 * identity, avoiding one `Ledger.fromFiles()` call per directive.
 *
 * `parseFiles` is the line-preserving, engine-sanitized input; `sourceFiles`
 * supplies the original text used for document syntax and line numbers.
 */
export function buildSourceDetailsProbe(
  parseFiles: FileMap,
  sourceFiles: FileMap = parseFiles,
): SourceDetailsProbe {
  let markerKey = "bcio_source_probe";
  const sources = Object.values(parseFiles);
  while (
    sources.some((source) =>
      source
        .split(/\r\n|\r|\n/u)
        .some((line) => line.trimStart().startsWith(`${markerKey}:`)),
    )
  ) {
    markerKey += "_x";
  }

  const detailsByMarker = new Map<string, EntrySourceDetails>();
  const annotated: FileMap = {};
  let nextMarker = 0;

  Object.entries(parseFiles).forEach(([file, source]) => {
    const sourceBlocks = new Map(
      splitIntoBlocks(sourceFiles[file] ?? source).map((block) => [
        block.startLine,
        block,
      ]),
    );
    const markerByLine = new Map<number, string>();
    for (const block of splitIntoBlocks(source)) {
      if (!block.isDated) continue;
      const marker = String(nextMarker);
      nextMarker += 1;
      markerByLine.set(block.startLine, marker);
      const original = sourceBlocks.get(block.startLine) ?? block;
      const documentSyntax = DOCUMENT_LINE_RE.test(
        original.text.split("\n", 1)[0],
      )
        ? documentTagsAndLinks(original.text)
        : undefined;
      detailsByMarker.set(marker, {
        filename: file,
        lineno: block.startLine + 1,
        ...(documentSyntax?.tags.length
          ? { documentTags: documentSyntax.tags }
          : {}),
        ...(documentSyntax?.links.length
          ? { documentLinks: documentSyntax.links }
          : {}),
      });
    }

    const lines = source.split("\n");
    const output: string[] = [];
    lines.forEach((line, index) => {
      output.push(line);
      const marker = markerByLine.get(index);
      if (marker !== undefined) {
        output.push(`  ${markerKey}: "${marker}"`);
      }
    });
    annotated[file] = output.join("\n");
  });

  return { files: annotated, markerKey, detailsByMarker };
}

/** Build occurrence-disambiguated source details from one annotated parse. */
export function sourceDetailsFromProbe(
  directives: DirectiveJson[],
  probe: SourceDetailsProbe,
  options: EntrySourceDetailsOptions = {},
): Map<string, EntrySourceDetails> {
  const entryIds = buildEntryIdMap(directives);
  const details = new Map<string, EntrySourceDetails>();
  for (const directive of directives) {
    if (options.documentsOnly === true && directive.type !== "document") {
      continue;
    }
    const marker = directive.meta?.[probe.markerKey];
    if (typeof marker !== "string") continue;
    const entryId = entryIds.get(directive);
    const detail = probe.detailsByMarker.get(marker);
    if (entryId !== undefined && detail !== undefined) {
      details.set(entryId, detail);
    }
  }
  return details;
}

/**
 * SHA-256 hex digest of a source slice, matching fava's
 * `_sha256_str(entry_source)` where `entry_source` is the joined entry lines
 * with trailing newlines stripped (`"".join(entry_lines).rstrip("\n")`). The
 * slice passed here must already be that trailing-newline-stripped form.
 */
export function sliceSha256(slice: string): string {
  return createHash("sha256").update(slice, "utf8").digest("hex");
}

/** Build an {@link EntrySlice} for one already-identified dated source block. */
function entrySliceForBlock(
  file: string,
  fileText: string,
  block: SourceBlock,
): EntrySlice {
  const sha256 = sliceSha256(block.text);
  let localOccurrence = 0;
  for (const candidate of splitIntoBlocks(fileText)) {
    if (candidate.startLine >= block.startLine) break;
    if (candidate.isDated && sliceSha256(candidate.text) === sha256) {
      localOccurrence += 1;
    }
  }
  return {
    file,
    slice: block.text,
    sha256,
    startLine: block.startLine,
    endLine: block.endLine,
    localOccurrence,
  };
}

/** Resolve a marker-derived filename/line back to its exact raw source block. */
export function entrySliceFromSourceLocation(
  files: FileMap,
  location: EntrySourceLocation,
): EntrySlice | null {
  const fileText = files[location.filename];
  if (fileText === undefined) return null;
  const startLine = location.lineno - 1;
  const block = splitIntoBlocks(fileText).find(
    (candidate) => candidate.isDated && candidate.startLine === startLine,
  );
  return block ? entrySliceForBlock(location.filename, fileText, block) : null;
}

/**
 * Re-locate the Nth byte-identical source block in a fresh file revision.
 * This is inventory-independent and therefore safe for lot reductions whose
 * booked representation cannot be recreated from the target file alone.
 */
export function findEntrySliceBySourceSha(
  file: string,
  fileText: string,
  sha256: string,
  localOccurrence: number,
): EntrySlice | null {
  let occurrence = 0;
  for (const block of splitIntoBlocks(fileText)) {
    if (!block.isDated || sliceSha256(block.text) !== sha256) continue;
    if (occurrence === localOccurrence) {
      return entrySliceForBlock(file, fileText, block);
    }
    occurrence += 1;
  }
  return null;
}

/**
 * The order beancount parses files: a DFS from the entry point following
 * `include` directives in DECLARATION order (a glob include expands to its
 * matches in sorted order, matching Python `glob.glob`). This is the SAME order
 * the WASM emits directives for same-date entries — so the source scan MUST use
 * it (NOT alphabetical / FileMap-key order) to number cross-file duplicate
 * occurrences consistently with the entry IDs. Otherwise, with
 * `include "z.bean"` then `include "a.bean"` holding identical entries, the
 * stream numbers z→0/a→1 while an alphabetical scan finds a→0/z→1, so an
 * edit/delete silently hits the WRONG file. Files unreachable via includes are
 * appended in sorted order (a deterministic fallback).
 */
function includeTraversalOrder(files: FileMap, entryPoint: string): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const globBudget = new GlobWorkBudget();
  const visit = (file: string): void => {
    if (visited.has(file) || files[file] === undefined) return;
    visited.add(file);
    order.push(file);
    for (const target of extractIncludeTargets(files[file])) {
      const resolved = resolveIncludeTarget(file, target);
      if (isGlob(resolved)) {
        const pattern = globToRegExp(resolved);
        if (!pattern) continue;
        Object.keys(files)
          .filter((candidate) => globBudget.test(pattern, candidate))
          .sort()
          .forEach(visit);
      } else {
        visit(resolved);
      }
    }
  };
  visit(entryPoint);
  Object.keys(files)
    .filter((file) => !visited.has(file))
    .sort()
    .forEach((file) => order.push(file));
  return order;
}

/**
 * Locate the source span of the entry with id `entryHash` across every file in
 * `files`, by block-splitting each file and parsing+hashing its dated blocks
 * with `parseBlock`. Returns the matching file, slice text, sha256, and the
 * 0-based `[startLine, endLine)` block range, or `null` if no block matches.
 *
 * `entryHash` is an occurrence-disambiguated entry ID (`base` or `base:k`, see
 * {@link "./entry-hash".entryIdFor}). Byte-identical entries share a `base`
 * content hash, so we select the k-th block whose directive hashes to `base` —
 * NOT merely the first — otherwise editing/deleting the second of two identical
 * entries would hit the first.
 *
 * Files are scanned in {@link includeTraversalOrder} (the engine's parse order),
 * NOT alphabetically, so the occurrence index matches the entry-ID numbering.
 */
export function findEntrySlice(
  files: FileMap,
  entryPoint: string,
  entryHash: string,
  parseBlock: BlockParser,
): EntrySlice | null {
  const { base, occurrence } = parseEntryId(entryHash);
  const orderedFiles = includeTraversalOrder(files, entryPoint);

  let matchIndex = 0;
  for (const file of orderedFiles) {
    const fileText = files[file];
    if (fileText === undefined) continue;
    const blocks = splitIntoBlocks(fileText);
    // The file-level `pushtag` stack, reset per file (beancount parses each file
    // with fresh parser state, so pushed tags do NOT cross `include` boundaries).
    const activeTags: string[] = [];
    for (const block of blocks) {
      const tagOp = PUSH_POP_TAG_RE.exec(block.text);
      if (tagOp) {
        if (tagOp[1] === "pushtag") {
          activeTags.push(tagOp[2]);
        } else {
          // `poptag` removes one occurrence (beancount's `list.remove`).
          const idx = activeTags.indexOf(tagOp[2]);
          if (idx !== -1) activeTags.splice(idx, 1);
        }
        continue;
      }
      if (!block.isDated) continue;
      const directives = parseBlock(block.text);
      const matched = directives.some(
        (directive) => hashWithActiveTags(directive, activeTags) === base,
      );
      if (!matched) continue;
      if (matchIndex === occurrence) {
        return entrySliceForBlock(file, fileText, block);
      }
      matchIndex += 1;
    }
  }
  return null;
}

/**
 * Build the automatic `filename`/`lineno` metadata that beancount attaches to
 * every source-backed directive, keyed by the same occurrence-disambiguated
 * entry IDs used by {@link buildEntryIdMap}.
 *
 * This is the bulk counterpart to {@link findEntrySlice}: it scans and parses
 * each source block once, so a journal page can restore source metadata without
 * performing an O(entries²) repeated lookup. Directives synthesized or rewritten
 * by a post-parse plugin have no matching transformed key; callers resolve their
 * provenance ID to the originating source-backed directive.
 */
export function buildEntrySourceLocationMap(
  files: FileMap,
  entryPoint: string,
  parseBlock: BlockParser,
): Map<string, EntrySourceLocation> {
  const details = buildEntrySourceDetailsMap(files, entryPoint, parseBlock);
  return new Map(
    [...details].map(([id, detail]) => [
      id,
      { filename: detail.filename, lineno: detail.lineno },
    ]),
  );
}

/**
 * Build source locations plus syntax that rustledger 0.21 does not currently
 * expose on its JSON directives. In particular, Document's optional `tags` and
 * `links` fields are absent from the WASM output even when they are present on
 * the source line; retaining them here keeps filters and document reports at
 * Fava parity until the upstream wire output is corrected.
 */
export function buildEntrySourceDetailsMap(
  files: FileMap,
  entryPoint: string,
  parseBlock: BlockParser,
  options: EntrySourceDetailsOptions = {},
): Map<string, EntrySourceDetails> {
  const details = new Map<string, EntrySourceDetails>();
  const occurrences = new Map<string, number>();

  for (const file of includeTraversalOrder(files, entryPoint)) {
    const fileText = files[file];
    if (fileText === undefined) continue;
    const activeTags: string[] = [];

    for (const block of splitIntoBlocks(fileText)) {
      const tagOp = PUSH_POP_TAG_RE.exec(block.text);
      if (tagOp) {
        if (tagOp[1] === "pushtag") {
          activeTags.push(tagOp[2]);
        } else {
          const index = activeTags.indexOf(tagOp[2]);
          if (index !== -1) activeTags.splice(index, 1);
        }
        continue;
      }
      if (!block.isDated) continue;
      if (
        options.documentsOnly === true &&
        !DOCUMENT_LINE_RE.test(block.text.split("\n", 1)[0])
      ) {
        continue;
      }

      for (const directive of parseBlock(block.text)) {
        const base = hashWithActiveTags(directive, activeTags);
        const occurrence = occurrences.get(base) ?? 0;
        occurrences.set(base, occurrence + 1);
        const documentSyntax =
          directive.type === "document"
            ? documentTagsAndLinks(block.text)
            : undefined;
        details.set(entryIdFor(base, occurrence), {
          filename: file,
          lineno: block.startLine + 1,
          ...(documentSyntax?.tags.length
            ? { documentTags: documentSyntax.tags }
            : {}),
          ...(documentSyntax?.links.length
            ? { documentLinks: documentSyntax.links }
            : {}),
        });
      }
    }
  }

  return details;
}

const DOCUMENT_LINE_RE =
  /^\d{4}-\d{2}-\d{2}\s+document\s+\S+\s+"(?:\\.|[^"\\])*"(?<suffix>.*)$/u;
const DOCUMENT_TAG_LINK_RE = /(?<sigil>[#^])(?<value>[A-Za-z0-9\-_/.]+)/gu;

function documentTagsAndLinks(blockText: string): {
  tags: string[];
  links: string[];
} {
  const firstLine = blockText.split("\n", 1)[0];
  const suffix = (DOCUMENT_LINE_RE.exec(firstLine)?.groups?.suffix ?? "").split(
    ";",
    1,
  )[0];
  const tags: string[] = [];
  const links: string[] = [];
  for (const match of suffix.matchAll(DOCUMENT_TAG_LINK_RE)) {
    const target = match.groups?.sigil === "#" ? tags : links;
    const value = match.groups?.value;
    if (value !== undefined && !target.includes(value)) target.push(value);
  }
  return { tags, links };
}

/**
 * Produce the new file content with the block `[startLine, endLine)` removed,
 * matching fava's `delete_source_slice`:
 * `lines[:entry_start] + lines[entry_end:]`. Only the entry's own lines are
 * removed; surrounding blank lines are preserved verbatim (so a deleted entry
 * that had a blank line on each side leaves two adjacent blanks — byte-exact
 * fava behaviour).
 */
export function deleteSliceFromFile(
  fileText: string,
  startLine: number,
  endLine: number,
): string {
  const lines = splitKeepEnds(fileText);
  const kept = [...lines.slice(0, startLine), ...lines.slice(endLine)];
  return kept.join("");
}

/**
 * Produce the new file content with the block `[startLine, endLine)` replaced by
 * `newContent`, matching fava's `update_source_slice`:
 * `[*lines[:entry_start], new_content + "\n", *lines[entry_end:]]`. Note fava
 * always appends exactly one `"\n"` to `newContent` regardless of the original
 * block's trailing newline.
 */
export function replaceSliceInFile(
  fileText: string,
  startLine: number,
  endLine: number,
  newContent: string,
): string {
  const lines = splitKeepEnds(fileText);
  const kept = [
    ...lines.slice(0, startLine),
    `${newContent}\n`,
    ...lines.slice(endLine),
  ];
  return kept.join("");
}

/**
 * Split `text` into lines that keep their trailing `"\n"`, matching Python's
 * `str.splitlines(keepends=True)` for the `"\n"`-only case rustledger emits.
 * A trailing newline does NOT produce a final empty element (unlike
 * `String.prototype.split`).
 */
function splitKeepEnds(text: string): string[] {
  const lines: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") {
      lines.push(text.slice(start, i + 1));
      start = i + 1;
    }
  }
  if (start < text.length) lines.push(text.slice(start));
  return lines;
}

/**
 * A `(currency, cost)`-keyed inventory mirroring beancount's `Inventory`, whose
 * positions we visualise with fava's `to_string(pos)` and order with
 * `Position.sortkey`. This reproduces `context()`'s `visualise` output exactly
 * (units-with-cost display, NOT at-cost valuation).
 */
interface Position {
  units: ScaledDecimal;
  unitsCurrency: string;
  costNumber: BigNumber | null;
  costNumberSource: string | null;
  costCurrency: string | null;
  costDate: string | null;
  costLabel: string | null;
}

/** The per-unit cost number of a posting, if rustledger has booked one. */
function costPerUnitSource(posting: PostingJson): string | null {
  const cost = posting.cost;
  if (!cost || !cost.number) return null;
  const number = cost.number;
  switch (number.kind) {
    case "per_unit":
    case "total":
      return number.value;
    case "per_unit_from_total":
      return number.per_unit;
    case "compound":
      return null;
    default:
      return null;
  }
}

/** Composite lot key: units currency + full cost spec (per beancount). */
function positionKey(posting: PostingJson): string {
  const unitsCurrency = posting.units?.currency ?? "";
  const cost = posting.cost;
  const costNumber = costPerUnitSource(posting) ?? "";
  return [
    unitsCurrency,
    cost?.currency ?? "",
    costNumber,
    cost?.date ?? "",
    cost?.label ?? "",
  ].join("\0");
}

class VisualInventory {
  private readonly positions = new Map<string, Position>();

  /** Mirror `Inventory.add_position(posting)`: net into the matching lot. */
  addPosting(posting: PostingJson): void {
    if (!posting.units) return;
    const key = positionKey(posting);
    const incoming = scaledFromSource(posting.units.number);
    const existing = this.positions.get(key);
    if (existing) {
      const sum = addScaled(existing.units, incoming);
      if (sum.value.isZero()) {
        this.positions.delete(key);
      } else {
        existing.units = sum;
      }
      return;
    }
    if (incoming.value.isZero()) return;
    const costSource = costPerUnitSource(posting);
    this.positions.set(key, {
      units: incoming,
      unitsCurrency: posting.units.currency,
      costNumber: costSource === null ? null : new Amount(costSource),
      costNumberSource: costSource,
      costCurrency: posting.cost?.currency ?? null,
      costDate: posting.cost?.date ?? null,
      costLabel: posting.cost?.label ?? null,
    });
  }

  /** `[to_string(pos) for pos in sorted(iter(inv))]` — fava's `visualise`. */
  visualise(): string[] {
    return [...this.positions.values()]
      .sort(comparePositions)
      .map(positionToString);
  }
}

/** `Position.sortkey`: `(currency_order, cost_number, cost_currency, units)`. */
function comparePositions(a: Position, b: Position): number {
  const orderA =
    CURRENCY_ORDER[a.unitsCurrency] ?? NCURRENCIES + a.unitsCurrency.length;
  const orderB =
    CURRENCY_ORDER[b.unitsCurrency] ?? NCURRENCIES + b.unitsCurrency.length;
  if (orderA !== orderB) return orderA - orderB;
  const costA = a.costNumber ?? new Amount(0);
  const costB = b.costNumber ?? new Amount(0);
  const costCmp = costA.comparedTo(costB) ?? 0;
  if (costCmp !== 0) return costCmp;
  const ccA = a.costCurrency ?? "";
  const ccB = b.costCurrency ?? "";
  if (ccA !== ccB) return ccA < ccB ? -1 : 1;
  return a.units.value.comparedTo(b.units.value) ?? 0;
}

/** fava's `to_string(Position)`: units, plus `{cost}` when the lot is at cost. */
function positionToString(position: Position): string {
  const unitsStr = `${formatScaled(position.units)} ${position.unitsCurrency}`;
  if (position.costNumberSource === null || position.costCurrency === null) {
    return unitsStr;
  }
  // `cost_to_string`: "{number} {currency}, {date}" plus optional , "{label}".
  let costStr = `${position.costNumberSource} ${position.costCurrency}`;
  if (position.costDate) costStr += `, ${position.costDate}`;
  if (position.costLabel) costStr += `, "${position.costLabel}"`;
  return `${unitsStr} {${costStr}}`;
}

/**
 * Accounts of an entry, ordered as fava's `get_entry_accounts`: for a
 * transaction the posting accounts in REVERSE order; for other account-bearing
 * directives their single account (pad returns `[account, source_account]`).
 */
function entryAccounts(directive: DirectiveJson): string[] {
  switch (directive.type) {
    case "transaction":
      return [
        ...directive.postings.map((posting) => posting.account),
      ].reverse();
    case "pad":
      return [directive.account, directive.source_account];
    case "open":
    case "close":
    case "balance":
    case "note":
    case "document":
      return [directive.account];
    default:
      return [];
  }
}

/** Balances-before/after of an entry, for the `context()` endpoint. */
export interface EntryBalances {
  before: Record<string, string[]>;
  after: Record<string, string[]> | null;
}

/**
 * Compute the `context()` balances-before/after for the entry with hash
 * `entryHash`, a faithful port of `SourceSliceModule.context`'s inventory walk.
 *
 * Seeds an inventory per affected account (fava's `get_entry_accounts`), then
 * folds every transaction posting from all PRIOR entries into those accounts
 * (`takewhile(lambda e: e is not entry, all_entries)`), yielding `before`. For a
 * Transaction it then folds the entry's own postings for `after`; for a Balance,
 * `after` is `null`. Returns `null` when the entry is neither a Transaction nor
 * a Balance, or is not found (matching the endpoint's `None, None` cases).
 *
 * `directives` MUST be the full, booked, date-sorted ledger (rustledger's
 * `getDirectives()` output) so cost lots visualise with their booked date.
 */
export function entryBalances(
  directives: DirectiveJson[],
  entryHash: string,
): EntryBalances | null {
  // Resolve the occurrence-disambiguated ID to the k-th directive with the base
  // content hash — so context for the second of two identical entries walks the
  // prior stream up to THAT entry, not the first duplicate.
  const { base, occurrence } = parseEntryId(entryHash);
  let seen = 0;
  let targetIndex = -1;
  for (let i = 0; i < directives.length; i += 1) {
    if (hashEntry(directives[i]) !== base) continue;
    if (seen === occurrence) {
      targetIndex = i;
      break;
    }
    seen += 1;
  }
  if (targetIndex === -1) return null;

  const target = directives[targetIndex];
  if (target.type !== "transaction" && target.type !== "balance") return null;

  const accounts = entryAccounts(target);
  const inventories = new Map<string, VisualInventory>();
  accounts.forEach((account) => {
    if (!inventories.has(account))
      inventories.set(account, new VisualInventory());
  });

  for (let i = 0; i < targetIndex; i += 1) {
    const prior = directives[i];
    if (prior.type !== "transaction") continue;
    prior.postings.forEach((posting) => {
      const inv = inventories.get(posting.account);
      if (inv) inv.addPosting(posting);
    });
  }

  const snapshot = (): Record<string, string[]> => {
    const result: Record<string, string[]> = {};
    inventories.forEach((inv, account) => {
      result[account] = inv.visualise();
    });
    return result;
  };

  const before = snapshot();

  if (target.type === "balance") {
    return { before, after: null };
  }

  target.postings.forEach((posting) => {
    const inv = inventories.get(posting.account);
    if (inv) inv.addPosting(posting);
  });
  return { before, after: snapshot() };
}
