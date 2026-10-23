import { posix } from "node:path";
import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { directiveAccounts } from "./auto-accounts";
import { markGeneratedDirective } from "./plugins/provenance";
import { pluginError } from "./plugins/types";

const DOCUMENTS_OPTION =
  /^[^\S\r\n]*option[^\S\r\n]+"documents"[^\S\r\n]+"([^"]*)"/gmu;
/** Beancount's `(\d\d\d\d)-(\d\d)-(\d\d).(.*)`, matched from the start. */
const DATED = /^(\d{4})-(\d{2})-(\d{2})./u;
const SORT_ORDER: Partial<Record<DirectiveJson["type"], number>> = {
  open: -2,
  balance: -1,
  document: 1,
  close: 2,
};

/** Why Python's `datetime.date` refuses a date, or null when it takes it. */
function invalidDate(year: number, month: number, day: number): string | null {
  if (year < 1) return `year ${year} is out of range`;
  if (month < 1 || month > 12) return "month must be in 1..12";
  const days = new Date(Date.UTC(2000, month, 0)).getUTCDate();
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (day < 1 || day > (month === 2 && !leap ? 28 : days)) {
    return "day is out of range for month";
  }
  return null;
}

const normalize = (path: string) =>
  posix.normalize(path).replace(/^\/+/u, "").replace(/\/+$/u, "");

/**
 * Beancount's `option "documents"` discovery (`beancount.ops.documents`, run
 * before any plugin): each root, relative to the entry point's directory,
 * holds folders named for accounts (`Assets/Bank/Checking`), and each file in
 * one named `YYYY-MM-DD.<anything>` is a `document` of that account on that
 * date, when some entry names the account. The engine has no filesystem, so
 * none was ever made and a statement in the folder never reached the account
 * (w21/738); the repository's file list (`repoPaths`) stands in for the disk.
 *
 * A discovered document names its file by repository path and has no source
 * line, so it is marked generated: there is no text to edit or delete. A file
 * whose date does not exist raises Beancount's error instead. The documents
 * come back in date order, for {@link mergeDiscoveredDocuments}.
 *
 * A document dated before its account opens is an inactive reference, as
 * Beancount validates it; the engine had validated before discovery, so it
 * raised nothing (w21/758). Its error names the file and sits on the
 * `option "documents"` line that found it (bean-check gives that file's line
 * 0). `misdated` names those accounts: a revalidation after the fava plugins
 * reports them again, unlocated.
 */
export function discoverDocuments(
  directives: readonly DirectiveJson[],
  entryPointSource: string | undefined,
  entryPoint: string,
  repoPaths: readonly string[] | undefined,
): {
  documents: DirectiveJson[];
  errors: BeancountError[];
  misdated: ReadonlySet<string>;
} {
  const source = entryPointSource ?? "";
  const roots = [...source.matchAll(DOCUMENTS_OPTION)].map((match) => ({
    root: normalize(posix.join(posix.dirname(entryPoint), match[1]!)),
    line: source.slice(0, match.index).split("\n").length,
  }));
  const misdated = new Set<string>();
  if (roots.length === 0 || repoPaths === undefined) {
    return { documents: [], errors: [], misdated };
  }
  const accounts = new Set(directives.flatMap(directiveAccounts));
  const openedOn = new Map<string, string>();
  for (const directive of directives) {
    if (directive.type === "open" && !openedOn.has(directive.account)) {
      openedOn.set(directive.account, directive.date);
    }
  }
  const paths = repoPaths.map(normalize).sort();
  const found: DirectiveJson[] = [];
  const errors: BeancountError[] = [];
  for (const { root, line } of roots) {
    const prefix = root === "." || root === "" ? "" : `${root}/`;
    for (const path of paths) {
      if (!path.startsWith(prefix)) continue;
      const folders = path.slice(prefix.length).split("/");
      const file = folders.pop()!;
      const account = folders.join(":");
      const dated = DATED.exec(file);
      if (dated === null || !accounts.has(account)) continue;
      const [, year = "", month = "", day = ""] = dated;
      const invalid = invalidDate(Number(year), Number(month), Number(day));
      if (invalid !== null) {
        errors.push(
          pluginError(`Invalid date on document file '${file}': ${invalid}`, {
            file: entryPoint,
          }),
        );
        continue;
      }
      const document: DirectiveJson = {
        type: "document",
        date: `${year}-${month}-${day}`,
        account,
        path,
      };
      markGeneratedDirective(document);
      found.push(document);
      // An account never opened is reported for its other uses, or opened
      // by auto_accounts on its first one.
      const opened = openedOn.get(account);
      if (opened !== undefined && document.date < opened) {
        misdated.add(account);
        errors.push({
          ...pluginError(
            `Invalid reference to inactive account '${account}' (document "${path}")`,
            { code: "E1001", file: entryPoint, line },
          ),
          column: 1,
        });
      }
    }
  }
  found.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { documents: found, errors, misdated };
}

/**
 * `directives` with the discovered `found` where Beancount sorts them (a
 * source line of 0): after the day's opens, balances and other entries, before
 * its written documents and closes.
 */
export function mergeDiscoveredDocuments(
  directives: readonly DirectiveJson[],
  found: readonly DirectiveJson[],
): DirectiveJson[] {
  if (found.length === 0) return [...directives];
  const merged: DirectiveJson[] = [];
  let next = 0;
  for (const directive of directives) {
    while (
      next < found.length &&
      (directive.date > found[next]!.date ||
        (directive.date === found[next]!.date &&
          (SORT_ORDER[directive.type] ?? 0) >= 1))
    ) {
      merged.push(found[next++]!);
    }
    merged.push(directive);
  }
  merged.push(...found.slice(next));
  return merged;
}
