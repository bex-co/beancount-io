import BigNumber from "bignumber.js";
import {
  divideWithPythonDecimalContext,
  roundWithPythonDecimalContext,
} from "./decimal-context";
import { utcDate } from "./utc-date";

/**
 * What stock's parser refuses in one posting's cost and price that rustledger
 * 0.24.0 loads without a word (w31/120), each with stock's wording:
 *
 *  - a negative per-unit or total price (`10 EUR @ -1.10 USD`): `Negative
 *    prices are not allowed`. The engine keeps the sign, so the entry balanced
 *    as "received 10 EUR and 11 USD" and every weight built on it followed.
 *    Stock also folds the sign and then fails the balance; the error alone is
 *    enough to keep the entry from counting as clean;
 *  - a merge cost (`{*}`): `Cost merging is not supported yet`, and
 *    `Duplicate merge-cost spec` for a second `*`;
 *  - a second amount, date or label in one `{…}`: `Duplicate cost`,
 *    `Duplicate date`, `Duplicate label`. The engine keeps the first;
 *  - a cost and a price in two currencies (`{100.00 USD} @ 90.00 EUR`):
 *    `Cost and price currencies must match: USD != EUR` (w31/148). The engine
 *    books the lot at its cost and keeps the price. A `{}` or a cost with no
 *    currency is no mismatch, and the first amount of the cost spec is the one
 *    stock compares;
 *  - a per-unit cost inside a total cost (`{{100 # 5 USD}}`): `Per-unit cost
 *    may not be specified using total cost syntax`. The engine books 100 per
 *    unit plus 5 in total, where stock keeps only the 5, so the elided leg
 *    moved 1000 USD more than stock books;
 *  - a total price on a posting with no units (`Expenses:Food  @@ 10.00 USD`):
 *    `Total price on a posting without units`. Stock drops the price; the
 *    engine keeps one.
 *
 * The line is read with stock's lexer rules (a `1,000.00` number, a
 * `2026/1/5` date, a string with `\"` in it is one label, a comma inside one is
 * not a separator) and its grammar for a posting: units, an optional cost
 * spec, an optional `@` or `@@` price. A price or a cost number may be an
 * expression (`@ (1-2.1) USD`), evaluated the way Python's `Decimal` does, so
 * the message shows the number stock shows. A line that does not read as a
 * posting in that grammar is left alone: stock refuses it as a syntax error,
 * and so does the engine.
 *
 * Three syntax errors are read here too, for `stock-syntax-errors.ts`:
 *
 *  - a currency that runs into a `-` (`1 QAB-`, w31/154). Stock's currency
 *    ends in a capital or a digit, so it reads `QAB` and then a `-` its grammar
 *    cannot take; the engine reads one currency named `QAB-`. See
 *    {@link postingCurrencyMinus};
 *  - a keyword where a currency goes (`1 TRUE-`, w31/157). Stock's lexer reads
 *    `TRUE`, `FALSE` and `NULL` as a bool and a null before it reads a
 *    currency; the engine reads one currency named `TRUE-`. See
 *    {@link postingKeywordCurrency};
 *  - a token after a posting's amount, cost or price (`1 QAB -`, `1 QAB ,`,
 *    w31/157), which the engine skips. See {@link postingStrayToken}.
 *
 * {@link stockTokenAt} names a token the way stock's grammar does in those
 * messages.
 */

export interface PostingSyntaxError {
  code: string;
  message: string;
}

type Op =
  | "{"
  | "}"
  | "{{"
  | "}}"
  | "@"
  | "@@"
  | ","
  | "#"
  | "*"
  | "+"
  | "-"
  | "/"
  | "("
  | ")";

/** A token and where it stands in the text read: from `start`, up to `end`. */
type Token = (
  | { kind: "number"; text: string }
  | { kind: "date"; text: string }
  | { kind: "string"; value: string }
  | { kind: "currency"; text: string }
  | { kind: "op"; op: Op }
) & { start: number; end: number };

const WHITESPACE = /[ \t\r]+/y;
const STRING = /"((?:[^\\"]|\\.)*)"/y;
const DATE = /\d{4,}[-/]\d+[-/]\d+/y;
const NUMBER = /(?:\d[\d,]*\d|\d)(?:\.\d*)?/y;
/**
 * A currency as stock's lexer reads one: a capital, then capitals, digits and
 * `'._-`, ending in a capital or a digit, or a futures contract (`/` and a run
 * with a capital in it). `QAB.` is `QAB` and then a `.` (w31/154).
 */
