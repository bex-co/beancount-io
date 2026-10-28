import type { QueryResult } from "@rustledger/wasm";

/**
 * Out-of-range integer literals and constant integer overflow (w23/133),
 * plus decimal literals past the engine's precision (w23/160).
 *
 * rustledger 0.24.0 computes in Decimal (max
 * 79228162514264337593543950335) with two silent edges: literals past
 * the max misreport as `syntax error at position 0` (or `found '='`
 * in predicates), and constant arithmetic overflowing the max — even
 * transiently (`MAX + 5 - 5`, verified live: checked arithmetic
 * short-circuits) — yields NULL with no error, while stock beanquery
 * computes every cell exactly. Both refuse here before the query runs,
 * with the range instead of a position-0 riddle.
 *
 * Four rules, all syntactic and abstaining on doubt:
 *
 * - A `LIMIT <n>` numeral at or past 2^32 refuses. The engine parses
 *   LIMIT as i64 (past i64::MAX the numeral token-rejects) and
 *   silently keeps only the low 32 bits below that — LIMIT 2^32
 *   answers zero rows — while stock answers all rows for every
 *   LIMIT. The int-literals pipeline stage caps these before the
 *   engine, so this fires only for unpipelined callers.
 * - A bare integer or decimal literal whose magnitude exceeds
 *   Decimal::MAX refuses.
 * - A decimal literal the engine cannot hold exactly refuses
 *   (w23/160): the mantissa (point removed, leading zeros stripped,
 *   then trailing zeros stripped — the engine normalizes scale
 *   before the boundary bites, verified live) exceeding Decimal::MAX
 *   silently half-up rounds, as does a nonzero fraction past 28
 *   places (rust_decimal's max scale zeroes it). Stock renders every
 *   such literal exactly. The rule is mantissa-vs-MAX, not digit
 *   count: a 29-digit mantissa below MAX stays exact.
 * - A `+`/`-`/`*` run over pure integer literals that BigInt-evaluates
 *   past ±Decimal::MAX at any intermediate refuses, in standard
 *   precedence. Runs with `/`, `%`, dots, identifiers, or invalid
 *   operator shapes abstain (division semantics and decimal overflow
 *   are unprobed); bare `YYYY-MM-DD` dates scan as runs but always
 *   evaluate in range, so they can never fire.
 *
 * Dot-led/dot-trailing decimals (`.5`, `5.`) abstain: the engine
 * syntax-errors those loudly already (its message is w23/162's).
 * Non-constant overflow (columns, aggregates) stays silent-NULL with
 * no engine signal to catch — that half is upstream-only and tracked
 * separately. Remove once the engine reports range and overflow; the
 * live check in `scripts/verify-rustledger.ts` shows when.
 */
const DECIMAL_MAX = "79228162514264337593543950335";
const U32 = "4294967296";
/** rust_decimal holds at most 28 places past the point. */
const MAX_SCALE = 28;
const LIMIT_NUMERAL = /\blimit\s+(\d+)(?![\w.])/gi;
const INT_LITERAL = /(?<![\w.$])\d+(?![\w.$])/g;
const DECIMAL_LITERAL = /(?<![\w.$])\d+\.\d+(?![\w.$])/g;

export function integerOverflowError(query: string): QueryResult | undefined {
  // String literals and block comments may print huge numbers as text.
  const unquoted = query
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
  for (const m of unquoted.matchAll(LIMIT_NUMERAL)) {
    const digits = m[1] as string;
    if (magnitudeAtLeast(digits, U32)) {
      return limitError(digits);
    }
  }
  for (const m of unquoted.matchAll(INT_LITERAL)) {
    const digits = m[0];
    if (magnitudeExceedsMax(digits)) {
      return rangeError(`integer literal ${digits} exceeds the maximum`);
    }
  }
  for (const m of unquoted.matchAll(DECIMAL_LITERAL)) {
    const [intPart, fracPart] = (m[0] as string).split(".") as [string, string];
    if (
      magnitudeExceedsMax(intPart) ||
      (stripZeros(intPart) === DECIMAL_MAX && /[1-9]/.test(fracPart))
    ) {
      return rangeError(`decimal literal ${m[0]} exceeds the maximum`);
    }
    // w23/160: in-range but unholdable — the mantissa rounds or the
    // fraction runs past the 28-place scale, both silently.
    if (
      magnitudeExceedsMax(stripTrailingZeros(stripZeros(intPart + fracPart))) ||
      stripTrailingZeros(fracPart).length > MAX_SCALE
    ) {
      return precisionError(m[0] as string);
    }
  }
  // Redundant parens group operands without changing them; calls and
  // subqueries keep theirs.
  let stripped = unquoted;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = stripped.replace(
      /(?<![A-Za-z_\w])\(([^()]*)\)/g,
      (group, inner: string) =>
        /\bselect\b/i.test(inner) ? group : ` ${inner} `,
    );
    if (next === stripped) break;
    stripped = next;
  }
  // Decimals blank first: without this the splitter below would tear
  // `0.5 * <huge>` into a `5 * <huge>` fragment and refuse a query
  // whose true product fits.
  const derun = stripped.replace(/\d+\.\d+|\.\d+|\d+\./g, " ");
  for (const run of derun.split(/[^0-9\s+\-*]+/)) {
    if (!/\d/.test(run) || !/[-+*]/.test(run)) continue;
    const overflows = runOverflows(run);
    if (overflows) {
      return rangeError(`integer arithmetic ${run.trim()} overflows the maximum`);
    }
  }
  return undefined;
}

