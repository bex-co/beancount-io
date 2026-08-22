import type { DirectiveJson, FileMap } from "@rustledger/wasm";
import { loadRustledger, type RustledgerModule } from "./loader";

export type BookedBlockParser = (text: string) => DirectiveJson[];

const BLOCK_ENTRY_POINT = "__source_slice_block__.bean";

/**
 * Build a synchronous parser for source-slice reconciliation that runs the
 * same booking phase as a full ledger parse. `mod.parse()` only produces raw
 * CostSpecs, so total (`{{...}}`) and compound (`{N # M}`) costs hash
 * differently from the booked directives returned by `Ledger.fromFiles()`.
 *
 * Every short-lived WASM ledger is released before the parser returns.
 */
export function bookedBlockParserFromModule(
  mod: Pick<RustledgerModule, "Ledger">,
): BookedBlockParser {
  return (text: string): DirectiveJson[] => {
    const files: FileMap = { [BLOCK_ENTRY_POINT]: text };
    const ledger = mod.Ledger.fromFiles(files, BLOCK_ENTRY_POINT);
    try {
      return ledger.getDirectives();
    } finally {
      ledger.free();
    }
  };
}

/** Load rustledger once, then return the booked per-block parser. */
export async function createBookedBlockParser(): Promise<BookedBlockParser> {
  return bookedBlockParserFromModule(await loadRustledger());
}