export const STOCK_CURRENCY = String.raw`[A-Z][A-Z0-9'._-]*[A-Z0-9]|\/[A-Z0-9'._-]*[A-Z](?:[A-Z0-9'._-]*[A-Z0-9])?`;
const CURRENCY = new RegExp(`(?:${STOCK_CURRENCY})`, "y");
/** A lone capital is a currency only before whitespace, as stock's lexer reads it. */
const CAPITAL = /[A-Z](?=[ \t\r]|$)/y;
const OPS: readonly Op[] = [
  "{{",
  "}}",
  "@@",
  "{",
  "}",
  "@",
  ",",
  "#",
  "*",
  "+",
  "-",
  "/",
  "(",
  ")",
];
const ESCAPES: Record<string, string> = { n: "\n", t: "\t", r: "\r" };

function matchAt(pattern: RegExp, text: string, at: number): string | null {
  pattern.lastIndex = at;
  return pattern.exec(text)?.[0] ?? null;
}

/**
 * The tokens of `text` up to a comment, and whether stock's lexer reads all of
 * it: `whole` is false at a character it refuses or a keyword or tag, which
 * `stop` is the offset of, and `tokens` are the ones before it.
 */
function lex(text: string): { tokens: Token[]; whole: boolean; stop: number } {
  const tokens: Token[] = [];
  let at = 0;
  const stop = () => ({ tokens, whole: false, stop: at });
  while (at < text.length) {
    const space = matchAt(WHITESPACE, text, at);
    if (space !== null) {
      at += space.length;
      continue;
    }
    if (text[at] === ";") break;
    if (text[at] === '"') {
      STRING.lastIndex = at;
      const found = STRING.exec(text);
      if (found === null) return stop(); // the string goes on past this line
      tokens.push({
        kind: "string",
        value: found[1]!.replace(/\\(.)/gu, (_, char: string) =>
          Object.hasOwn(ESCAPES, char) ? ESCAPES[char]! : char,
        ),
        start: at,
        end: at + found[0].length,
      });
      at += found[0].length;
      continue;
    }
    // Flex takes the longest match: `2026-01-05` is a date, not `2026`.
    const date = matchAt(DATE, text, at);
    const number = matchAt(NUMBER, text, at);
    if (date !== null && date.length >= (number?.length ?? 0)) {
      tokens.push({
        kind: "date",
        text: date,
        start: at,
        end: at + date.length,
      });
      at += date.length;
      continue;
    }
    if (number !== null) {
      tokens.push({
        kind: "number",
        text: number,
        start: at,
        end: at + number.length,
      });
      at += number.length;
      continue;
    }
    const currency = matchAt(CURRENCY, text, at) ?? matchAt(CAPITAL, text, at);
    if (currency !== null) {
      // These are stock's keywords before they are currencies.
      if (["TRUE", "FALSE", "NULL"].includes(currency)) return stop();
      tokens.push({
        kind: "currency",
        text: currency,
        start: at,
        end: at + currency.length,
      });
      at += currency.length;
      continue;
    }
    // `#tag` is a tag, never a `#` between two cost numbers.
    if (text[at] === "#" && /[A-Za-z0-9_/.-]/u.test(text[at + 1] ?? "")) {
      return stop();
    }
    const op = OPS.find((candidate) => text.startsWith(candidate, at));
    if (op === undefined) return stop();
    tokens.push({ kind: "op", op, start: at, end: at + op.length });
    at += op.length;
  }
  return { tokens, whole: true, stop: at };
}

/** The tokens of `text` up to a comment, or `null` at one stock's lexer would refuse. */
function tokenize(text: string): Token[] | null {
  const { tokens, whole } = lex(text);
  return whole ? tokens : null;
}

/** A `Decimal` as Python holds it: a value and its exponent (`1.10` is 110e-2). */
interface Decimal {
  value: BigNumber;
  exponent: number;
}

/** An operation's result held to Python's 28 significant digits. */
function fitted(value: BigNumber, exponent: number): Decimal {
  if (value.isZero() || (value.e ?? 0) - exponent + 1 <= 28) {
    return { value, exponent };
  }
  const rounded = roundWithPythonDecimalContext(value);
  return { value: rounded, exponent: (rounded.e ?? 0) - 27 };
}

/** `a / b` as Python's `Decimal` gives it: exact at the ideal exponent when it can be. */
function divided(a: Decimal, b: Decimal): Decimal | null {
  if (b.value.isZero()) return null;
  const ideal = a.exponent - b.exponent;
  const quotient = divideWithPythonDecimalContext(a.value, b.value);
  if (quotient.isZero()) return { value: quotient, exponent: ideal };
  const lead = quotient.e ?? 0;
  if (!quotient.times(b.value).eq(a.value)) {
    return { value: quotient, exponent: lead - 27 };
  }
  // The exponents that hold the quotient exactly in 28 digits; the one
  // nearest the ideal wins.
  const largest = lead - quotient.sd() + 1;
  const smallest = lead - 27;
  return {
    value: quotient,
    exponent: Math.min(Math.max(ideal, smallest), largest),
  };
}

