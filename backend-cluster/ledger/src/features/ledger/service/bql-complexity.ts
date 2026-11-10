/**
 * Operator-scale limits for an incoming BQL query, enforced on the API thread
 * before the query is handed to the engine.
 *
 * The engine parses an expression chain by recursive descent, and a long
 * enough FLAT chain (`1=1 AND 1=1 AND ...`, `NOT NOT NOT ...`) overflows the
 * WASM shadow stack long before anything else refuses it: rustledger's own
 * 128-level nesting cap counts parentheses, calls and subqueries, not chain
 * length. The overflow surfaces as `memory access out of bounds` and leaves
 * the instance poisoned, so a single query used to take out every later
 * request on the same worker thread.
 *
 * `engine-health.ts` contains that blast radius; this file removes the
 * trigger. Both matter: the probe cannot tell a hostile query from an unlucky
 * one, and this scan cannot know what the next engine version will recurse on.
 *
 * Scope is deliberately NOT a byte cap. `NOT ` is four bytes, so a payload
 * well under the `POST /shell/:owner/:repo_name/query` body sizes that
 * endpoint exists to serve (see `api/shell.ts`) already reaches the overflow —
 * any byte cap low enough to stop it would break the long legitimate queries
 * the POST twin was added for. Chain length is the dimension that actually
 * bounds recursion depth.
 *
 * The scan runs on the RAW query, before the normalizer pipeline, so operators
 * inside comments still count. That over-counts rather than under-counts; a
 * false refusal needs hundreds of operators inside a comment.
 */

/**
 * Longest run of one class of binary operator allowed at one parenthesis
 * level, and longest run of consecutive unary operators.
 *
 * Measured headroom: the engine survives chains in the low thousands and
 * traps above that. Ordinary BQL — including generated queries — stays in the
 * tens; a few hundred is already far outside hand-written shapes. This sits
 * clear of both.
 */
export const MAX_OPERATOR_CHAIN = 500;
/** Ceiling on operators anywhere in the query, as a backstop across clauses. */
export const MAX_TOTAL_OPERATORS = 2000;

const WORD = /[A-Za-z0-9_]/;
const DIGIT = /[0-9]/;
/** `YYYY-MM-DD`, whose dashes are part of the literal rather than operators. */
const DATE_LITERAL = /^\d{4}-\d{2}-\d{2}/;
/** Characters that can begin an operator. */
const OPERATOR_START = new Set([
  "+",
  "-",
  "*",
  "/",
  "%",
  "=",
  "<",
  ">",
  "!",
  "|",
  "~",
]);
/** Two-character operators, matched before their single-character prefixes. */
const TWO_CHAR_OPERATORS = new Set(["||", "<=", ">=", "!=", "<>", "=="]);
/**
 * Binary operators by precedence class, loosest first. A chain is a run of
 * one class at one level: `a = 1 OR b = 2 OR …` is one long OR chain of short
 * comparisons, and the engine recurses on the OR run, not on every operator
 * in it — a 1,500-term OR of comparisons parses in milliseconds, where 1,000
 * flat `AND`s of the same class trap (w1/213).
 */
const OPERATOR_CLASS: Readonly<Record<string, number>> = {
  OR: 0,
  AND: 1,
  "=": 2,
  "==": 2,
  "!=": 2,
  "<>": 2,
  "<": 2,
  ">": 2,
  "<=": 2,
  ">=": 2,
  "~": 2,
  IN: 2,
  LIKE: 2,
  MATCH: 2,
  IS: 2,
  "||": 3,
  "+": 3,
  "-": 3,
  "*": 4,
  "/": 4,
  "%": 4,
};
const CLASS_COUNT = 5;
/** Keyword operators that join two operands. */
const BINARY_KEYWORDS = new Set(["AND", "OR", "IN", "LIKE", "MATCH", "IS"]);
/** Keyword operators that take one operand. */
const UNARY_KEYWORDS = new Set(["NOT"]);
/**
 * Clause keywords. Each starts a fresh expression, so a chain does not carry
 * across one — `WHERE a AND b GROUP BY c ORDER BY d` is three short chains,
 * not one long one.
 */
const CLAUSE_KEYWORDS = new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP",
  "ORDER",
  "HAVING",
  "LIMIT",
  "BY",
  "PIVOT",
  "DISTINCT",
  "CLEAR",
  "BALANCES",
  "JOURNAL",
  "PRINT",
  "RUN",
  "EXPLAIN",
]);

export interface BqlComplexity {
  /** Longest run of one class of binary operator at any parenthesis level. */
  maxChain: number;
  /** Longest run of consecutive unary operators. */
  maxUnaryRun: number;
  /** Every operator occurrence in the query. */
  totalOperators: number;
}

/**
 * Count the operator shapes that drive the engine's recursion depth.
 *
 * A purely lexical pass, following the same two conventions as the other BQL
 * scanners (`bql-scan.ts`): a string literal has no escape sequences, so the
 * next matching quote ends it, and keywords match whole-word and
 * case-insensitively. Anything it cannot classify is simply not counted —
 * the limits exist to bound recursion, not to validate syntax, which stays
 * the engine's job.
 */
