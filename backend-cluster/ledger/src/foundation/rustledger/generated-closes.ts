import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { closeLocations, entryLocator, indexBlocks } from "./block-index";
import { includeTraversalOrder } from "./source-slice";

/** A posting line's account, after its flag if it has one. */
const POSTING = /^\s+(?:[*!&#?%]\s*|[PSTCURM]\s+)?(\S+)/u;

/**
 * Postings after a close the source does not write: one `close_tree` adds for
 * each open child of a closed account. The engine validates the closes it
 * parsed, before its plugins run, so money moved into a child closed this way
 * with no error, where bean-check reports "Invalid reference to inactive
 * account" (w21/737). Each such posting gets the error an explicit close
 * raises (E1003, once per posting), on its transaction's first line.
 *
 * A close sorts after the day's other entries, so a posting on the close date
 * is still allowed, as Beancount allows it. And `close_tree` closes every
 * child, even one opened after its parent's close. Beancount walks the
 * entries in date order, so that close comes before the open: the child
 * stays open, and the ledger has one error instead, "Unopened account … is
 * being closed", placed here on the parent's close. Read as closed, each
 * posting to such a child was refused as a new error (w21/753).
 */
export function inactiveAfterGeneratedCloses(
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const written = closeLocations(files, entryPoint);
  const openedOn = new Map<string, string>();
  for (const directive of directives) {
    if (directive.type === "open" && !openedOn.has(directive.account)) {
      openedOn.set(directive.account, directive.date);
    }
  }
  const closedOn = new Map<string, string>();
  const errors: BeancountError[] = [];
  for (const directive of directives) {
    if (directive.type !== "close" || written.has(directive.account)) continue;
    const opened = openedOn.get(directive.account);
    if (opened === undefined || opened <= directive.date) {
      closedOn.set(directive.account, directive.date);
      continue;
    }
    // The closest parent whose written close made this one.
    const parent = [...written.keys()]
      .filter((account) => directive.account.startsWith(`${account}:`))
      .sort((a, b) => b.length - a.length)[0];
    const at = parent === undefined ? undefined : written.get(parent);
    errors.push({
      message: `Unopened account ${directive.account} is being closed`,
      code: "E1001",
      phase: "validate",
      hint: null,
      file: at?.file ?? null,
      line: at?.line ?? null,
      column: at ? 1 : null,
      end_line: null,
      end_column: null,
      severity: "error",
    });
  }
  if (closedOn.size === 0) return errors;

  const locate = entryLocator(files, entryPoint);
  for (const directive of directives) {
    if (directive.type !== "transaction") continue;
    const late = directive.postings.filter((posting) => {
      const closed = closedOn.get(posting.account);
      return closed !== undefined && directive.date > closed;
    });
    if (late.length === 0) continue;
    const account = late[0]!.account;
    const at = locate(
      directive.date,
      (line) => POSTING.exec(line)?.[1] === account,
    );
    for (const posting of late) {
      errors.push({
        message: `Posting to inactive account ${posting.account} on ${directive.date} (closed on ${closedOn.get(posting.account)})`,
        code: "E1003",
        phase: "validate",
        hint: null,
        file: at?.file ?? null,
        line: at?.line ?? null,
        column: at ? 1 : null,
        end_line: null,
        end_column: null,
        severity: "error",
      });
    }
  }
  return errors;
}

const PAD = /^(\d{4}-\d{2}-\d{2})\s+pad\s+(\S+)\s+(\S+)/u;

/**
 * A pad naming an account after its close. Beancount allows only balances,
 * documents and notes after a close, so a pad is "Invalid reference to
 * inactive account" on its line, as bean-check says it. The engine checks
 * only transactions, so a pad into a closed account, close_tree's or one
 * written, raised nothing (w21/756). Reported once per pad: bean-check
 * repeats it for the padding the pad makes.
 */
export function inactivePads(
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const openedOn = new Map<string, string>();
  const closedOn = new Map<string, string>();
  for (const directive of directives) {
    if (directive.type === "open" && !openedOn.has(directive.account)) {
      openedOn.set(directive.account, directive.date);
    }
  }
  for (const directive of directives) {
    if (directive.type !== "close") continue;
    const opened = openedOn.get(directive.account);
    if (opened === undefined || opened <= directive.date) {
      closedOn.set(directive.account, directive.date);
    }
  }
  const late = (account: string, date: string) => {
    const closed = closedOn.get(account);
    return closed !== undefined && date > closed;
  };
  const pads = directives.filter(
    (directive): directive is Extract<DirectiveJson, { type: "pad" }> =>
      directive.type === "pad" &&
      (late(directive.account, directive.date) ||
        late(directive.source_account, directive.date)),
  );
  if (pads.length === 0) return [];

  const index = indexBlocks(files);
  const order = includeTraversalOrder(files, entryPoint);
  const claimed = new Set<string>();
  const locate = (pad: Extract<DirectiveJson, { type: "pad" }>) => {
    for (const file of order) {
      for (const block of index.blocks(file)) {
        const key = `${file}\u0000${block.startLine}`;
        const match = PAD.exec(block.text);
        if (
          claimed.has(key) ||
          match === null ||
          match[1] !== pad.date ||
          match[2] !== pad.account ||
          match[3] !== pad.source_account
        ) {
          continue;
        }
        claimed.add(key);
        return { file, line: block.startLine + 1 };
      }
    }
    return null;
  };
  return pads.flatMap((pad) => {
    const at = locate(pad);
    return [pad.account, pad.source_account]
      .filter((account) => late(account, pad.date))
      .map((account): BeancountError => ({
        message: `Invalid reference to inactive account '${account}'`,
        code: "E1003",
        phase: "validate",
        hint: null,
        file: at?.file ?? null,
        line: at?.line ?? null,
        column: at ? 1 : null,
        end_line: null,
        end_column: null,
        severity: "error",
      }));
  });
}
