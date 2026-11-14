/**
 * Rename one account, and every account under it, in Beancount source text
 * (w1/m43). Lexer-aware: only account tokens outside strings and comments
 * change, and a token matches on whole account names, so renaming
 * `Assets:Check` leaves `Assets:Checking` alone and `Assets:Check:Old`
 * becomes `<to>:Old`.
 *
 * Strings may span lines and hold `\"`; a `;` starts a comment to the end of
 * the line; a line starting with `*` is an org-mode heading Beancount skips.
 * Line endings are kept byte for byte.
 */

/** What the rename does, as REST, GraphQL and MCP describe it; each adds its own preview and undo names. */
export const RENAME_ACCOUNT_DESCRIPTION =
  "Rename an account and every account under it across the ledger's loaded files in one commit: account tokens outside strings and comments, whole names only. Bank mappings move with it. Refused for an invalid name, another root, or a name the ledger already uses; new bean-check errors refuse the commit unless allowInvalid.";

export interface AccountRenameChange {
  /** 1-based line of the source text. */
  line: number;
  before: string;
  after: string;
}

/**
 * A character an account token can hold, as the loader reads it: ASCII
 * letters, digits and `-`, or any non-ASCII character that is not a space or
 * a control (`account-matcher.ts` approximates the same lexer).
 */
const NAME_CHAR = /[A-Za-z0-9-]|[^\p{ASCII}\s\p{Cc}\p{Cf}]/u;

function isNameChar(char: string | undefined): boolean {
  return char !== undefined && NAME_CHAR.test(char);
}

/** Whether the account name at `text[j]` goes on: a name character, or `:` before one. */
function continuesName(text: string, j: number): boolean {
  return isNameChar(text[j]) || (text[j] === ":" && isNameChar(text[j + 1]));
}

/** Each position in `text` where an account token names `account` or one under it. */
export function accountTokenOffsets(text: string, account: string): number[] {
  const offsets: number[] = [];
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (char === "\\") i++;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (
      char === ";" ||
      (char === "*" && (i === 0 || text[i - 1] === "\n"))
    ) {
      const end = text.indexOf("\n", i);
      if (end === -1) break;
      i = end;
    } else if (
      text.startsWith(account, i) &&
      !isNameChar(text[i - 1]) &&
      text[i - 1] !== ":"
    ) {
      const j = i + account.length;
      // The name ends here, or goes on only under `account` (`account:Child`).
      if (text[j] === ":" ? isNameChar(text[j + 1]) : !isNameChar(text[j])) {
        offsets.push(i);
      }
    }
  }
  return offsets;
}

/** The full name of the account token starting at `offset`. */
function nameAt(text: string, offset: number, prefixLength: number): string {
  let end = offset + prefixLength;
  while (continuesName(text, end)) end++;
  return text.slice(offset, end);
}

/** The names at or under `account` that account tokens in `text` spell, at `offsets`. */
export function accountNamesAt(
  text: string,
  offsets: readonly number[],
  account: string,
): string[] {
  return offsets.map((offset) => nameAt(text, offset, account.length));
}

/** The distinct account names at or under `account` across `texts`. */
export function accountNamesUnder(
  texts: readonly string[],
  account: string,
): Set<string> {
  return new Set(
    texts.flatMap((text) =>
      accountNamesAt(text, accountTokenOffsets(text, account), account),
    ),
  );
}

/** `name` with `from` replaced by `to` when it is `from` or under it; otherwise undefined. */
export function renameAccountName(
  name: string,
  from: string,
  to: string,
): string | undefined {
  return name === from || name.startsWith(`${from}:`)
    ? to + name.slice(from.length)
    : undefined;
}

/**
 * `text` with the account tokens at `offsets` (each naming `from` or one under
 * it) renamed to `to`, and the lines that changed.
 */
export function renameAccountAt(
  text: string,
  offsets: readonly number[],
  from: string,
  to: string,
): { text: string; changes: AccountRenameChange[] } {
  if (offsets.length === 0) return { text, changes: [] };
  let renamed = "";
  let last = 0;
  for (const offset of offsets) {
    renamed += text.slice(last, offset) + to;
    last = offset + from.length;
  }
  renamed += text.slice(last);
  const before = text.split("\n");
  const after = renamed.split("\n");
  const changes = before.flatMap((line, index) =>
    line === after[index]
      ? []
      : [
          {
            line: index + 1,
            before: line.replace(/\r$/u, ""),
            after: after[index].replace(/\r$/u, ""),
          },
        ],
  );
  return { text: renamed, changes };
}

/** `renameAccountAt` over every account token in `text` naming `from` or one under it. */
export function renameAccountInText(
  text: string,
  from: string,
  to: string,
): { text: string; changes: AccountRenameChange[] } {
  return renameAccountAt(text, accountTokenOffsets(text, from), from, to);
}

/** The account names (with `from`'s descendants) a rename maps, in first-seen order. */
export function renamedAccounts(
  texts: readonly string[],
  from: string,
  to: string,
): { from: string; to: string }[] {
  return [...accountNamesUnder(texts, from)].map((name) => ({
    from: name,
    to: renameAccountName(name, from, to)!,
  }));
}
