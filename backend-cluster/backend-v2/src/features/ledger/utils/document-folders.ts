import { posix } from "node:path";

/**
 * Beancount's `option "documents"` (`beancount.ops.documents`): each root,
 * relative to the entry point's folder, holds folders named for accounts, and
 * a file `YYYY-MM-DD.<anything>` in `<root>/Assets/Bank/Checking` is a
 * document of `Assets:Bank:Checking` while some entry names that account. The
 * hosted engine reads the option from the entry point alone, with this
 * pattern (`backend-cluster/ledger`, `document-discovery.ts`), so an account
 * rename finds the folders it has to move the same way (w31/149).
 */
const DOCUMENTS_OPTION =
  /^[^\S\r\n]*option[^\S\r\n]+"documents"[^\S\r\n]+"([^"]*)"/gmu;

/**
 * Each documents root `source` (the entry point's text) declares, as a
 * repository path: `""` for the repository root. A root outside the
 * repository holds no folder a commit could move, so it is left out.
 */
export function documentRoots(source: string, entryPoint: string): string[] {
  const roots = [...source.matchAll(DOCUMENTS_OPTION)].flatMap((match) => {
    const root = posix
      .normalize(posix.join(posix.dirname(entryPoint), match[1]!))
      .replace(/^\/+/u, "")
      .replace(/\/+$/u, "");
    if (root === ".." || root.startsWith("../")) return [];
    return [root === "." ? "" : root];
  });
  return [...new Set(roots)];
}

/** The folder under `root` that holds `account`'s documents. */
export function accountFolder(root: string, account: string): string {
  const folders = account.split(":").join("/");
  return root === "" ? folders : `${root}/${folders}`;
}
