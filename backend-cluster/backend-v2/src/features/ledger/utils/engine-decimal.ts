import { BadUserInputError } from "@/shared/errors";
import { ACCOUNT_CHAR } from "./account-matcher";

/**
 * The engine's Decimal holds 28 significant digits: a literal past that is an
 * error, or a changed value read back rounded. The structured-entry builder
 * refuses such literals (`backend-cluster/ledger` `entry-build.ts`, w21/997);
 * packages share no code, so this is the same rule restated for Beancount
 * text and setup opening balances, applied before any write or check
 * (`w23/081`, `w31/078`, `w31/095`).
 */
export const MAX_DECIMAL_DIGITS = 28;

/** How much of an offending literal the refusal names before trimming. */
const LITERAL_PREVIEW = 64;

const WS = /\s+/y;
const DATE_TOKEN = /\d{4}[-/]\d{2}[-/]\d{2}(?![A-Za-z0-9_./-])/y;
const TAG_TOKEN = /#[^\s#^,;{}()]+/y;
const LINK_TOKEN = /\^[^\s#^,;{}()]+/y;
const SLASH_CURRENCY = /\/[A-Z][A-Za-z0-9'._-]*/y;
const UNSIGNED_NUMBER = /[0-9]+(?:,[0-9]+)*(?:\.[0-9]*)?/y;
const ALNUM_WORD = /[0-9A-Za-z'._-]+/y;
const META_KEY = /[a-z][A-Za-z0-9_-]+:(?=\s|$)/y;
const ACCOUNT_TOKEN = new RegExp(
  `[\\p{L}](?:${ACCOUNT_CHAR.source})*(?::(?:${ACCOUNT_CHAR.source})+)+`,
  "yu",
);
const WORD_TOKEN = /[\p{L}][\p{L}\p{Nd}'._-]*/uy;
const CURRENCY_WORD = /^(?:\/[A-Z]|[A-Za-z])[A-Za-z0-9'._-]*$/;
const CUSTOM_DIRECTIVE_START = /^\s*\d{4}[-/]\d{2}[-/]\d{2}\s+custom\b/;
const EXPR_PUNCT = new Set(["+", "-", "*", "/", "(", ")"]);

type CodeTokenKind =
  | "date"
  | "tag"
  | "link"
  | "metaKey"
  | "account"
  | "number"
  | "word"
  | "punct";

interface CodeToken {
  readonly kind: CodeTokenKind;
  readonly text: string;
  readonly braceDepth: number;
}

/** Truncate an overly long offending decimal literal for error messages. */
export function formatEngineDecimalPreview(literal: string): string {
  return literal.length > LITERAL_PREVIEW
    ? `${literal.slice(0, LITERAL_PREVIEW)}…`
    : literal;
}

/**
 * Whether a decimal literal fits the engine's 28 digits, as written: leading
 * zeros carry no value, commas group, and every fraction digit counts — the
 * same count `fitsEngineDecimal` in the ledger service applies (w21/997).
 */
export function fitsEngineDecimal(literal: string): boolean {
  const unsigned = literal.replace(/^[+-]/, "").replace(/,/g, "");
  const dot = unsigned.indexOf(".");
  const whole = (dot === -1 ? unsigned : unsigned.slice(0, dot)).replace(
    /^0+/,
    "",
  );
  const fraction = dot === -1 ? "" : unsigned.slice(dot + 1);
  return (
    whole.length + fraction.length <= MAX_DECIMAL_DIGITS &&
    fraction.length <= MAX_DECIMAL_DIGITS
  );
}

/**
 * Strip quoted strings (respecting `\"` and `\\` escapes across lines) and `;`
 * comments outside strings from one line, returning its code and ending string
 * state.
 */
function scanLine(
  line: string,
  inString: boolean,
): { code: string; inString: boolean } {
  let code = "";
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inString) {
      if (char === "\\") i += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
      code += " ";
    } else if (char === ";") {
      return { code, inString };
    } else {
      code += char;
    }
  }
  return { code, inString };
}

function matchSticky(re: RegExp, text: string, index: number): string | null {
  re.lastIndex = index;
  const match = re.exec(text);
  return match ? match[0] : null;
}

/** Tokenize one line's non-string, non-comment code, tracking `{...}` depth. */
function tokenizeCode(code: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let braceDepth = 0;
  for (let i = 0; i < code.length; ) {
    const ws = matchSticky(WS, code, i);
    if (ws) {
      i += ws.length;
      continue;
    }
    const char = code[i]!;
    if (char === "{") {
      tokens.push({ kind: "punct", text: "{", braceDepth });
      braceDepth += 1;
      i += 1;
      continue;
    }
    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      tokens.push({ kind: "punct", text: "}", braceDepth });
      i += 1;
      continue;
    }
    const date = matchSticky(DATE_TOKEN, code, i);
    if (date) {
      tokens.push({ kind: "date", text: date, braceDepth });
      i += date.length;
      continue;
    }
    if (char === "#" && braceDepth === 0) {
      const tag = matchSticky(TAG_TOKEN, code, i);
      if (tag) {
        tokens.push({ kind: "tag", text: tag, braceDepth });
        i += tag.length;
        continue;
      }
    }
    if (char === "^") {
      const link = matchSticky(LINK_TOKEN, code, i);
      if (link) {
        tokens.push({ kind: "link", text: link, braceDepth });
        i += link.length;
        continue;
      }
    }
    if (char === "/") {
      const currency = matchSticky(SLASH_CURRENCY, code, i);
      if (currency) {
        tokens.push({ kind: "word", text: currency, braceDepth });
        i += currency.length;
        continue;
      }
    }
    const prev = tokens.at(-1);
    const canBeUnarySign =
      (char === "+" || char === "-") &&
      /[0-9]/.test(code[i + 1] ?? "") &&
      prev?.kind !== "number" &&
      !(prev?.kind === "punct" && (prev.text === ")" || prev.text === "}"));
    if (canBeUnarySign || (char >= "0" && char <= "9")) {
      const digitsAt = canBeUnarySign ? i + 1 : i;
      const digits = matchSticky(UNSIGNED_NUMBER, code, digitsAt);
      if (digits) {
        const end = digitsAt + digits.length;
        const after = code[end];
        if (after && /[A-Za-z_.]/.test(after)) {
          if (canBeUnarySign) {
            tokens.push({ kind: "punct", text: char, braceDepth });
            i += 1;
            continue;
          }
          const word = matchSticky(ALNUM_WORD, code, i)!;
          tokens.push({ kind: "word", text: word, braceDepth });
          i += word.length;
          continue;
        }
        tokens.push({
          kind: "number",
          text: code.slice(i, end),
          braceDepth,
        });
        i = end;
        continue;
      }
    }
    const metaKey = matchSticky(META_KEY, code, i);
    if (metaKey) {
      tokens.push({ kind: "metaKey", text: metaKey, braceDepth });
      i += metaKey.length;
      continue;
    }
    const account = matchSticky(ACCOUNT_TOKEN, code, i);
    if (account) {
      tokens.push({ kind: "account", text: account, braceDepth });
      i += account.length;
      continue;
    }
    const word = matchSticky(WORD_TOKEN, code, i);
    if (word) {
      tokens.push({ kind: "word", text: word, braceDepth });
      i += word.length;
      continue;
    }
    tokens.push({ kind: "punct", text: char, braceDepth });
    i += 1;
  }
  return tokens;
}

function isExprToken(token: CodeToken): boolean {
  return (
    token.kind === "number" ||
    (token.kind === "punct" && EXPR_PUNCT.has(token.text))
  );
}

function isCurrencyWord(token: CodeToken | undefined): boolean {
  return token?.kind === "word" && CURRENCY_WORD.test(token.text);
}

/**
 * Numeric literals from one tokenized line that the Beancount engine parses as
 * `Decimal`: amounts and arithmetic expressions before a currency, `balance`
 * amounts before `~`, compound `{per # total}` / `{cost}` lot specs, bare
 * metadata numbers, and `custom` directive numeric values.
 */
function lineAmountLiterals(
  tokens: readonly CodeToken[],
  isCustomDirective: boolean,
): string[] {
  const literals: string[] = [];
  let seenAccountOutsideBraces = false;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]!;
    if (token.kind === "account" && token.braceDepth === 0) {
      seenAccountOutsideBraces = true;
      continue;
    }
    if (!isExprToken(token)) continue;

    const start = i;
    let end = i;
    let hasNumber = token.kind === "number";
    while (end + 1 < tokens.length && isExprToken(tokens[end + 1]!)) {
      end += 1;
      if (tokens[end]!.kind === "number") hasNumber = true;
    }
    i = end;
    if (!hasNumber) continue;

    const prev = tokens[start - 1];
    const next = tokens[end + 1];
    const inBraces = token.braceDepth > 0;
    const isAmountContext =
      isCurrencyWord(next) ||
      (next?.kind === "punct" && next.text === "~") ||
      (inBraces &&
        ((next?.kind === "punct" && next.text === "#") ||
          (prev?.kind === "punct" && prev.text === "#") ||
          seenAccountOutsideBraces)) ||
      (prev?.kind === "metaKey" && end === tokens.length - 1) ||
      isCustomDirective;

    if (!isAmountContext) continue;
    for (let j = start; j <= end; j += 1) {
      if (tokens[j]!.kind === "number") {
        literals.push(tokens[j]!.text);
      }
    }
  }
  return literals;
}

