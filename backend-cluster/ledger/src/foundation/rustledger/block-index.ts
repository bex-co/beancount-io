import type { FileMap } from "@rustledger/wasm";
import {
  includeTraversalOrder,
  splitIntoBlocks,
  type SourceBlock,
} from "./source-slice";

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

const OPEN = /^\d{4}-\d{2}-\d{2}\s+open\s+(\S+)/u;

/** Where each account's first `open` is written, in include order. */
export function openLocations(
  files: FileMap,
  entryPoint: string,
): Map<string, { file: string; line: number }> {
  const index = indexBlocks(files);
  const opens = new Map<string, { file: string; line: number }>();
  for (const file of includeTraversalOrder(files, entryPoint)) {
    for (const block of index.blocks(file)) {
      const account = OPEN.exec(block.text)?.[1];
      if (account !== undefined && !opens.has(account)) {
        opens.set(account, { file, line: block.startLine + 1 });
      }
    }
  }
  return opens;
}

/**
 * Finds the entry a check flags, which the stream carries no location for:
 * the first dated block on `date`, in include order, with a line after its
 * first that `holds`. A block found is claimed, so like entries that day are
 * told apart by order, unless `claim` is false.
 */
export function entryLocator(files: FileMap, entryPoint: string) {
  const index = indexBlocks(files);
  const order = includeTraversalOrder(files, entryPoint);
  const claimed = new Set<string>();
  return (
    date: string,
    holds: (line: string) => boolean,
    claim = true,
  ): { file: string; line: number } | null => {
    for (const file of order) {
      for (const block of index.blocks(file)) {
        const key = `${file}\u0000${block.startLine}`;
        if (!block.text.startsWith(date) || claimed.has(key)) continue;
        if (!block.text.split("\n").slice(1).some(holds)) continue;
        if (claim) claimed.add(key);
        return { file, line: block.startLine + 1 };
      }
    }
    return null;
  };
}