function rangeError(detail: string): QueryResult {
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message: `Integer ${detail} 79228162514264337593543950335: this query engine would misreport it or silently answer NULL. Reduce the magnitude or split the computation.`,
        code: null,
        phase: "query",
        hint: "Reduce the literal or split the arithmetic so every intermediate fits Decimal::MAX.",
        file: null,
        line: null,
        column: null,
        end_line: null,
        end_column: null,
        severity: "error",
      },
    ],
  };
}

function precisionError(literal: string): QueryResult {
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message: `Decimal literal ${literal} is past this query engine's decimal precision: it would silently round to fit, while stock renders it exactly. Use fewer significant digits or split the computation.`,
        code: null,
        phase: "query",
        hint: "Rewrite the literal with fewer significant digits so the engine holds it exactly.",
        file: null,
        line: null,
        column: null,
        end_line: null,
        end_column: null,
        severity: "error",
      },
    ],
  };
}

function limitError(digits: string): QueryResult {
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message: `LIMIT ${digits} is past this query engine's 32-bit page: it silently keeps only the low 32 bits through 9223372036854775807, then rejects larger numerals as a syntax error, while stock answers all rows for every LIMIT. Reduce the LIMIT below 4294967296 or drop it.`,
        code: null,
        phase: "query",
        hint: "Use a LIMIT below 4294967296 — the query path caps larger LIMITs automatically.",
        file: null,
        line: null,
        column: null,
        end_line: null,
        end_column: null,
        severity: "error",
      },
    ],
  };
}

/** Whether a digit string's magnitude is at least the bound's. */
function magnitudeAtLeast(digits: string, bound: string): boolean {
  const norm = stripZeros(digits);
  if (norm.length !== bound.length) return norm.length > bound.length;
  return norm >= bound;
}

/** Whether a digit string's magnitude exceeds Decimal::MAX. */
function magnitudeExceedsMax(digits: string): boolean {
  const norm = stripZeros(digits);
  if (norm.length !== DECIMAL_MAX.length) return norm.length > DECIMAL_MAX.length;
  return norm > DECIMAL_MAX;
}

function stripZeros(digits: string): string {
  return digits.replace(/^0+(?=\d)/, "");
}

/** Drop insignificant trailing zeros (`503350` → `50335`). */
function stripTrailingZeros(digits: string): string {
  return digits.replace(/0+$/, "");
}

/**
 * Whether a `+`/`-`/`*` run over integer literals exceeds ±Decimal::MAX
 * at any intermediate in standard precedence (the engine's checked
 * arithmetic short-circuits on the first overflow — verified live).
 * Division-ready shapes and malformed runs abstain.
 */
function runOverflows(run: string): boolean {
  const tokens: Array<bigint | string> = [];
  const re = /\d+|[+*-]/g;
  let m: RegExpExecArray | null;
  let expectOperand = true;
  let sign = BigInt(1);
  while ((m = re.exec(run)) !== null) {
    const token = m[0];
    if (/^\d+$/.test(token)) {
      if (!expectOperand) return false;
      tokens.push(sign * BigInt(token));
      sign = BigInt(1);
      expectOperand = false;
    } else if (expectOperand) {
      if (token === "*") return false;
      if (token === "-") sign = -sign;
    } else {
      tokens.push(token);
      expectOperand = true;
    }
  }
  if (expectOperand || tokens.length === 0) return false;
  const values = tokens.filter((t): t is bigint => typeof t === "bigint");
  const ops = tokens.filter((t): t is string => typeof t === "string");
  const reduced: bigint[] = [values[0] as bigint];
  const reducedOps: string[] = [];
  for (let index = 0; index < ops.length; index += 1) {
    const rhs = values[index + 1] as bigint;
    if (ops[index] === "*") {
      reduced[reduced.length - 1] = (reduced[reduced.length - 1] as bigint) * rhs;
      if (absExceedsMax(reduced[reduced.length - 1] as bigint)) return true;
    } else {
      reducedOps.push(ops[index] as string);
      reduced.push(rhs);
    }
  }
  let acc = reduced[0] as bigint;
  for (let index = 1; index < reduced.length; index += 1) {
    acc =
      reducedOps[index - 1] === "+"
        ? acc + (reduced[index] as bigint)
        : acc - (reduced[index] as bigint);
    if (absExceedsMax(acc)) return true;
  }
  return false;
}

/** Whether |value| exceeds Decimal::MAX. */
function absExceedsMax(value: bigint): boolean {
  const abs = value < BigInt(0) ? -value : value;
  const digits = abs.toString();
  if (digits.length !== DECIMAL_MAX.length) {
    return digits.length > DECIMAL_MAX.length;
  }
  return digits > DECIMAL_MAX;
}
