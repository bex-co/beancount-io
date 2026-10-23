import { BadUserInputError } from "@/shared/errors";

/**
 * The tokens a structured entry writes unquoted, checked against Beancount's
 * lexer rules before anything is rendered (w23/033). Written raw, a newline in
 * a tag ended the entry and started directives the caller never sent, and the
 * projected bean-check passed because the smuggled text was valid Beancount.
 *
 * Non-ASCII is accepted wherever Beancount's lexer accepts it, so Unicode
 * account names keep working; whitespace and control characters never are.
 * Tags and links are ASCII in both engines' lexers (`#café` read as `#caf`,
 * `#旅行` not at all), and a quoted flag (`'X`) is not Beancount syntax, so
 * neither is accepted (w21/653).
 */
const NON_ASCII = "[^\\x00-\\x7F]";
const ACCOUNT = new RegExp(
  `^(?:[A-Z]|${NON_ASCII})(?:[A-Za-z0-9-]|${NON_ASCII})*` +
    `(?::(?:[A-Z0-9]|${NON_ASCII})(?:[A-Za-z0-9-]|${NON_ASCII})*)+$`,
  "u",
);
// ZWNJ and ZWJ are format characters (`\p{Cf}`) that Persian and Indic
// words carry ("خانه‌ها"); both engines read them in an account, and the
// app's Open Account allows them (w21/192), so they are not refused (w21/649).
// Every other format and control character still is.
const NOT_IN_A_TOKEN = /(?![\u200c\u200d])[\s\p{C}]/u;

const TOKEN_RULES = {
  date: /^\d{4}-\d{2}-\d{2}$/,
  // Any capital letter, as both engines' grammars and `bea` take (w21/652).
  // Not `%`: valid Beancount, but rustledger reads a `%` posting as a comment
  // (the entry silently loses it) and cannot parse a `%` transaction (w21/650).
  flag: /^[*!&#?A-Z]$/,
  "transaction flag": /^(?:[*!&#?A-Z]|txn)$/,
  tag: /^[A-Za-z0-9_/.-]+$/,
  link: /^[A-Za-z0-9_/.-]+$/,
  // A futures contract starts with a slash (`/ESZ24`, w21/651). A digit right
  // after it is valid Beancount (`/6E`), but rustledger reads `1 /6E` as one
  // sixth of `E`, so the slash must be followed by a letter.
  currency:
    /^(?:[A-Z](?:[A-Z0-9'._-]{0,22}[A-Z0-9])?|\/[A-Z](?:[A-Z0-9'._-]{0,21}[A-Z0-9])?)$/,
  "metadata key": /^[a-z][A-Za-z0-9_-]*$/,
  account: ACCOUNT,
} as const;

type TokenKind = keyof typeof TOKEN_RULES;

function isToken(kind: TokenKind, value: unknown): boolean {
  return (
    typeof value === "string" &&
    !NOT_IN_A_TOKEN.test(value) &&
    TOKEN_RULES[kind].test(value)
  );
}

type Item = Record<string, unknown>;
const asItem = (value: unknown): Item =>
  value && typeof value === "object" ? (value as Item) : {};
const asList = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

/** Every unquoted token a wire row carries, with the field path a refusal names. */
function rowTokens(row: {
  type: string;
  item: unknown;
}): Array<[string, unknown, TokenKind]> {
  const item = asItem(row.item);
  const tokens: Array<[string, unknown, TokenKind]> = [];
  const add = (field: string, value: unknown, kind: TokenKind) => {
    if (value !== undefined && value !== null)
      tokens.push([field, value, kind]);
  };
  const addAll = (field: string, values: unknown, kind: TokenKind) =>
    asList(values).forEach((value, index) =>
      add(`${field}[${index}]`, value, kind),
    );
  const addAmount = (field: string, amount: unknown) =>
    add(`${field}.currency`, asItem(amount).currency, "currency");

  add("date", item.date, "date");
  add("account", item.account, "account");
  switch (row.type) {
    case "transaction":
      add("flag", item.flag, "transaction flag");
      addAll("tags", item.tags, "tag");
      addAll("links", item.links, "link");
      Object.keys(asItem(item.meta)).forEach((key) =>
        add(`meta.${key}`, key, "metadata key"),
      );
      asList(item.postings).forEach((value, index) => {
        const posting = asItem(value);
        add(`postings[${index}].account`, posting.account, "account");
        add(`postings[${index}].flag`, posting.flag, "flag");
        if (posting.units) addAmount(`postings[${index}].units`, posting.units);
        if (posting.price) addAmount(`postings[${index}].price`, posting.price);
      });
      break;
    case "commodity":
      add("currency", item.currency, "currency");
      break;
    case "price":
      add("currency", item.currency, "currency");
      addAmount("amount", item.amount);
      break;
    case "balance":
      addAmount("amount", item.amount);
      break;
    case "open":
      addAll("currencies", item.currencies, "currency");
      break;
    case "document":
      addAll("tags", item.tags, "tag");
      addAll("links", item.links, "link");
      break;
    case "custom":
      asList(item.values).forEach((value, index) => {
        const custom = asItem(value);
        if (custom.kind === "account")
          add(`values[${index}].value`, custom.value, "account");
        if (custom.kind === "amount")
          add(`values[${index}].currency`, custom.currency, "currency");
      });
      break;
  }
  return tokens;
}

/** Refuse a row whose unquoted tokens would not lex as what they claim to be. */
export function assertEntryTokens(
  rows: Array<{ type: string; item: unknown }>,
): void {
  rows.forEach((row, idx) => {
    for (const [field, value, kind] of rowTokens(row)) {
      if (!isToken(kind, value)) {
        const why =
          value === "%" && (kind === "flag" || kind === "transaction flag")
            ? ': the ledger engine cannot read a "%" flag yet, and would drop the posting; use another flag'
            : "";
        throw new BadUserInputError(
          `entry ${idx}: ${field} ${JSON.stringify(value)} is not a valid ${kind}${why}`,
          field,
        );
      }
    }
  });
}

/**
 * Control characters (`\p{Cc}`: C0, DEL and C1) other than tab, line feed and carriage return. A NUL in
 * a payee committed cleanly and then made the whole file unreadable to the
 * loader, which refuses binary data (w21/680).
 */
const CONTROL_CHARACTER = /(?![\t\n\r])\p{Cc}/u;

function describeControl(text: string): string {
  const char = CONTROL_CHARACTER.exec(text)![0];
  return `U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
}

/** The path of the first string in `value` (a key or a value) that holds a control character. */
function findControl(value: unknown, path: string): [string, string] | null {
  if (typeof value === "string") {
    return CONTROL_CHARACTER.test(value)
      ? [path, describeControl(value)]
      : null;
  }
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      const found = findControl(entry, `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (CONTROL_CHARACTER.test(key))
        return [`${path}.${key}`, describeControl(key)];
      const found = findControl(entry, path ? `${path}.${key}` : key);
      if (found) return found;
    }
  }
  return null;
}

/** Refuse a row whose text fields (payee, narration, metadata, …) hold a control character. */
export function assertNoControlCharacters(
  rows: Array<{ type: string; item: unknown }>,
): void {
  rows.forEach((row, idx) => {
    const found = findControl(row.item, "");
    if (found) {
      const field = found[0].replace(/^\./, "");
      throw new BadUserInputError(
        `entry ${idx}: ${field} contains the control character ${found[1]}, which the ledger cannot store as text`,
        field,
      );
    }
  });
}

/** The lines of `text` that start at column zero outside a string. */
function topLevelLines(text: string): string[] {
  const lines: string[] = [];
  let inString = false;
  let lineStart = true;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (lineStart && !inString && char !== "\n" && !/\s/.test(char)) {
      const end = text.indexOf("\n", i);
      lines.push(text.slice(i, end === -1 ? undefined : end));
    }
    lineStart = false;
    if (inString) {
      if (char === "\\") i += 1;
      else if (char === '"') inString = false;
      else if (char === "\n") lineStart = true;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === ";") {
      // A comment runs to the end of the line, quotes and all.
      while (i + 1 < text.length && text[i + 1] !== "\n") i += 1;
    } else if (char === "\n") lineStart = true;
  }
  return lines;
}