/** Python's `str(Decimal)`, as a `Decimal`'s repr holds it: `1E-7`, not `0.0000001`. */
function decimalText({ value, exponent }: Decimal): string {
  const sign = value.isNegative() ? "-" : "";
  const digits = value.abs().shiftedBy(-exponent).toFixed(0);
  const left = exponent + digits.length;
  const dot = exponent <= 0 && left > -6 ? left : 1;
  let whole: string;
  let fraction = "";
  if (dot <= 0) {
    whole = "0";
    fraction = `.${"0".repeat(-dot)}${digits}`;
  } else if (dot >= digits.length) {
    whole = digits + "0".repeat(dot - digits.length);
  } else {
    whole = digits.slice(0, dot);
    fraction = `.${digits.slice(dot)}`;
  }
  const shift = left - dot;
  const suffix =
    shift === 0 ? "" : `E${shift > 0 ? "+" : "-"}${Math.abs(shift)}`;
  return `${sign}${whole}${fraction}${suffix}`;
}

/** A recursive-descent reader over one run of tokens, with stock's precedence. */
class Reader {
  private at = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  get done(): boolean {
    return this.at >= this.tokens.length;
  }

  /** The index of the next token to read. */
  get position(): number {
    return this.at;
  }

  private peekOp(...ops: Op[]): Op | null {
    const token = this.tokens[this.at];
    return token?.kind === "op" && ops.includes(token.op) ? token.op : null;
  }

  /** A number expression if one starts here, `undefined` if none does, `null` if it is malformed. */
  numberExpression(): Decimal | null | undefined {
    const token = this.tokens[this.at];
    const starts =
      token?.kind === "number" || this.peekOp("(", "-", "+") !== null;
    return starts ? this.sum() : undefined;
  }

  private sum(): Decimal | null {
    let left = this.product();
    for (
      let op = this.peekOp("+", "-");
      left && op;
      op = this.peekOp("+", "-")
    ) {
      this.at += 1;
      const right = this.product();
      if (right === null) return null;
      const value =
        op === "+"
          ? left.value.plus(right.value)
          : left.value.minus(right.value);
      left = fitted(value, Math.min(left.exponent, right.exponent));
    }
    return left;
  }

  private product(): Decimal | null {
    let left = this.unary();
    for (
      let op = this.peekOp("*", "/");
      left && op;
      op = this.peekOp("*", "/")
    ) {
      this.at += 1;
      const right = this.unary();
      if (right === null) return null;
      left =
        op === "*"
          ? fitted(
              left.value.times(right.value),
              left.exponent + right.exponent,
            )
          : divided(left, right);
    }
    return left;
  }

  private unary(): Decimal | null {
    const sign = this.peekOp("-", "+");
    if (sign !== null) {
      this.at += 1;
      const operand = this.unary();
      if (operand === null) return null;
      // Python's `-Decimal("0")` and `+Decimal("-0")` are both `0`.
      if (operand.value.isZero()) {
        return { value: operand.value.abs(), exponent: operand.exponent };
      }
      return sign === "+"
        ? operand
        : { value: operand.value.negated(), exponent: operand.exponent };
    }
    if (this.peekOp("(") !== null) {
      this.at += 1;
      const inner = this.sum();
      if (inner === null || this.peekOp(")") === null) return null;
      this.at += 1;
      return inner;
    }
    const token = this.tokens[this.at];
    if (token?.kind !== "number") return null;
    this.at += 1;
    const plain = token.text.replace(/,/gu, "").replace(/\.$/u, "");
    const dot = plain.indexOf(".");
    return {
      value: new BigNumber(plain),
      exponent: dot < 0 ? 0 : dot - plain.length + 1,
    };
  }

  currency(): string | undefined {
    const token = this.tokens[this.at];
    if (token?.kind !== "currency") return undefined;
    this.at += 1;
    return token.text;
  }

  hash(): boolean {
    if (this.peekOp("#") === null) return false;
    this.at += 1;
    return true;
  }
}

/** Stock's `incomplete_amount`: an optional number, an optional currency, nothing else. */
function incompleteAmount(
  tokens: readonly Token[],
): { number?: Decimal; currency?: string } | null {
  const reader = new Reader(tokens);
  const number = reader.numberExpression();
  if (number === null) return null;
  const currency = reader.currency();
  return reader.done ? { number, currency } : null;
}

/** How stock's messages print a number or currency the text leaves out. */
const MISSING = "<class 'beancount.core.number.MISSING'>";

/** Stock's `str(Amount)`: the number in fixed point (`-20`, not `-2E+1`), or nothing, then the currency. */
function amountText(number: Decimal | undefined, currency: string | undefined) {
  const digits =
    number === undefined
      ? ""
      : number.value.toFixed(Math.max(0, -number.exponent));
  return `${digits} ${currency ?? MISSING}`;
}

/** One amount of a cost spec: its `CompoundAmount` repr, its currency, and whether it has a `#`. */
interface CompoundAmount {
  text: string;
  currency: string | undefined;
  hashed: boolean;
}

