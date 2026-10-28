/**
 * Routes integer literals around the engine's magnitude gaps (w23/133).
 *
 * rustledger 0.24.0 mishandles numerals at three magnitudes: literals in
 * (2^53-1, i64::MAX] fail result serialization (`can't be represented as
 * a JavaScript number`) even though literals past i64::MAX string-render
 * fine through the decimal path; LIMIT at or past 2^32 silently keeps
 * only the low 32 bits; literals past Decimal::MAX misreport as syntax
 * errors (refused loudly by the integer-overflow guard instead). Two
 * rewrites, both magnitude-compared as digit strings (BQL integers are
 * plain `[0-9]+` — no underscores, no exponents):
 *
 * - A bare integer literal in the dead zone [2^53, i64::MAX] becomes
 *   `decimal('<digits>')`, joining the working decimal render path as a
 *   string. The sign stays in place (`5 - 9007…` keeps its binary
 *   minus), verified against the live engine for both signs. Smaller
 *   literals already render exactly and larger ones already stringify,
 *   so only this band moves. Quoted digits are strings, dotted digits
 *   are decimals, identifier-adjacent digits (`q1`, `1e5`) are names or
 *   exponents, and anything else is left for the engine.
 * - An `int()` call over a dead-zone argument — a digit string with an
 *   optional sign, or a bare numeral — becomes `decimal('<signed>')`,
 *   because `int()` parses i64 then fails the same render the literal
 *   rule rescues. A `+` sign is dropped (identity; the engine has no
 *   unary plus), a `-` rides inside the string, and a sign outside the
 *   call stays in place. Past-i64 `int()` arguments already fail loud
 *   at parse with an accurate message, so only this band moves.
 * - An unsigned `LIMIT <n>` with n >= 2^32 becomes `LIMIT 2147483647`
 *   (i32::MAX: lexable, untruncated, past any real row count), at any
 *   magnitude — stock answers all rows for every LIMIT, so capping
 *   restores parity where truncating or token-rejecting silently
 *   shortens the page. OFFSET does not exist in BQL, so there is no
 *   offset to preserve; signed and fractional LIMITs stay untouched
 *   for the engine to report.
 *
 * Bare ordinals inside GROUP BY / ORDER BY key lists are exempt: a huge
 * ordinal is an out-of-range error on both sides today, and rewriting
 * it into a constant expression would turn that loud error into a
 * silent one-group answer. Expression keys rewrite normally.
 *
 * Runs after the terminator (dead literals never hide behind a `;`) and
 * before the fold (whose generated queries carry no numerals). Like the
 * fold this one shifts offsets past the rewrite. String literals use
 * the family's no-escape rule; an unterminated literal returns the
 * query unchanged.
 */
const DEAD_ZONE_LO = "9007199254740992";
const DEAD_ZONE_HI = "9223372036854775807";
const U32 = "4294967296";
const LIMIT_CAP = "2147483647";

const LIMIT_WORD = /\blimit\b/iy;
const LIMIT_GAP = /\s*/y;
const DIGITS_AT = /\d+/y;
const INT_WORD = /\bint\b/iy;
const INT_GAP = /\s*/y;
const GROUP_BY = /\bgroup\s+by\b/gi;
const ORDER_BY = /\border\s+by\b/gi;
const GROUP_END = /\b(?:having|order\s+by|limit)\b|\)|;/gi;
const ORDER_END = /\blimit\b|\)|;/gi;

export function routeIntegerLiterals(query: string): string {
  let out = "";
  let quote: string | null = null;
  let i = 0;
  const exempt = exemptOrdinalSpans(query);
  while (i < query.length) {
    const ch = query[i] as string;
    if (quote !== null) {
      if (ch === quote) quote = null;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    const limitDigits = matchLimitNumeral(query, i);
    if (limitDigits !== undefined) {
      out += query.slice(i, limitDigits.start);
      out += magnitudeAtLeast(limitDigits.digits, U32)
        ? LIMIT_CAP
        : limitDigits.digits;
      i = limitDigits.end;
      continue;
    }
    const intArg = matchIntCall(query, i);
    if (intArg !== undefined && inDeadZone(intArg.digits)) {
      out += `decimal('${intArg.sign}${intArg.digits}')`;
      i = intArg.end;
      continue;
    }
    const numeral = matchBareNumeral(query, i);
    if (
      numeral === undefined ||
      inSpans(numeral.start, exempt) ||
      !inDeadZone(numeral.digits)
    ) {
      out += ch;
      i += 1;
      continue;
    }
    out += `decimal('${numeral.digits}')`;
    i = numeral.end;
  }
  return quote === null ? out : query;
}

/** Spans of bare-ordinal keys inside GROUP/ORDER lists (exempt). */
function exemptOrdinalSpans(query: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (const [pattern, end] of [
    [GROUP_BY, GROUP_END],
    [ORDER_BY, ORDER_END],
  ] as const) {
    for (const m of query.matchAll(pattern)) {
      if (inLiteral(query, m.index as number)) continue;
      const rest = query.slice((m.index as number) + m[0].length);
      end.lastIndex = 0;
      const endMatch = end.exec(rest);
      const list = endMatch ? rest.slice(0, endMatch.index) : rest;
      const base = (m.index as number) + m[0].length;
      let offset = 0;
      for (const key of list.split(",")) {
        const trimmed = key.trim();
        if (/^\d+$/.test(trimmed)) {
          const start = base + offset + key.indexOf(trimmed);
          spans.push([start, start + trimmed.length]);
        }
        offset += key.length + 1;
      }
    }
  }
  return spans;
}

/** Whether position i sits inside a string literal. */
function inLiteral(query: string, i: number): boolean {
  let quote: string | null = null;
  for (let j = 0; j < i; j += 1) {
    const ch = query[j] as string;
    if (quote !== null) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    }
  }
  return quote !== null;
}

