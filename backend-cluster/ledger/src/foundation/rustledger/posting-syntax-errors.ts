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

type Token =
  | { kind: "number"; text: string }
  | { kind: "date"; text: string }
  | { kind: "string"; value: string }
  | { kind: "currency"; text: string }
  | { kind: "op"; op: Op };

const WHITESPACE = /[ \t\r]+/y;
const STRING = /"((?:[^\\"]|\\.)*)"/y;
const DATE = /\d{4,}[-/]\d+[-/]\d+/y;
const NUMBER = /(?:\d[\d,]*\d|\d)(?:\.\d*)?/y;
const CURRENCY =
  /(?:[A-Z][A-Z0-9'._-]*[A-Z0-9]|\/[A-Z0-9'._-]*[A-Z](?:[A-Z0-9'._-]*[A-Z0-9])?)/y;
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

/** The tokens of `text` up to a comment, or `null` at one stock's lexer would refuse. */
function tokenize(text: string): Token[] | null {
  const tokens: Token[] = [];
  let at = 0;
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
      if (found === null) return null; // the string goes on past this line
      tokens.push({
        kind: "string",
        value: found[1]!.replace(/\\(.)/gu, (_, char: string) =>
          Object.hasOwn(ESCAPES, char) ? ESCAPES[char]! : char,
        ),
      });
      at += found[0].length;
      continue;
    }
    // Flex takes the longest match: `2026-01-05` is a date, not `2026`.
    const date = matchAt(DATE, text, at);
    const number = matchAt(NUMBER, text, at);
    if (date !== null && date.length >= (number?.length ?? 0)) {
      tokens.push({ kind: "date", text: date });
      at += date.length;
      continue;
    }
    if (number !== null) {
      tokens.push({ kind: "number", text: number });
      at += number.length;
      continue;
    }
    const currency = matchAt(CURRENCY, text, at) ?? matchAt(CAPITAL, text, at);
    if (currency !== null) {
      // These are stock's keywords before they are currencies.
      if (["TRUE", "FALSE", "NULL"].includes(currency)) return null;
      tokens.push({ kind: "currency", text: currency });
      at += currency.length;
      continue;
    }
    // `#tag` is a tag, never a `#` between two cost numbers.
    if (text[at] === "#" && /[A-Za-z0-9_/.-]/u.test(text[at + 1] ?? "")) {
      return null;
    }
    const op = OPS.find((candidate) => text.startsWith(candidate, at));
    if (op === undefined) return null;
    tokens.push({ kind: "op", op });
    at += op.length;
  }
  return tokens;
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
