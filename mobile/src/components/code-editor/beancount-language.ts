/**
 * Beancount token rules — the single source for syntax highlighting.
 *
 * code-editor.tsx wires these into a CodeMirror StreamLanguage; the unit-test
 * runner drives the same `tokenizeBeancount` over a tiny line stream, so the
 * tests prove the production rules instead of a parallel classifier. The
 * module is import-free on purpose: the jest-lite runner cannot load the
 * ESM-only @codemirror packages.
 *
 * The stream interface is the subset of CodeMirror's StringStream the rules
 * use; StringStream satisfies it structurally.
 */

export interface BeancountStream {
  eol(): boolean;
  /** CodeMirror's StringStream.next returns `string | void`. */
  next(): string | undefined | void;
  peek(): string | undefined;
  match(pattern: RegExp): boolean | RegExpMatchArray | null;
  eatSpace(): boolean;
}

export type BeancountState = { inStr: boolean };

export function startBeancountState(): BeancountState {
  return { inStr: false };
}

export function copyBeancountState(state: BeancountState): BeancountState {
  return { ...state };
}

/**
 * Account segment (beancount v3 / rustledger): starts with an uppercase
 * letter, a caseless letter (CJK account names), or a digit; continues with
 * letters, digits, and dashes.
 */
const ACCOUNT_SEGMENT_START = "[\\p{Lu}\\p{Lo}\\p{Nd}]";
const ACCOUNT_SEGMENT_REST = "[\\p{L}\\p{Nd}-]*";

/**
 * An account path needs at least two segments (`Assets:Cash`). The colon
 * requirement is what keeps a bare `USD` out of this rule so it can fall
 * through to the currency rule below.
 */
const ACCOUNT_PATTERN = new RegExp(
  `^${ACCOUNT_SEGMENT_START}${ACCOUNT_SEGMENT_REST}(?::${ACCOUNT_SEGMENT_START}${ACCOUNT_SEGMENT_REST})+`,
  "u",
);

/** Currency code: 2+ chars, uppercase-led (`USD`, `AAPL`, `BTC`, `V.TI`-ish). */
const CURRENCY_PATTERN = /^[\p{Lu}][\p{Lu}\p{Nd}.'_-]{1,23}(?![\p{Ll}])/u;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?!\d)/;
const DIRECTIVE_PATTERN =
  /^(txn|balance|open|close|pad|note|price|document|custom|option|include|plugin|pushmeta|popmeta|event|query|commodity)\b/;
const FLAG_PATTERN = /^[*!]/;
const TAG_PATTERN = /^#[\p{L}\p{N}_/-]+/u;
const LINK_PATTERN = /^\^[\p{L}\p{N}_/-]+/u;
const NUMBER_PATTERN = /^-?[\d,]+(?:\.\d+)?/;

/**
 * Consume one token from the stream and return its CodeMirror token name
 * (mapped to @lezer highlight tags by the editor), or null for plain text.
 *
 * Token order matters: directives and account paths run before the currency
 * rule so neither `open` nor `USD` is stolen by a broader pattern.
 */
export function tokenizeBeancount(
  stream: BeancountStream,
  state: BeancountState,
): string | null {
  // Continue an open string across lines
  if (state.inStr) {
    consumeStringBody(stream, state);
    return "string";
  }

  if (stream.eatSpace()) return null;

  // Line comment
  if (stream.match(/^;.*/)) return "comment";

  // String literal
  if (stream.peek() === '"') {
    stream.next(); // opening quote
    consumeStringBody(stream, state);
    return "string";
  }

  // Date  YYYY-MM-DD
  if (stream.match(DATE_PATTERN)) return "number";

  // Directives (must come before account/currency to avoid partial match)
  if (stream.match(DIRECTIVE_PATTERN)) return "keyword";

  // Transaction flags  * !
  if (stream.match(FLAG_PATTERN)) return "atom";

  // Account names  Assets:Checking:Main, Assets:银行
  if (stream.match(ACCOUNT_PATTERN)) return "variableName";

  // Tags  #tag
  if (stream.match(TAG_PATTERN)) return "tagName";

  // Links  ^link
  if (stream.match(LINK_PATTERN)) return "labelName";

  // Currency codes  USD EUR BTC
  if (stream.match(CURRENCY_PATTERN)) return "typeName";

  // Numbers / amounts
  if (stream.match(NUMBER_PATTERN)) return "number";

  stream.next();
  return null;
}

/**
 * Consume string content up to and including the closing quote. An escaped
 * quote (`\"`) never closes the string. A line that ends inside a string
 * leaves `state.inStr` set so the next line continues as string content.
 */
function consumeStringBody(
  stream: BeancountStream,
  state: BeancountState,
): void {
  state.inStr = false;
  while (!stream.eol()) {
    const ch = stream.next();
    if (ch === "\\") {
      stream.next();
      continue;
    }
    if (ch === '"') return;
  }
  state.inStr = true;
}
