import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { entryLocator, indexBlocks } from "./block-index";
import { includeTraversalOrder } from "./source-slice";

const CLOSE = /^\d{4}-\d{2}-\d{2}\s+close\s+(\S+)/u;
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
 * is still allowed, as Beancount allows it.
 */
export function inactiveAfterGeneratedCloses(
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const index = indexBlocks(files);
  const order = includeTraversalOrder(files, entryPoint);
  const written = new Set<string>();
  for (const file of order) {
    for (const block of index.blocks(file)) {
      const account = CLOSE.exec(block.text)?.[1];
      if (account !== undefined) written.add(account);
    }
  }
  const closedOn = new Map<string, string>();
  for (const directive of directives) {
    if (directive.type === "close" && !written.has(directive.account)) {
      closedOn.set(directive.account, directive.date);
    }
  }
  if (closedOn.size === 0) return [];

  const locate = entryLocator(files, entryPoint);
  const errors: BeancountError[] = [];
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