/**
 * The numeric literals a text would commit to the engine's `Decimal` parser,
 * skipping quoted strings (including escaped quotes and multiline strings),
 * `;` comments, and column-0 `*` org-mode headings. When `onlyLines` is given,
 * string state is still tracked from line 0 so multiline strings stay accurate,
 * while only the named 0-based line indices are checked.
 */
export function textAmountLiterals(
  text: string,
  onlyLines?: ReadonlySet<number>,
): string[] {
  const literals: string[] = [];
  let inString = false;
  let inCustomDirective = false;
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (!inString && line.startsWith("*")) continue;
    const startedInString = inString;
    const scanned = scanLine(line, inString);
    inString = scanned.inString;
    const customLine: boolean = startedInString
      ? inCustomDirective
      : CUSTOM_DIRECTIVE_START.test(scanned.code);
    inCustomDirective = inString ? customLine : false;
    if (onlyLines && !onlyLines.has(index)) continue;
    if (!scanned.code.trim()) continue;
    literals.push(
      ...lineAmountLiterals(tokenizeCode(scanned.code), customLine),
    );
  }
  return literals;
}

/**
 * Refuse new Beancount text holding an amount past the engine's 28
 * significant digits, naming the literal and the limit. Binary callers
 * (a NUL byte) skip the scan: only text reaches the engine as amounts.
 */
export function assertAmountsFitEngineDecimal(
  text: string,
  onlyLines?: ReadonlySet<number>,
): void {
  if (text.includes("\0")) return;
  for (const literal of textAmountLiterals(text, onlyLines)) {
    if (!fitsEngineDecimal(literal)) {
      const shown = formatEngineDecimalPreview(literal);
      throw new BadUserInputError(
        `amount ${shown} has more than ${MAX_DECIMAL_DIGITS} significant digits; the engine would read it back rounded`,
        undefined,
        `Shorten the amount to ${MAX_DECIMAL_DIGITS} significant digits or fewer.`,
      );
    }
  }
}
