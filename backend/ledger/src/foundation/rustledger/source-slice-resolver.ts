import type { FileMap } from "@rustledger/wasm";
import { createBookedBlockParser } from "./booked-block-parser";
import { parseLedgerFilesInProcess } from "./engine";
import {
  entrySliceFromSourceLocation,
  findEntrySlice,
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
  try {
    const snapshot = await parseLedgerFilesInProcess(files, entryPoint, {
      includeSourceDetails: true,
    });
    const location = snapshot.sourceDetails?.[entryHash];
    if (location !== undefined) {
      const located = entrySliceFromSourceLocation(files, location);
      if (located !== null) return located;
    }
  } catch {
    // Preserve the former best-effort behavior for ledgers that cannot complete
    // a full parse. The fallback is not authoritative for inventory reductions,
    // but can still resolve independent source-backed directives.
  }

  const fallback = findEntrySlice(
    files,
    entryPoint,
    entryHash,
    await createBookedBlockParser(),
  );
  if (fallback === null) return null;
  // Normalize `localOccurrence` to source-SHA occurrence semantics even when
  // the legacy hash scan found the block.
  return (
    entrySliceFromSourceLocation(files, {
      filename: fallback.file,
      lineno: fallback.startLine + 1,
    }) ?? fallback
  );
}
