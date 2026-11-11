import type { FileMap } from "@rustledger/wasm";
import { getRustledgerWorkerPool } from "./rustledger-worker-pool";
import type { EntrySlice } from "./source-slice";

/** Run source-block booking/matching off the API event loop. */
export async function findEntrySliceAsync(
  files: FileMap,
  entryPoint: string,
  entryHash: string,
): Promise<EntrySlice | null> {
  return (await findEntrySlicesAsync(files, entryPoint, [entryHash]))[0];
}

/** {@link findEntrySliceAsync} for a batch, from one parse in one task. */
export function findEntrySlicesAsync(
  files: FileMap,
  entryPoint: string,
  entryHashes: string[],
): Promise<(EntrySlice | null)[]> {
  return getRustledgerWorkerPool().findEntrySlices(
    files,
    entryPoint,
    entryHashes,
  );
}
