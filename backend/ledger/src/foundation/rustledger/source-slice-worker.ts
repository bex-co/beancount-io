import type { FileMap } from "@rustledger/wasm";
import { getRustledgerWorkerPool } from "./rustledger-worker-pool";
import type { EntrySlice } from "./source-slice";

/** Run source-block booking/matching off the API event loop. */
export function findEntrySliceAsync(
  files: FileMap,
  entryPoint: string,
  entryHash: string,
): Promise<EntrySlice | null> {
  return getRustledgerWorkerPool().findEntrySlice(files, entryPoint, entryHash);
}