export function measureBqlComplexity(query: string): BqlComplexity {
  // One set of class counters per open parenthesis: `(` pushes a fresh set,
  // `)` pops back to the enclosing one. Nesting itself is rustledger's
  // 128-level cap to police; what matters here is how long any one level's
  // run of one operator class grows.
  const fresh = () => new Array<number>(CLASS_COUNT).fill(0);
  const chains: number[][] = [fresh()];
  let maxChain = 0;
  let maxUnaryRun = 0;
  let unaryRun = 0;
  let totalOperators = 0;
  // Whether the previous token can end an operand. This is what separates
  // binary `a - b` from unary `-b`, and it is why a unary run is only broken
  // by a real operand.
  let afterOperand = false;

  const countBinary = (operator: string): void => {
    totalOperators += 1;
    const counters = chains[chains.length - 1] as number[];
    const cls = OPERATOR_CLASS[operator] ?? 2;
    // A looser operator closes every tighter run before it: each comparison
    // in an OR list is its own short chain.
    for (let tighter = cls + 1; tighter < CLASS_COUNT; tighter += 1) {
      counters[tighter] = 0;
    }
    counters[cls] = (counters[cls] as number) + 1;
    maxChain = Math.max(maxChain, counters[cls] as number);
    unaryRun = 0;
    afterOperand = false;
  };
  const countUnary = (): void => {
    totalOperators += 1;
    unaryRun += 1;
    maxUnaryRun = Math.max(maxUnaryRun, unaryRun);
    afterOperand = false;
  };

  let i = 0;
  while (i < query.length) {
    const ch = query[i] as string;

    if (ch === "'" || ch === '"') {
      const end = query.indexOf(ch, i + 1);
      i = end === -1 ? query.length : end + 1;
      afterOperand = true;
      unaryRun = 0;
      continue;
    }

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === "(") {
      chains.push(fresh());
      i += 1;
      afterOperand = false;
      continue;
    }

    if (ch === ")") {
      if (chains.length > 1) chains.pop();
      i += 1;
      // A closed group is an operand: `(a) - (b)` is binary subtraction.
      afterOperand = true;
      unaryRun = 0;
      continue;
    }

    if (ch === ",") {
      // An argument separator restarts the chain inside the current level.
      chains[chains.length - 1] = fresh();
      i += 1;
      afterOperand = false;
      continue;
    }

    if (DIGIT.test(ch)) {
      const dateMatch = DATE_LITERAL.exec(query.slice(i, i + 10));
      if (dateMatch) {
        i += 10;
      } else {
        while (i < query.length && /[0-9.]/.test(query[i] as string)) i += 1;
      }
      afterOperand = true;
      unaryRun = 0;
      continue;
    }

    if (WORD.test(ch)) {
      const start = i;
      while (i < query.length && WORD.test(query[i] as string)) i += 1;
      const word = query.slice(start, i).toUpperCase();
      if (BINARY_KEYWORDS.has(word)) {
        countBinary(word);
      } else if (UNARY_KEYWORDS.has(word)) {
        countUnary();
      } else if (CLAUSE_KEYWORDS.has(word)) {
        chains[chains.length - 1] = fresh();
        unaryRun = 0;
        afterOperand = false;
      } else {
        // An identifier, column, alias or function name — an operand.
        afterOperand = true;
        unaryRun = 0;
      }
      continue;
    }

    if (OPERATOR_START.has(ch)) {
      const pair = query.slice(i, i + 2);
      if (TWO_CHAR_OPERATORS.has(pair)) {
        i += 2;
        countBinary(pair);
        continue;
      }
      i += 1;
      // `-x` and `+x` in operand position are sign, not subtraction. Every
      // other operator here joins two operands.
      if ((ch === "-" || ch === "+") && !afterOperand) {
        countUnary();
      } else {
        countBinary(ch);
      }
      continue;
    }

    // Punctuation the scan does not model (`.`, `:`, `#`, `;`, `@` …). It is
    // part of an operand or a terminator the engine handles.
    i += 1;
    afterOperand = true;
    unaryRun = 0;
  }

  return { maxChain, maxUnaryRun, totalOperators };
}

/**
 * The limit a query exceeds, as a user-facing reason, or `undefined` when it
 * is within every limit.
 */
export function bqlComplexityRefusal(query: string): string | undefined {
  const { maxChain, maxUnaryRun, totalOperators } = measureBqlComplexity(query);
  if (maxChain > MAX_OPERATOR_CHAIN) {
    return `Query refused: an expression chains ${maxChain} operators, over the limit of ${MAX_OPERATOR_CHAIN}. Split it into smaller expressions; for a long OR list of comparisons, use \`x IN (…)\`.`;
  }
  if (maxUnaryRun > MAX_OPERATOR_CHAIN) {
    return `Query refused: an expression applies ${maxUnaryRun} consecutive unary operators, over the limit of ${MAX_OPERATOR_CHAIN}.`;
  }
  if (totalOperators > MAX_TOTAL_OPERATORS) {
    return `Query refused: the query uses ${totalOperators} operators, over the limit of ${MAX_TOTAL_OPERATORS}. Split it into smaller queries.`;
  }
  return undefined;
}
