import type { FileMap } from "@rustledger/wasm";
import { splitIntoBlocks, type SourceBlock } from "./source-slice";

/**
 * Each file's top-level blocks, split on first use and kept for the pass. A
 * lookup per pad or per failing balance used to split the whole file again, so
 * 4000 unused pads took 36 s to load and 4000 failing balances 3.6 s
 * (w21/706).
 */
export function indexBlocks(files: FileMap) {
  const split = new Map<string, Map<number, SourceBlock>>();
  const byLine = (file: string): Map<number, SourceBlock> => {
    let blocks = split.get(file);
    if (blocks === undefined) {
      blocks = new Map();
      for (const block of splitIntoBlocks(files[file] ?? "")) {
        blocks.set(block.startLine + 1, block);
      }
      split.set(file, blocks);
    }
    return blocks;
  };
  return {
    /** `file`'s blocks in order. */
    blocks: (file: string): Iterable<SourceBlock> => byLine(file).values(),
    /** The block that starts on 1-based `line` of `file`, if one does. */
    at: (file: string, line: number): SourceBlock | undefined =>
      byLine(file).get(line),
  };
}

export type BlockIndex = ReturnType<typeof indexBlocks>;
