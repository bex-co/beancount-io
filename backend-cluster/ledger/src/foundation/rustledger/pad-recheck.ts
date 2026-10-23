import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { padLocation, unusedPadError } from "./pad-tolerance";
import { splitIntoBlocks } from "./source-slice";

type Pad = Extract<DirectiveJson, { type: "pad" }>;

const BALANCE_CODES = new Set(["E2001", "E2002"]);

function padKey(date: string, account: string, source: string): string {
  return `${date}\0${account}\0${source}`;
}

/** The pads no padding transaction was kept for: Beancount's unused pads. */
function unusedPads(
  directives: readonly DirectiveJson[],
  paddingTransactions: readonly DirectiveJson[],
): Pad[] {
  const padded = new Set<string>();
  for (const transaction of paddingTransactions) {
    if (
      transaction.type === "transaction" &&
      transaction.postings.length >= 2
    ) {
      padded.add(
        padKey(
          transaction.date,
          transaction.postings[0].account,
          transaction.postings[1].account,
        ),
      );
    }
  }
  return directives.filter(
    (directive): directive is Pad =>
      directive.type === "pad" &&
      !padded.has(
        padKey(directive.date, directive.account, directive.source_account),
      ),
  );
}

/** `files[file]` with the block written at 1-based `line` blanked, every other line number kept. */
function withoutBlock(source: string, line: number): string {
  const lines = source.split("\n");
  for (const block of splitIntoBlocks(source)) {
    if (block.startLine + 1 !== line) continue;
    for (let at = block.startLine; at < block.endLine; at += 1) lines[at] = "";
    break;
  }
  return lines.join("\n");
}

const sameError = (a: BeancountError, b: BeancountError) =>
  a.code === b.code &&
  a.message === b.message &&
  (a.file ?? null) === (b.file ?? null) &&
  (a.line ?? null) === (b.line ?? null);

/**
 * What an unused pad hides. Beancount pads only the first balance after a pad
 * and checks every later one on its own; rustledger keeps counting a pad it
 * did not need (or that w21/135 dropped as within tolerance), so a later
 * failing balance was neither reported nor given an Off-by (w21/675, w21/676).
 * Each unused pad is reported (E2003), and the ledger is checked again with
 * those pads blanked out, line numbers kept: the balance failures that run
 * adds are the ones the pad had silenced.
 *
 * `reparse` returns the errors rustledger reports for a file map: `files` with
 * the unused pads blanked, or, where balances were checked on a plugin's
 * transformed stream, that stream without `unused` (w21/704).
 */
export async function errorsHiddenByUnusedPads(
  directives: readonly DirectiveJson[],
  paddingTransactions: readonly DirectiveJson[],
  files: FileMap,
  known: readonly BeancountError[],
  reparse: (
    files: FileMap,
    unused: readonly DirectiveJson[],
  ) => Promise<readonly BeancountError[]>,
): Promise<BeancountError[]> {
  const unused = unusedPads(directives, paddingTransactions);
  if (unused.length === 0) return [];

  const claimed = new Set<string>();
  const located = unused.map((pad) => padLocation(pad, files, claimed));
  const extra: BeancountError[] = [];
  const blanked: FileMap = { ...files };
  let changed = false;
  for (const [file, line] of located) {
    const error = unusedPadError(file, line);
    if (!known.some((existing) => sameError(existing, error))) {
      extra.push(error);
    }
    if (file !== null && line !== null) {
      blanked[file] = withoutBlock(blanked[file], line);
      changed = true;
    }
  }
  if (!changed) return extra;

  for (const error of await reparse(blanked, unused)) {
    if (!BALANCE_CODES.has(error.code ?? "")) continue;
    if ([...known, ...extra].some((existing) => sameError(existing, error))) {
      continue;
    }
    extra.push(error);
  }
  return extra;
}
