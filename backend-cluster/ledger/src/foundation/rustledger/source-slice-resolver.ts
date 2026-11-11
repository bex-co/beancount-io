import type { FileMap } from "@rustledger/wasm";
import { createBookedBlockParser } from "./booked-block-parser";
import { parseLedgerFilesInProcess, type LedgerSnapshot } from "./engine";
import {
  entrySliceFromSourceLocation,
  findEntrySlice,
  type BlockParser,
  type DatedBlockIndexes,
  type EntrySlice,
} from "./source-slice";

/**
 * Resolve an entry ID to source using one marker-annotated FULL-ledger parse.
 *
 * Booking a reducing CostSpec (`-5 HOOL {}`) depends on inventory accumulated
 * from earlier directives, potentially in another included file. Re-parsing an
 * isolated block/file invents a different cost date and therefore a different
 * hash. The source-details probe carries the correctly-booked full-ledger ID to
 * the original filename/line, so it is the authoritative lookup.
 *
 * The isolated booked-block scan remains a compatibility fallback for invalid
 * ledgers where a complete source-details sidecar cannot be produced.
 */
export async function findEntrySliceWithFullLedger(
  files: FileMap,
  entryPoint: string,
  entryHash: string,
): Promise<EntrySlice | null> {
  return (
    await findEntrySlicesWithFullLedger(files, entryPoint, [entryHash])
  )[0];
}

/**
 * {@link findEntrySliceWithFullLedger} for a batch, from one parse and one
 * scan of each file. A batch delete resolved each entry with its own
 * full-ledger parse, about 65 ms apiece, so 1,000 entries overran the write
 * deadline and committed while answering "retry" (w1/237).
 */
export async function findEntrySlicesWithFullLedger(
  files: FileMap,
  entryPoint: string,
  entryHashes: readonly string[],
): Promise<(EntrySlice | null)[]> {
  let sourceDetails: LedgerSnapshot["sourceDetails"];
  try {
    sourceDetails = (
      await parseLedgerFilesInProcess(files, entryPoint, {
        includeSourceDetails: true,
      })
    ).sourceDetails;
  } catch {
    // Preserve the former best-effort behavior for ledgers that cannot complete
    // a full parse. The fallback is not authoritative for inventory reductions,
    // but can still resolve independent source-backed directives.
  }
  const indexes: DatedBlockIndexes = new Map();
  let parseBlock: BlockParser | undefined;
  const found: (EntrySlice | null)[] = [];
  for (const entryHash of entryHashes) {
    const location = sourceDetails?.[entryHash];
    const located =
      location === undefined
        ? null
        : entrySliceFromSourceLocation(files, location, indexes);
    if (located !== null) {
      found.push(located);
      continue;
    }
    parseBlock ??= await createBookedBlockParser();
    const fallback = findEntrySlice(files, entryPoint, entryHash, parseBlock);
    // Normalize `localOccurrence` to source-SHA occurrence semantics even when
    // the legacy hash scan found the block.
    found.push(
      fallback === null
        ? null
        : (entrySliceFromSourceLocation(
            files,
            { filename: fallback.file, lineno: fallback.startLine + 1 },
            indexes,
          ) ?? fallback),
    );
  }
  return found;
}
