import type { DirectiveJson } from "@rustledger/wasm";
import { buildEntryIdMap } from "./entry-hash";
import { getDirectiveSourceId } from "./plugins/provenance";
import type { EntrySourceLocation } from "./source-slice";

/** The lines a source-slice write just occupied inside one file. */
export interface ReplacedSourceRange {
  file: string;
  /** 0-based line the new content starts on (the replaced block's start). */
  startLine: number;
  /** How many lines the new content spans (`newContent.split("\n").length`). */
  lineCount: number;
}

/** The parts of a `LedgerSnapshot` this resolver reads. */
export interface EntryIdSnapshot {
  directives: readonly DirectiveJson[];
  sourceDetails?: Readonly<Record<string, EntrySourceLocation>>;
}

/**
 * Public entry ID of the directive whose source block now begins inside
 * `range`, resolved from a post-write ledger parse that carries source details
 * (`parseLedgerFiles(..., { includeSourceDetails: true })`).
 *
 * An entry's ID is content-derived (`hashEntry`, occurrence-disambiguated), so
 * editing an entry almost always changes it. Clients that keep the edited
 * entry on screen (transaction detail → edit → back) need the NEW identity,
 * which only a full, correctly booked parse of the committed content can
 * produce: the block parsed in isolation would mis-hash lot reductions and
 * lose file-level `pushtag` state.
 *
 * The source-details index is keyed by source-backed IDs (the pre-plugin
 * stream); the journal/context endpoints key on the post-plugin public IDs,
 * so the match is mapped through directive provenance. When several dated
 * blocks landed in the range (multi-entry content) the first one wins.
 * Returns `undefined` when nothing dated parsed inside the range — the caller
 * keeps the request's hash, the pre-existing behaviour.
 */
export function resolveEntryIdAtSource(
  snapshot: EntryIdSnapshot,
  range: ReplacedSourceRange,
): string | undefined {
  const details = snapshot.sourceDetails;
  if (details === undefined) return undefined;

  const firstLine = range.startLine + 1;
  const lastLine = range.startLine + Math.max(1, range.lineCount);
  let sourceId: string | undefined;
  let sourceLine = Number.POSITIVE_INFINITY;
  for (const [id, location] of Object.entries(details)) {
    if (
      location.filename !== range.file ||
      location.lineno < firstLine ||
      location.lineno > lastLine ||
      location.lineno >= sourceLine
    ) {
      continue;
    }
    sourceId = id;
    sourceLine = location.lineno;
  }
  if (sourceId === undefined) return undefined;

  const directives = snapshot.directives as DirectiveJson[];
  const publicIds = buildEntryIdMap(directives);
  for (const directive of directives) {
    if (getDirectiveSourceId(directive) !== sourceId) continue;
    const publicId = publicIds.get(directive);
    if (publicId !== undefined) return publicId;
  }
  // No provenance (a parse that did not seed source IDs): the public stream IS
  // the source stream, so the source-backed ID is the public one.
  return sourceId;
}
