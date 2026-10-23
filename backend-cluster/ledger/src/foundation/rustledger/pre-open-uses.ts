import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { indexBlocks } from "./block-index";

/** The engine's ways of saying a directive names an account never opened. */
const UNOPENED = [
  /^Account (\S+) was never opened$/u,
  /^Invalid reference to unknown account '(.+)'$/u,
  /^Pad target account (\S+) was never opened$/u,
];

const DATE = /^(\d{4}-\d{2}-\d{2})\s/u;

/**
 * The engine says a posting dated before its account's `open` used an account
 * "used on D but not opened until O", but only for a posting with an amount.
 * An interpolated posting, a balance, a pad, a note, a document and a close
 * before the open each read "never opened" or "unknown account" instead, which
 * sends a reader to add a second `open` (w23/067). Beancount calls all of them
 * a reference to an inactive account. Each such error, on a directive dated
 * before the account's first open, gets the engine's precise wording; a truly
 * unopened account keeps its own.
 */
export function reportPreOpenUses(
  errors: readonly BeancountError[],
  directives: readonly DirectiveJson[],
  files: FileMap,
): BeancountError[] {
  const openedOn = new Map<string, string>();
  for (const directive of directives) {
    if (directive.type !== "open") continue;
    const earliest = openedOn.get(directive.account);
    if (earliest === undefined || directive.date < earliest) {
      openedOn.set(directive.account, directive.date);
    }
  }
  if (openedOn.size === 0) return [...errors];
  const index = indexBlocks(files);
  return errors.map((error) => {
    if (error.code !== "E1001" || error.file === null || error.line === null) {
      return error;
    }
    const account = UNOPENED.map(
      (pattern) => pattern.exec(error.message)?.[1],
    ).find((match) => match !== undefined);
    const opened = account === undefined ? undefined : openedOn.get(account);
    const used = DATE.exec(index.at(error.file, error.line)?.text ?? "")?.[1];
    if (opened === undefined || used === undefined || used >= opened) {
      return error;
    }
    return {
      ...error,
      message: `Account ${account} used on ${used} but not opened until ${opened}`,
    };
  });
}