function inSpans(pos: number, spans: Array<[number, number]>): boolean {
  return spans.some(([start, end]) => pos >= start && pos < end);
}

/** If `LIMIT <digits>` starts at i, the digits span; else undefined. */
function matchLimitNumeral(
  query: string,
  i: number,
): { start: number; end: number; digits: string } | undefined {
  LIMIT_WORD.lastIndex = i;
  const word = LIMIT_WORD.exec(query);
  if (word === null) return undefined;
  LIMIT_GAP.lastIndex = i + word[0].length;
  const gap = LIMIT_GAP.exec(query) as RegExpExecArray;
  const digitsStart = i + word[0].length + gap[0].length;
  DIGITS_AT.lastIndex = digitsStart;
  const digits = DIGITS_AT.exec(query);
  if (digits === null) return undefined;
  const end = digitsStart + digits[0].length;
  const after = end < query.length ? (query[end] as string) : "";
  if (after !== "" && /[\w.]/.test(after)) return undefined;
  return { start: digitsStart, end, digits: digits[0] };
}

/**
 * If an `int()` call with a signed-or-bare digit argument starts at i,
 * its span plus the normalized sign (`-` or empty — `+` is identity);
 * else undefined. The argument must fill the call: anything past it
 * but `)` leaves the call for the engine.
 */
function matchIntCall(
  query: string,
  i: number,
): { end: number; digits: string; sign: string } | undefined {
  const prev = i > 0 ? (query[i - 1] as string) : "";
  if (prev !== "" && /[\w.$]/.test(prev)) return undefined;
  INT_WORD.lastIndex = i;
  const word = INT_WORD.exec(query);
  if (word === null) return undefined;
  let j = i + word[0].length;
  INT_GAP.lastIndex = j;
  j += (INT_GAP.exec(query) as RegExpExecArray)[0].length;
  if (query[j] !== "(") return undefined;
  j += 1;
  INT_GAP.lastIndex = j;
  j += (INT_GAP.exec(query) as RegExpExecArray)[0].length;
  const quote = query[j] === "'" || query[j] === '"' ? query[j] : "";
  if (quote !== "") j += 1;
  let sign = "";
  if (query[j] === "-" || query[j] === "+") {
    if (query[j] === "-") sign = "-";
    j += 1;
  }
  DIGITS_AT.lastIndex = j;
  const digits = DIGITS_AT.exec(query);
  if (digits === null) return undefined;
  j += digits[0].length;
  if (quote !== "") {
    if (query[j] !== quote) return undefined;
    j += 1;
  } else if (j < query.length && /[\w.$]/.test(query[j] as string)) {
    return undefined;
  }
  INT_GAP.lastIndex = j;
  j += (INT_GAP.exec(query) as RegExpExecArray)[0].length;
  if (query[j] !== ")") return undefined;
  return { end: j + 1, digits: digits[0], sign };
}

/** If a bare integer literal starts at i, its span; else undefined. */
function matchBareNumeral(
  query: string,
  i: number,
): { start: number; end: number; digits: string } | undefined {
  if (!/[0-9]/.test(query[i] as string)) return undefined;
  const prev = i > 0 ? (query[i - 1] as string) : "";
  if (prev !== "" && /[\w.$]/.test(prev)) return undefined;
  DIGITS_AT.lastIndex = i;
  const digits = (DIGITS_AT.exec(query) as RegExpExecArray)[0];
  const end = i + digits.length;
  const after = end < query.length ? (query[end] as string) : "";
  if (after !== "" && /[\w.$]/.test(after)) return undefined;
  return { start: i, end, digits };
}

/** Whether a digit string's magnitude is at least the bound's. */
function magnitudeAtLeast(digits: string, bound: string): boolean {
  const norm = digits.replace(/^0+(?=\d)/, "");
  if (norm.length !== bound.length) return norm.length > bound.length;
  return norm >= bound;
}

/** Whether a digit string's magnitude is inside the dead zone. */
function inDeadZone(digits: string): boolean {
  const norm = digits.replace(/^0+(?=\d)/, "");
  if (norm.length < DEAD_ZONE_LO.length || norm.length > DEAD_ZONE_HI.length) {
    return false;
  }
  if (norm.length === DEAD_ZONE_LO.length && norm < DEAD_ZONE_LO) return false;
  if (norm.length === DEAD_ZONE_HI.length && norm > DEAD_ZONE_HI) return false;
  return true;
}
