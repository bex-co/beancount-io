import type { DirectiveJson, FileMap } from "@rustledger/wasm";
import { indexBlocks } from "./block-index";
import { includeTraversalOrder } from "./source-slice";

/**
 * An indented line's metadata key (lowercase first, as Beancount requires) or
 * posting account (after its flag, if it has one).
 */
const LINE =
  /^[ \t]+(?:([a-z][A-Za-z0-9_-]*):(?=\s|$)|(?:[*!&#?%][ \t]*|[PSTCURM][ \t]+)?([^\s;a-z]\S*:\S*))/gmu;
const HEADER = /^(\d{4}-\d{2}-\d{2})\s/u;

type Written = {
  /** The entry's own keys, as written. */
  keys: string[];
  postings: { account: string; keys: string[] }[];
  header: string;
};

/** The keys an entry's lines write, its own and each posting's. */
function writtenKeys(text: string): Written {
  const newline = text.indexOf("\n");
  const header = newline === -1 ? text : text.slice(0, newline);
  const written: Written = { keys: [], postings: [], header };
  for (const [, key, account] of text.matchAll(LINE)) {
    if (key !== undefined) {
      (written.postings.at(-1)?.keys ?? written.keys).push(key);
    } else if (account !== undefined) {
      written.postings.push({ account, keys: [] });
    }
  }
  return written;
}

const userKeys = (meta: Record<string, unknown> | undefined) =>
  Object.keys(meta ?? {}).filter(
    (key) => !(key.startsWith("__") && key.endsWith("__")),
  );

/**
 * `meta` with its keys in `order`; keys `order` does not hold follow by
 * name, so the result is the same on every parse.
 */
function ordered<T>(
  meta: Record<string, T>,
  order: readonly string[],
): Record<string, T> {
  const rank = (key: string) => {
    const at = order.indexOf(key);
    return at === -1 ? Infinity : at;
  };
  const keys = Object.keys(meta).sort(
    (a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0),
  );
  return Object.fromEntries(keys.map((key) => [key, meta[key]!]));
}

const holdsAll = (written: readonly string[], keys: readonly string[]) =>
  keys.every((key) => written.includes(key));

/**
 * Puts each entry's and posting's metadata in the order the source writes it.
 * The engine's meta is a hash map, so an invoice's fields came back in another
 * order on each load ("note, po, due, invoice, paid", then "paid, invoice,
 * due, note, po") (w21/778). An entry is found by its date and keys, the first
 * unclaimed of its day in include order; one the source does not show (a
 * plugin's) is ordered by key. Reordered in place, so each directive keeps its
 * identity (and its provenance); meta is not hashed, so entry IDs stay.
 */
export function orderMetaAsWritten(
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): void {
  const pending = directives.flatMap((directive) => {
    const keys = userKeys(directive.meta);
    const postings =
      directive.type === "transaction"
        ? directive.postings.map((posting) => ({
            posting,
            keys: userKeys(posting.meta),
          }))
        : [];
    return keys.length > 1 ||
      postings.some((posting) => posting.keys.length > 1)
      ? [{ directive, keys, postings }]
      : [];
  });
  if (pending.length === 0) return;
  const dates = new Set(pending.map(({ directive }) => directive.date));

  const byDate = new Map<string, { written: Written; claimed: boolean }[]>();
  const index = indexBlocks(files);
  for (const file of includeTraversalOrder(files, entryPoint)) {
    for (const block of index.blocks(file)) {
      const date = HEADER.exec(block.text)?.[1];
      if (date === undefined || !dates.has(date)) continue;
      const day = byDate.get(date) ?? [];
      day.push({ written: writtenKeys(block.text), claimed: false });
      byDate.set(date, day);
    }
  }

  for (const { directive, keys, postings } of pending) {
    const fits = ({ written }: { written: Written }) =>
      holdsAll(written.keys, keys) &&
      postings.every(
        (posting) =>
          posting.keys.length === 0 ||
          written.postings.some(
            (line) =>
              line.account === posting.posting.account &&
              holdsAll(line.keys, posting.keys),
          ),
      );
    const day = byDate.get(directive.date) ?? [];
    const narration =
      directive.type === "transaction" && directive.narration
        ? JSON.stringify(directive.narration)
        : null;
    const found =
      day.find(
        (block) =>
          !block.claimed &&
          fits(block) &&
          (narration === null || block.written.header.includes(narration)),
      ) ?? day.find((block) => !block.claimed && fits(block));
    if (found !== undefined) found.claimed = true;
    const written = found?.written;

    if (keys.length > 1) {
      directive.meta = ordered(directive.meta!, written?.keys ?? []);
    }
    const claimedLines = new Set<number>();
    for (const { posting, keys: postingKeys } of postings) {
      if (postingKeys.length < 2) continue;
      const at = (written?.postings ?? []).findIndex(
        (line, i) =>
          !claimedLines.has(i) &&
          line.account === posting.account &&
          holdsAll(line.keys, postingKeys),
      );
      if (at !== -1) claimedLines.add(at);
      posting.meta = ordered(posting.meta!, written?.postings[at]?.keys ?? []);
    }
  }
}
