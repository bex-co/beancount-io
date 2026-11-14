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

export interface AccountRenameChange {
  /** 1-based line of the source text. */
  line: number;
  before: string;
  after: string;
}

/** A character of an account name component (Beancount: letters, digits, `-`). */
const NAME_CHAR = /[\p{L}\p{N}-]/u;

/** Each position in `text` where an account token names `account` or one under it. */
export function accountTokenOffsets(text: string, account: string): number[] {
  const offsets: number[] = [];
  let inString = false;
  let atLineStart = true;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (char === "\\") i++;
      else if (char === '"') inString = false;
      atLineStart = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      atLineStart = false;
      continue;
    }
    if (char === ";" || (atLineStart && char === "*")) {
      const end = text.indexOf("\n", i);
      if (end === -1) break;
      i = end;
      atLineStart = true;
      continue;
    }
    if (char === "\n") {
      atLineStart = true;
      continue;
    }
    atLineStart = false;
    if (
      char === account[0] &&
      text.startsWith(account, i) &&
      startsToken(text, i)
    ) {
      const next = text[i + account.length];
      const descendant =
        next === ":" && NAME_CHAR.test(text[i + account.length + 1] ?? "");
      if (
        next === undefined ||
        descendant ||
        !(NAME_CHAR.test(next) || next === ":")
      ) {
        offsets.push(i);
      }
    }
  }
  return offsets;
}

function startsToken(text: string, i: number): boolean {
  const previous = text[i - 1];
  return (
    previous === undefined || !(NAME_CHAR.test(previous) || previous === ":")
  );
}

/**
 * `text` with every account token naming `from` (or one under it) renamed to
 * `to`, and the lines that changed.
 */
export function renameAccountInText(
  text: string,
  from: string,
  to: string,
): { text: string; changes: AccountRenameChange[] } {
  const offsets = accountTokenOffsets(text, from);
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

/** The account names (with `from`'s descendants) a rename maps, in first-seen order. */
export function renamedAccounts(
  texts: readonly string[],
  from: string,
  to: string,
): { from: string; to: string }[] {
  const seen = new Map<string, string>();
  for (const text of texts) {
    for (const offset of accountTokenOffsets(text, from)) {
      let end = offset + from.length;
      while (
        end < text.length &&
        (NAME_CHAR.test(text[end]) ||
          (text[end] === ":" && NAME_CHAR.test(text[end + 1] ?? "")))
      ) {
        end++;
      }
      const name = text.slice(offset, end);
      if (!seen.has(name)) seen.set(name, to + name.slice(from.length));
    }
  }
  return [...seen].map(([name, renamed]) => ({ from: name, to: renamed }));
}
