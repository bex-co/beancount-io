import { isBeancountFile } from "../../common/ledger-file-types";

export function normalizeLedgerFileName(input: string): string | null {
  const trimmed = input.trim();
  if (
    !trimmed ||
    trimmed === "." ||
    trimmed === ".." ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    /[\u0000-\u001f]/.test(trimmed)
  ) {
    return null;
  }

  const filename = trimmed.includes(".") ? trimmed : `${trimmed}.bean`;
  if (/^\.(bean|beancount)$/i.test(filename)) return null;
  return isBeancountFile(filename) ? filename : null;
}

export function buildLedgerFilePath(
  directory: string,
  filename: string,
): string {
  const cleanDirectory = directory.replace(/^\/+|\/+$/g, "");
  return cleanDirectory ? `${cleanDirectory}/${filename}` : filename;
}

export function canDeleteLedgerFile(filename: string): boolean {
  return filename !== "main.bean";
}

type Entry = { name: string; type: string; path: string };

export function sortEntries<T extends Entry>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.type === "dir" && b.type !== "dir") return -1;
    if (a.type !== "dir" && b.type === "dir") return 1;
    return a.name.localeCompare(b.name);
  });
}

/** A directory stack together with the ledger it was built in. */
export type LedgerPathStack = { ledgerId: string; stack: string[] };

/**
 * The stack to browse with. One from another ledger starts over at the root:
 * the Files tab stays mounted across a ledger switch, and a folder remembered
 * from the previous ledger would list as empty and aim Create file at a path
 * the new ledger never had.
 */
export function pathStackForLedger(
  state: LedgerPathStack,
  ledgerId: string,
): string[] {
  return state.ledgerId === ledgerId ? state.stack : [""];
}

export function pushPathStack(stack: string[], path: string): string[] {
  return [...stack, path];
}

export function popPathStack(stack: string[]): string[] {
  if (stack.length <= 1) return stack;
  return stack.slice(0, -1);
}