/**
 * Whether rendered entry text holds exactly one directive: one line that
 * starts at column zero outside a string, the rest indented or blank. A
 * defense behind `assertEntryTokens` for whatever it does not anticipate.
 */
export function isSingleDirective(text: string): boolean {
  return topLevelLines(text).length === 1;
}

const CONFIGURATION_KEYWORDS = new Set(["option", "plugin", "include"]);

/**
 * Refuse replacement text for one entry unless it is exactly one dated
 * directive with its indented lines; comments may surround it. Spliced in
 * as-is, an `option` line or a second entry was committed and reported as
 * an update of the entry it replaced (w23/036).
 */
export function assertSingleEntryText(text: string, field: string): void {
  if (CONTROL_CHARACTER.test(text)) {
    throw new BadUserInputError(
      `${field} contains the control character ${describeControl(text)}, which the ledger cannot store as text`,
      field,
    );
  }
  const directives = topLevelLines(text).filter(
    (line) => !line.startsWith(";"),
  );
  if (directives.length === 0) {
    throw new BadUserInputError(
      `${field} holds no entry; remove the entry with deleteEntrySource instead`,
      field,
    );
  }
  for (const line of directives) {
    const keyword = /^([a-z]+)\b/.exec(line)?.[1];
    if (keyword && CONFIGURATION_KEYWORDS.has(keyword)) {
      throw new BadUserInputError(
        `\`${keyword}\` configures the ledger and is not an entry; change it with updateLedgerFiles: ${line.trim()}`,
        field,
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}\s/.test(line)) {
      throw new BadUserInputError(
        `${field} must be one dated directive: ${line.trim()}`,
        field,
      );
    }
  }
  if (directives.length > 1) {
    throw new BadUserInputError(
      `${field} holds ${directives.length} entries; edit them one at a time or use updateLedgerFiles`,
      field,
    );
  }
}