/** Stock's `CompoundAmount`, with the repr its messages print. */
function compoundAmount(tokens: readonly Token[]): CompoundAmount | null {
  const reader = new Reader(tokens);
  const per = reader.numberExpression();
  if (per === null) return null;
  const hashed = reader.hash();
  const total = hashed ? reader.numberExpression() : undefined;
  if (total === null) return null;
  const currency = reader.currency();
  if (!reader.done || (hashed && currency === undefined)) return null;
  const decimal = (number: Decimal | undefined) =>
    number === undefined ? MISSING : `Decimal('${decimalText(number)}')`;
  return {
    text: `CompoundAmount(number_per=${decimal(per)}, number_total=${hashed ? decimal(total) : "None"}, currency=${currency === undefined ? MISSING : `'${currency}'`})`,
    currency,
    hashed,
  };
}

/** A lexer date as Python's `date` prints it, or `null` when it is no calendar date. */
function isoDate(text: string): string | null {
  const [year, month, day] = text.split(/[-/]/u).map(Number) as [
    number,
    number,
    number,
  ];
  const date = utcDate(year, month - 1, day);
  if (
    year < 1 ||
    year > 9999 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

/**
 * What stock's `cost_spec` reads in a `{…}` (`total`: a `{{…}}`): the errors
 * it adds for the components, in their order, and the first amount, which is
 * the cost it keeps.
 */
function costSpec(
  tokens: readonly Token[],
  total: boolean,
): { errors: PostingSyntaxError[]; cost?: CompoundAmount } | null {
  if (tokens.length === 0) return { errors: [] };
  const components: Token[][] = [[]];
  for (const token of tokens) {
    if (token.kind === "op" && token.op === ",") components.push([]);
    else components.at(-1)!.push(token);
  }
  const errors: PostingSyntaxError[] = [];
  let cost: CompoundAmount | undefined;
  const seen = { date: false, label: false, merge: false };
  for (const component of components) {
    const [only, ...rest] = component;
    if (only === undefined) return null; // `{5 USD,}` is a syntax error
    if (rest.length === 0 && only.kind === "op" && only.op === "*") {
      errors.push(
        seen.merge
          ? { code: "COST_MERGE", message: "Duplicate merge-cost spec" }
          : {
              code: "COST_MERGE",
              message: "Cost merging is not supported yet",
            },
      );
      seen.merge = true;
    } else if (rest.length === 0 && only.kind === "date") {
      const date = isoDate(only.text);
      if (date === null) return null;
      if (seen.date) {
        errors.push({
          code: "DUPLICATE_COST_COMPONENT",
          message: `Duplicate date: '${date}'.`,
        });
      }
      seen.date = true;
    } else if (rest.length === 0 && only.kind === "string") {
      if (seen.label) {
        errors.push({
          code: "DUPLICATE_COST_COMPONENT",
          message: `Duplicate label: '${only.value}'.`,
        });
      }
      seen.label = true;
    } else {
      const amount = compoundAmount(component);
      if (amount === null) return null;
      if (cost !== undefined) {
        errors.push({
          code: "DUPLICATE_COST_COMPONENT",
          message: `Duplicate cost: '${amount.text}'.`,
        });
      }
      cost ??= amount;
    }
  }
  if (total && cost?.hashed === true) {
    errors.push({
      code: "TOTAL_COST_PER_UNIT",
      message: `Per-unit cost may not be specified using total cost syntax: '${cost.text}'; ignoring per-unit cost`,
    });
  }
  return { errors, cost };
}

/** An account as stock's lexer reads one: `{ACCOUNTTYPE}(:{ACCOUNTNAME})+`. */
export const STOCK_ACCOUNT =
  String.raw`(?:[A-Z]|[^\x00-\x7f])(?:[A-Za-z0-9-]|[^\x00-\x7f])*` +
  String.raw`(?::(?:[A-Z0-9]|[^\x00-\x7f])(?:[A-Za-z0-9-]|[^\x00-\x7f])*)+`;

/** A posting line: its indent, an optional flag, and the account. */
const POSTING = new RegExp(
  String.raw`^[ \t]+(?:[*!&#?%][ \t]*|[A-Z][ \t]+)?${STOCK_ACCOUNT}`,
  "u",
);

const isOp = (token: Token | undefined, ...ops: Op[]) =>
  token?.kind === "op" && ops.includes(token.op);

/**
 * The errors stock's parser reports for a posting line's cost spec and price,
 * at the posting's own line, or none when the line is not a posting stock
 * reads.
 */
export function postingSyntaxErrors(line: string): PostingSyntaxError[] {
  // Every error here needs a cost spec or a price; most postings have neither.
  if (!/[{@]/u.test(line)) return [];
  const account = POSTING.exec(line);
  if (account === null) return [];
  const tokens = tokenize(line.slice(account[0].length));
  if (tokens === null) return [];
  let at = tokens.findIndex((token) => isOp(token, "{", "{{", "@", "@@"));
  if (at < 0) at = tokens.length;
  const units = incompleteAmount(tokens.slice(0, at));
  if (units === null) return [];

  const errors: PostingSyntaxError[] = [];
  let cost: CompoundAmount | undefined;
  if (isOp(tokens[at], "{", "{{")) {
    const total = isOp(tokens[at], "{{");
    const end = tokens.findIndex(
      (token, index) => index > at && isOp(token, "{", "{{", "}", "}}"),
    );
    if (end < 0 || !isOp(tokens[end], total ? "}}" : "}")) return [];
    const found = costSpec(tokens.slice(at + 1, end), total);
    if (found === null) return [];
    errors.push(...found.errors);
    cost = found.cost;
    at = end + 1;
  }
  if (isOp(tokens[at], "@", "@@")) {
    const price = incompleteAmount(tokens.slice(at + 1));
    if (price === null) return [];
    const { number, currency } = price;
    // `-0` is not below zero, so stock accepts it.
    if (
      number !== undefined &&
      number.value.isNegative() &&
      !number.value.isZero()
    ) {
      errors.push({
        code: "NEGATIVE_PRICE",
        message: `Negative prices are not allowed: ${amountText(number, currency)} (see http://furius.ca/beancount/doc/bug-negative-prices for workaround)`,
      });
    }
    if (isOp(tokens[at], "@@") && units.number === undefined) {
      // Stock prints the price with its sign dropped, then drops the price,
      // so it compares no currency with the cost.
      const unsigned = number && { ...number, value: number.value.abs() };
      errors.push({
        code: "TOTAL_PRICE_WITHOUT_UNITS",
        message: `Total price on a posting without units: ${amountText(unsigned, currency)}.`,
      });
    } else if (
      cost?.currency !== undefined &&
      currency !== undefined &&
      cost.currency !== currency
    ) {
      errors.push({
        code: "COST_PRICE_CURRENCY",
        message: `Cost and price currencies must match: ${cost.currency} != ${currency}`,
      });
    }
  } else if (at < tokens.length) {
    return [];
  }
  return errors;
}

/** Where stock's parser stands after a currency, and the tokens it lists as expected there. */
const AFTER_UNITS = "end of file or EOL or ATAT or AT";
const AFTER_COST = "RCURL or COMMA";
const AFTER_TOTAL_COST = "RCURLCURL or COMMA";
const AFTER_PRICE = "end of file or EOL";

/**
 * What stock's grammar expects after `read`, a posting's tokens that end in a
 * currency: after its units, in a `{…}` or `{{…}}` cost, or after its price.
 * `undefined` when `read` does not read as the start of a posting, since
 * stock's syntax error is then an earlier one.
 */
function expectedAfterCurrency(read: readonly Token[]): string | undefined {
  let at = read.findIndex((token) => isOp(token, "{", "{{", "@", "@@"));
  if (at < 0) return incompleteAmount(read) === null ? undefined : AFTER_UNITS;
  if (incompleteAmount(read.slice(0, at)) === null) return undefined;
  if (isOp(read[at], "{", "{{")) {
    const total = isOp(read[at], "{{");
    const end = read.findIndex(
      (token, index) => index > at && isOp(token, "{", "{{", "}", "}}"),
    );
    if (end < 0) {
      // The currency is in the cost spec: each component before it must read.
      const inner = read.slice(at + 1);
      let comma = inner.length - 1;
      while (comma >= 0 && !isOp(inner[comma], ",")) comma -= 1;
      if (comma >= 0 && costSpec(inner.slice(0, comma), total) === null) {
        return undefined;
      }
      if (compoundAmount(inner.slice(comma + 1)) === null) return undefined;
      return total ? AFTER_TOTAL_COST : AFTER_COST;
    }
    if (!isOp(read[end], total ? "}}" : "}")) return undefined;
    if (costSpec(read.slice(at + 1, end), total) === null) return undefined;
    at = end + 1;
  }
  if (!isOp(read[at], "@", "@@")) return undefined;
  return incompleteAmount(read.slice(at + 1)) === null
    ? undefined
    : AFTER_PRICE;
}

/** The `-'._` run the engine reads as the rest of a currency (`QAB-`, `QAB-.`). */
const CURRENCY_TAIL = /^[-'._]*/u;

/**
 * A posting line's currency that runs into a `-` (`1 QAB-`, `{1 QAB-}`,
 * `@ 1 QAB-`, w31/154): stock's lexer ends the currency at its last capital or
 * digit, and its grammar takes no `-` there, so the posting is the syntax
 * error `unexpected MINUS` at the `-`. The engine reads one currency named
 * `QAB-` and loads it clean. Returns the `-`'s column (from 0), the currency
 * as the engine reads it, and the tokens stock expected; `undefined` when no
 * currency runs into a `-`, or when the line before it does not read as a
 * posting (stock's error is then an earlier one).
 */
export function postingCurrencyMinus(
  line: string,
): { column: number; written: string; expecting: string } | undefined {
  const account = POSTING.exec(line);
  if (account === null) return undefined;
  const offset = account[0].length;
  const text = line.slice(offset);
  const { tokens } = lex(text);
  const at = tokens.findIndex(
    (token, index) =>
      token.kind === "currency" &&
      isOp(tokens[index + 1], "-") &&
      tokens[index + 1]!.start === token.end,
  );
  if (at < 0) return undefined;
  const currency = tokens[at]!;
  const expecting = expectedAfterCurrency(tokens.slice(0, at + 1));
  if (expecting === undefined) return undefined;
  const tail = CURRENCY_TAIL.exec(text.slice(currency.end))![0];
  return {
    column: offset + currency.end,
    written: text.slice(currency.start, currency.end + tail.length),
    expecting,
  };
}

/** Stock's keywords, as its lexer reads them when no key goes on (`balances` is `balance` and an invalid `s`). */
const STOCK_KEYWORD =
  /txn|balance|open|close|commodity|pad|event|query|custom|price|note|document|pushtag|poptag|pushmeta|popmeta|option|plugin|include/y;
const STOCK_KEY = /[a-z][A-Za-z0-9_-]+(?=:)/y;
const STOCK_ACCOUNT_TOKEN = new RegExp(STOCK_ACCOUNT, "uy");
const STOCK_CURRENCY_TOKEN = /[A-Z][A-Z0-9'._-]*[A-Z0-9]/y;
const FUTURES_CURRENCY = /\/[A-Z0-9'._-]*[A-Z](?:[A-Z0-9'._-]*[A-Z0-9])?/y;
const STOCK_BOOL = /TRUE|FALSE|NULL/y;
const STOCK_TAG = /[#^][A-Za-z0-9_/.-]+/y;
/** A number as stock's lexer takes one, then refuses unless its commas group thousands (`1,000`, not `1,00`). */
const STOCK_NUMBER = /(?:\d[\d,]+\d|\d+)(?:\.\d*)?/y;
const GROUPED_NUMBER = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?$/u;
const PUNCTUATION: ReadonlyArray<readonly [string, string]> = [
  ["@@", "ATAT"],
  ["@", "AT"],
  ["{{", "LCURLCURL"],
  ["}}", "RCURLCURL"],
  ["{", "LCURL"],
  ["}", "RCURL"],
  [",", "COMMA"],
  ["~", "TILDE"],
  ["+", "PLUS"],
  ["-", "MINUS"],
  ["/", "SLASH"],
  ["(", "LPAREN"],
  [")", "RPAREN"],
  ["*", "ASTERISK"],
  [":", "COLON"],
  ["|", "PIPE"],
  ["#", "HASH"],
  ["!", "FLAG"],
  ["&", "FLAG"],
  ["?", "FLAG"],
  ["%", "FLAG"],
];

/**
 * The token stock's lexer reads at `at` in `line`, by the name its grammar's
 * syntax errors give it (`CURRENCY`, `STRING`, `MINUS`), and where it ends.
 * Flex takes the longest match, and the earlier rule on a tie: `TRUE` is a
 * `BOOL`, `TRUE1` a `CURRENCY`, `USD:X` an `ACCOUNT`, `ab:` a `KEY`. A lone
 * capital is a `CAPITAL` only before whitespace or a line break that does not
 * end the file (`endsFile`). `undefined` where the lexer reads an invalid token
 * (`X}`, `.5`, `1,00`), or a string that does not close on the line, whose
 * error stock places on the line it closes on.
 */
export function stockTokenAt(
  line: string,
  at: number,
  endsFile: boolean,
): { name: string; end: number } | undefined {
  const char = line[at];
  if (char === undefined) return undefined;
  const sticky = (pattern: RegExp) => matchAt(pattern, line, at);
  const token = (name: string, length: number) => ({ name, end: at + length });
  if (char === '"') {
    const string = sticky(STRING);
    return string === null ? undefined : token("STRING", string.length);
  }
  if (/\d/u.test(char)) {
    const date = sticky(DATE);
    if (date !== null) return token("DATE", date.length);
    const number = sticky(STOCK_NUMBER)!;
    return GROUPED_NUMBER.test(number)
      ? token("NUMBER", number.length)
      : undefined;
  }
  if (/[A-Z]|\P{ASCII}/u.test(char)) {
    const account = sticky(STOCK_ACCOUNT_TOKEN)?.length ?? 0;
    const currency = sticky(STOCK_CURRENCY_TOKEN)?.length ?? 0;
    const keyword = sticky(STOCK_BOOL);
    if (keyword !== null && keyword.length >= Math.max(account, currency)) {
      return token(keyword === "NULL" ? "NONE" : "BOOL", keyword.length);
    }
    if (currency > 0 && currency >= account) {
      return token("CURRENCY", currency);
    }
    if (account > 0) return token("ACCOUNT", account);
    const next = line[at + 1];
    const capital =
      /[A-Z]/u.test(char) &&
      (next === " " || next === "\t" || (next === undefined && !endsFile));
    return capital ? token("CAPITAL", 1) : undefined;
  }
  if (char === "/") {
    const futures = sticky(FUTURES_CURRENCY);
    if (futures !== null) return token("CURRENCY", futures.length);
  }
  if (char === "#" || char === "^") {
    const tag = sticky(STOCK_TAG);
    if (tag !== null) return token(char === "#" ? "TAG" : "LINK", tag.length);
  }
  if (/[a-z]/u.test(char)) {
    const key = sticky(STOCK_KEY);
    if (key !== null) return token("KEY", key.length);
    const keyword = sticky(STOCK_KEYWORD);
    return keyword === null
      ? undefined
      : token(keyword.toUpperCase(), keyword.length);
  }
  const punctuation = PUNCTUATION.find(([text]) => line.startsWith(text, at));
  return punctuation && token(punctuation[1], punctuation[0].length);
}

/**
 * A keyword where a posting's currency goes, with any `-'._` run the engine
 * reads as the rest of a currency (`TRUE-`, `NULL.`): not a longer currency
 * (`TRUE-1`) or an account (`TRUE-:Cash`).
 */
const KEYWORD_CURRENCY =
  /(TRUE|FALSE|NULL)(?![A-Z0-9'._-]*[A-Z0-9])[-'._]*(?![A-Za-z:]|\P{ASCII})/uy;

/**
 * A posting's units, cost or price whose currency is a keyword the engine
 * reads as part of a currency (`1 TRUE-`, `{1 FALSE-}`, `@ 1 NULL-`, w31/157):
 * stock's lexer reads `TRUE` as a bool before it reads a currency, so the
 * posting is the syntax error `unexpected BOOL` (`NONE` for `NULL`) at the
 * keyword, with the tokens stock expected; the engine books a currency named
 * `TRUE-`, and drops a bare `TRUE`, so `1 TRUE` takes the other postings'
 * currency. Returns the keyword's column (from 0), the token stock names, the
 * currency as the engine reads it and the expected tokens; `undefined` when no
 * number expression ends right before the keyword or the line before it is no
 * posting stock reads.
 */
export function postingKeywordCurrency(line: string):
  | {
      column: number;
      unexpected: string;
      written: string;
      expecting: string;
    }
  | undefined {
  const account = POSTING.exec(line);
  if (account === null) return undefined;
  const offset = account[0].length;
  const text = line.slice(offset);
  const { tokens, whole, stop } = lex(text);
  const last = tokens.at(-1);
  if (whole || !(last?.kind === "number" || isOp(last, ")"))) return undefined;
  KEYWORD_CURRENCY.lastIndex = stop;
  const found = KEYWORD_CURRENCY.exec(text);
  if (found === null) return undefined;
  const keyword = found[1]!;
  const expecting = expectedAfterCurrency([
    ...tokens,
    {
      kind: "currency",
      text: keyword,
      start: stop,
      end: stop + keyword.length,
    },
  ]);
  if (expecting === undefined) return undefined;
  return {
    column: offset + stop,
    unexpected: keyword === "NULL" ? "NONE" : "BOOL",
    written: found[0],
    expecting,
  };
}

/** The names stock's grammar gives the cost's braces. */
const BRACE_NAMES: Readonly<Record<string, string>> = {
  "{": "LCURL",
  "{{": "LCURLCURL",
  "}": "RCURL",
  "}}": "RCURLCURL",
};

/**
 * What the engine refuses itself after a posting's amount, cost or price, or
 * reads as more of it: a number, a currency, a capital, a `{` or a `(`.
 */
const ENGINE_REFUSES_AFTER_POSTING: ReadonlySet<string> = new Set([
  "NUMBER",
  "CURRENCY",
  "CAPITAL",
  "LCURL",
  "LCURLCURL",
  "LPAREN",
]);

/** A posting's syntax error after its amount: see {@link postingStrayToken}. */
interface PostingStray {
  column: number;
  unexpected: string;
  expecting: string;
  /** The engine refuses it itself, so it is not reported; it still ends what stock reads. */
  engineRefuses: boolean;
  /** It stands where the posting's amount goes, which it has none of. */
  noAmount?: boolean;
}

/**
 * A token after a posting's units, cost or price, where stock's grammar takes
 * only the end of the line (`1 QAB -`, `1 QAB {1 USD} ,`, `@ 1 USD ~`,
 * w31/157): the posting is the syntax error `unexpected <TOKEN>` there, with
 * the tokens stock expected; a posting with no amount takes one after its
 * account the same way. The engine skips the token and loads the posting
 * clean. Returns the token's column (from 0), its name, the expected tokens
 * and whether the engine refuses the token itself (a number, a currency, a
 * `{` or `(`, a sign before a number, an account with a colon after it, a
 * cost the line never closes, an invalid token); `undefined` when nothing
 * follows, or when the line does not read as a posting up to a currency or a
 * cost's close. A `-` written against the currency is
 * {@link postingCurrencyMinus}'s.
 */
export function postingStrayToken(line: string): PostingStray | undefined {
  const account = POSTING.exec(line);
  if (account === null) return undefined;
  const offset = account[0].length;
  const text = line.slice(offset);
  const { tokens, whole, stop } = lex(text);
  // Stock drops the posting at an invalid token too, which the engine may
  // read: where the tokens stop short at one, the posting reads no further.
  const invalid =
    !whole &&
    text[stop] !== '"' &&
    stockTokenAt(text, stop, false) === undefined
      ? {
          column: offset + stop,
          unexpected: "",
          expecting: "",
          engineRefuses: true,
        }
      : undefined;
  const stray = strayAfterAmount(text, tokens, whole ? null : stop);
  return stray === undefined
    ? invalid
    : { ...stray, column: offset + stray.column };
}

/** A posting's token after its amount, cost or price: see {@link postingStrayToken}; columns from `text`'s start. */
function strayAfterAmount(
  text: string,
  tokens: readonly Token[],
  stop: number | null,
): PostingStray | undefined {
  // An operator that ends the line leaves stock's expression wanting: its
  // error is at the line's end, and the posting reads no further.
  const dangling = (): PostingStray | undefined =>
    stop === null && isOp(tokens.at(-1), "+", "-", "*", "/", "(")
      ? {
          column: tokens.at(-1)!.start,
          unexpected: "EOL",
          expecting: "PLUS or MINUS or LPAREN or NUMBER",
          engineRefuses: true,
        }
      : undefined;
  const units = new Reader(tokens);
  const number = units.numberExpression();
  if (number === null) return dangling();
  // A number alone is followed by an operator or a currency that goes on with it.
  if (units.currency() === undefined && number !== undefined) return undefined;
  let next = units.position;
  let expecting = AFTER_UNITS;
  if (isOp(tokens[next], "{", "{{")) {
    const open = next;
    const total = isOp(tokens[open], "{{");
    const end = tokens.findIndex(
      (token, index) => index > open && isOp(token, "{", "{{", "}", "}}"),
    );
    const inCost = total ? AFTER_TOTAL_COST : AFTER_COST;
    // A cost the line never closes is stock's error at the line's end, and
    // the engine's own.
    if (end < 0) {
      return stop === null
        ? {
            column: tokens[open]!.start,
            unexpected: "EOL",
            expecting: inCost,
            engineRefuses: true,
          }
        : undefined;
    }
    const inner = tokens.slice(open + 1, end);
    if (costSpec(inner, total) === null) return undefined;
    if (!isOp(tokens[end], total ? "}}" : "}")) {
      // The other close, or another `{`, after the cost's components.
      if (inner.length === 0) return undefined;
      const wrong = tokens[end]!;
      return {
        column: wrong.start,
        unexpected: BRACE_NAMES[text.slice(wrong.start, wrong.end)]!,
        expecting: inCost,
        engineRefuses: false,
      };
    }
    next = end + 1;
  }
  if (isOp(tokens[next], "@", "@@")) {
    const price = new Reader(tokens.slice(next + 1));
    const priced = price.numberExpression();
    if (priced === null) return dangling();
    if (price.currency() === undefined) return undefined;
    next += 1 + price.position;
    expecting = AFTER_PRICE;
  }
  const at = next < tokens.length ? tokens[next]!.start : stop;
  if (at === null) return undefined;
  const before = tokens[next - 1];
  if (before?.kind === "currency") {
    // Stock's lexer reads the currency the same way, not into a longer token.
    if (stockTokenAt(text, before.start, false)?.end !== before.end) {
      return undefined;
    }
    if (text[at] === "-" && before.end === at) return undefined;
  }
  const token = stockTokenAt(text, at, false);
  if (token === undefined) return undefined;
  const signed = token.name === "MINUS" || token.name === "PLUS";
  const engineRefuses =
    ENGINE_REFUSES_AFTER_POSTING.has(token.name) ||
    (token.name === "ACCOUNT" && text[token.end] === ":") ||
    // A colon written against the account that more follows (`:lower`,
    // `:.5`); one that ends it is the colon scan's.
    (token.name === "COLON" && at === 0 && !/^:+[ \t\r]*$/u.test(text)) ||
    (signed && /^[ \t]*[\d(.]/u.test(text.slice(token.end)));
  return {
    column: at,
    unexpected: token.name,
    expecting,
    engineRefuses,
    noAmount: next === 0,
  };
}
