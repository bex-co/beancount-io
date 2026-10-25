import { BadUserInputError } from "@/shared/errors";

/**
 * The engine's Decimal holds 28 significant digits: a literal past that is an
 * error, or a changed value read back rounded. The structured-entry builder
 * refuses such literals (`backend-cluster/ledger` `entry-build.ts`, w21/997);
 * packages share no code, so this is the same rule restated for Beancount
 * text, applied to the new text every raw write commits (w23/081).
 */
const MAX_DECIMAL_DIGITS = 28;

/**
 * An amount in text: a decimal number and the currency beside it, as the
 * lexer reads them — an optional sign, comma-grouped digits with an optional
 * fraction, then whitespace and the commodity. The lookbehind keeps digit
 * runs glued to an account name (`Assets:Vault123…`), a date (`2021-01-04
 * price`, where the day would otherwise pair with the keyword) or a fraction
 * from reading as a number.
 */
const AMOUNT_IN_TEXT =
  /(?<![\w.-])[+-]?[0-9][0-9,]*(?:\.[0-9]*)?\s+[A-Za-z][A-Za-z0-9'._-]*/g;

/** A quoted span — narrations, payees, notes, meta values — holds no amounts. */
const QUOTED_SPAN = /"[^"\n]*"/g;

/** How much of an offending literal the refusal names before trimming. */
const LITERAL_PREVIEW = 64;

/**
 * Whether a text literal fits the engine's 28 digits, as written: leading
 * zeros carry no value, commas group, and every fraction digit counts — the
 * same count `fitsEngineDecimal` in the ledger service applies (w21/997).
 */
function textLiteralFitsEngine(literal: string): boolean {
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
 * The amount literals a text would commit, quoted spans and comments aside.
 * Narrations, meta values and anything after `;` merely contain digit
 * strings; only a number beside a currency is an amount the engine reads.
 */
export function textAmountLiterals(text: string): string[] {
  const literals: string[] = [];
  for (const line of text.split("\n")) {
    const code = line.replace(QUOTED_SPAN, "").split(";")[0] ?? "";
    AMOUNT_IN_TEXT.lastIndex = 0;
    for (const match of code.matchAll(AMOUNT_IN_TEXT)) {
      literals.push(match[0].split(/\s+/)[0]!);
    }
  }
  return literals;
}

/**
 * Refuse new Beancount text holding an amount past the engine's 28
 * significant digits, naming the literal and the limit. Binary callers
 * (a NUL byte) skip the scan: only text reaches the engine as amounts.
 */
export function assertAmountsFitEngineDecimal(text: string): void {
  if (text.includes("\0")) return;
  for (const literal of textAmountLiterals(text)) {
    if (!textLiteralFitsEngine(literal)) {
      const shown =
        literal.length > LITERAL_PREVIEW
          ? `${literal.slice(0, LITERAL_PREVIEW)}…`
          : literal;
      throw new BadUserInputError(
        `amount ${shown} has more than ${MAX_DECIMAL_DIGITS} significant digits; the engine would read it back rounded`,
        undefined,
        `Shorten the amount to ${MAX_DECIMAL_DIGITS} significant digits or fewer.`,
      );
    }
  }
}
