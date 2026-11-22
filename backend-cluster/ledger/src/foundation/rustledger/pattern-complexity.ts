/**
 * Limits on a regular expression that a ledger or a request supplies: the
 * `check_commodity` and `onecommodity` plugin configs, and the `account` and
 * `filter` values of a journal or report read.
 *
 * JavaScript's engine matches by backtracking. When a pattern's repeats can
 * read the same text in more than one way, the engine tries every way before
 * it gives up on a text that does not match, so `(a+)+$` takes about twice as
 * long for each further `a`, and `.*.*.*Z` grows with the cube of the text's
 * length. Ordinary patterns read each text one way: `^Expenses:(Food|Rent)`,
 * `Assets:Cash(App)?$`, `Assets:.*`, and the `\s+`-joined words and
 * `(?:é|é)` spellings the mobile search sends are all accepted.
 *
 * The check reads the pattern's position automaton (Glushkov's): one state
 * per character the pattern consumes, and an edge to each state that can read
 * the next character, weighted by how many ways the pattern's syntax reaches
 * it. Counted repeats up to {@link MAX_UNROLLED_REPEAT} are unrolled the way
 * the engine counts them (`a{1,3}` is `a(a(a)?)?`), so `\d{4}` and `\d{1,2}`
 * stay exact. It refuses
 *
 * - a pattern longer than {@link MAX_PATTERN_LENGTH};
 * - a loop that can read one text along two different paths, which makes the
 *   time exponential: `(a+)+`, `(a|a)*`, `(.|.)*`, `(\w+\s?)+`;
 * - more than {@link MAX_OVERLAPPING_REPEATS} repeats in a row that can read
 *   the same text, which makes it a higher power: `.*.*.*`, `\w+\w+\w+`;
 * - a pattern that, without looping, can read one text in more than
 *   2^{@link MAX_SPLIT_BITS} ways: `(.|.){32}`, `a?a?a?…aaa…`.
 *
 * It errs toward refusing: a larger repeat is read as unbounded, a
 * backreference as any text, and a pattern it cannot judge within
 * {@link MAX_STEPS} is refused too. Lookaround bodies are judged as patterns
 * of their own. It reads the text the engine compiled (after any rewriting)
 * with the flags it compiled it with, so it sees the same syntax the engine
 * does.
 */

/** The longest pattern accepted from a ledger or a request. */
export const MAX_PATTERN_LENGTH = 256;
/** Repeats in a row that may read the same text: `.*:.*` is two. */
const MAX_OVERLAPPING_REPEATS = 2;
/** Counted repeats up to this bound are unrolled; larger ones read as `*`. */
const MAX_UNROLLED_REPEAT = 32;
/** States in one automaton, after unrolling. */
const MAX_POSITIONS = 1024;
/** Ways to read one text, as a power of two, outside any loop. */
const MAX_SPLIT_BITS = 6;
/** Work the check may do before it refuses a pattern as too complex. */
const MAX_STEPS = 50_000;

const TOO_COMPLEX_TO_CHECK = "too complex to check";

/**
 * Why the pattern `source`, compiled with `flags`, is refused, as a phrase
 * that follows "pattern is", or `undefined` when it may run. Call it once the
 * pattern has compiled.
 */
export function patternRefusal(
  source: string,
  flags: string,
): string | undefined {
  if (source.length > MAX_PATTERN_LENGTH) {
    return `longer than ${MAX_PATTERN_LENGTH} characters`;
  }
  const parser = new PatternParser(source, flags);
  const roots = [parser.parse(), ...parser.lookarounds];
  const budget = { steps: 0 };
  for (const root of roots) {
    const refusal = automatonRefusal(root, parser.ignoresCase, budget);
    if (refusal !== undefined) return refusal;
  }
  return undefined;
}

// ── Character sets ──────────────────────────────────────────────────────────

/** Sorted, disjoint, inclusive code-point ranges: `[lo0, hi0, lo1, hi1, …]`. */
type CharSet = readonly number[];

const MAX_CODE_POINT = 0x10ffff;
const ANY: CharSet = [0, MAX_CODE_POINT];
const DIGIT: CharSet = [0x30, 0x39];
const WORD: CharSet = [0x30, 0x39, 0x41, 0x5a, 0x5f, 0x5f, 0x61, 0x7a];
const SPACE: CharSet = normalize([
  [0x09, 0x0d],
  [0x20, 0x20],
  [0xa0, 0xa0],
  [0x1680, 0x1680],
  [0x2000, 0x200a],
  [0x2028, 0x2029],
  [0x202f, 0x202f],
  [0x205f, 0x205f],
  [0x3000, 0x3000],
  [0xfeff, 0xfeff],
]);

function single(code: number): CharSet {
  return [code, code];
}

function normalize(ranges: (readonly [number, number])[]): CharSet {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: number[] = [];
  for (const [lo, hi] of sorted) {
    const last = merged.length - 1;
    if (last > 0 && lo <= merged[last]! + 1) {
      merged[last] = Math.max(merged[last]!, hi);
    } else {
      merged.push(lo, hi);
    }
  }
  return merged;
}

function rangesOf(set: CharSet): [number, number][] {
  const ranges: [number, number][] = [];
  for (let i = 0; i < set.length; i += 2) ranges.push([set[i]!, set[i + 1]!]);
  return ranges;
}

function union(...sets: CharSet[]): CharSet {
  return normalize(sets.flatMap(rangesOf));
}

function complement(set: CharSet): CharSet {
  const ranges: [number, number][] = [];
  let next = 0;
  for (const [lo, hi] of rangesOf(set)) {
    if (lo > next) ranges.push([next, lo - 1]);
    next = hi + 1;
  }
  if (next <= MAX_CODE_POINT) ranges.push([next, MAX_CODE_POINT]);
  return normalize(ranges);
}

function intersect(a: CharSet, b: CharSet): CharSet {
  const result: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i]!, b[j]!);
    const hi = Math.min(a[i + 1]!, b[j + 1]!);
    if (lo <= hi) result.push(lo, hi);
    if (a[i + 1]! < b[j + 1]!) i += 2;
    else j += 2;
  }
  return result;
}

function overlaps(a: CharSet, b: CharSet): boolean {
  return intersect(a, b).length > 0;
}

/** The set with each letter's other case, as a case-insensitive match reads it. */
function foldCase(set: CharSet): CharSet {
  const extra: [number, number][] = [];
  for (const [lo, hi] of rangesOf(set)) {
    for (const [from, to, shift] of [
      [0x41, 0x5a, 0x20],
      [0x61, 0x7a, -0x20],
    ] as const) {
      const start = Math.max(lo, from);
      const end = Math.min(hi, to);
      if (start <= end) extra.push([start + shift, end + shift]);
    }
    // Each letter of a short non-ASCII run; a wide range already spans most.
    if (hi - lo < 256) {
      for (let code = Math.max(lo, 0x80); code <= hi; code += 1) {
        const char = String.fromCodePoint(code);
        for (const other of [char.toLowerCase(), char.toUpperCase()]) {
          const otherCode = other.codePointAt(0)!;
          if (other.length === String.fromCodePoint(otherCode).length) {
            extra.push([otherCode, otherCode]);
          }
        }
      }
    }
  }
  return union(set, normalize(extra));
}

// ── Parsing ─────────────────────────────────────────────────────────────────

type PatternNode =
  | { kind: "char"; set: CharSet }
  | { kind: "seq"; items: PatternNode[] }
  | { kind: "alt"; branches: PatternNode[] }
  | { kind: "repeat"; body: PatternNode; min: number; max: number }
  | { kind: "empty" };

const EMPTY_NODE: PatternNode = { kind: "empty" };
/** A backreference reads text the check cannot know: any, of any length. */
const BACKREFERENCE: PatternNode = {
  kind: "repeat",
  body: { kind: "char", set: ANY },
  min: 0,
  max: Infinity,
};

const QUANTIFIER = /^\{(\d+)(,(\d*))?\}/u;
const HEX = /^[0-9A-Fa-f]+$/u;

/**
 * A lenient reader of JavaScript pattern syntax (with the web-compatibility
 * forms: a `{` that is not a quantifier is a literal, `\8` is `8`). It never
 * throws: the pattern has already compiled, and a form it does not know reads
 * as one character of any value.
 */
class PatternParser {
  /** Lookaround bodies, judged separately: they consume nothing outside. */
  public readonly lookarounds: PatternNode[] = [];
  public ignoresCase: boolean;
  private index = 0;
  private readonly unicode: boolean;
  private readonly unicodeSets: boolean;
  private readonly captureGroups: number;
  private readonly namedGroups: boolean;

  public constructor(
    private readonly source: string,
    flags: string,
  ) {
    this.ignoresCase = flags.includes("i");
    this.unicode = flags.includes("u") || flags.includes("v");
    this.unicodeSets = flags.includes("v");
    let groups = 0;
    let named = false;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (char === "\\") {
        i += 1;
      } else if (char === "[") {
        for (i += 1; i < source.length && source[i] !== "]"; i += 1) {
          if (source[i] === "\\") i += 1;
        }
      } else if (char === "(") {
        if (source[i + 1] !== "?") groups += 1;
        else if (source[i + 2] === "<" && !"=!".includes(source[i + 3] ?? "")) {
          groups += 1;
          named = true;
        }
      }
    }
    this.captureGroups = groups;
    this.namedGroups = named;
  }

  /** The whole pattern. A compiled pattern has no stray `)` to stop at. */
  public parse(): PatternNode {
    return this.alternation();
  }

  private alternation(): PatternNode {
    const branches = [this.sequence()];
    while (this.source[this.index] === "|") {
      this.index += 1;
      branches.push(this.sequence());
    }
    return branches.length === 1 ? branches[0]! : { kind: "alt", branches };
  }

  private sequence(): PatternNode {
    const items: PatternNode[] = [];
    while (this.index < this.source.length) {
      const char = this.source[this.index];
      if (char === "|" || char === ")") break;
      items.push(this.quantified());
    }
    return items.length === 1 ? items[0]! : { kind: "seq", items };
  }

  private quantified(): PatternNode {
    const atom = this.atom();
    const char = this.source[this.index];
    let min: number;
    let max: number;
    if (char === "*") {
      [min, max] = [0, Infinity];
      this.index += 1;
    } else if (char === "+") {
      [min, max] = [1, Infinity];
      this.index += 1;
    } else if (char === "?") {
      [min, max] = [0, 1];
      this.index += 1;
    } else if (char === "{") {
      const match = QUANTIFIER.exec(this.source.slice(this.index));
      if (match === null) return atom;
      min = Number(match[1]);
      max =
        match[2] === undefined
          ? min
          : match[3] === ""
            ? Infinity
            : Number(match[3]);
      this.index += match[0].length;
    } else {
      return atom;
    }
    // Laziness changes the order of the tries, not how many there are.
    if (this.source[this.index] === "?") this.index += 1;
    return { kind: "repeat", body: atom, min, max };
  }

  private atom(): PatternNode {
    const char = this.source[this.index]!;
    if (char === "(") return this.group();
    if (char === "[") return { kind: "char", set: this.characterClass() };
    if (char === ".") {
      this.index += 1;
      return { kind: "char", set: ANY };
    }
    if (char === "^" || char === "$") {
      this.index += 1;
      return EMPTY_NODE;
    }
    if (char === "\\") return this.escape();
    return { kind: "char", set: single(this.literal()) };
  }

  /** The next source character, read as itself. */
  private literal(): number {
    const code = this.unicode
      ? this.source.codePointAt(this.index)!
      : this.source.charCodeAt(this.index);
    this.index += code > 0xffff ? 2 : 1;
    return code;
  }

  private group(): PatternNode {
    const rest = this.source.slice(this.index);
    let lookaround = false;
    if (rest.startsWith("(?=") || rest.startsWith("(?!")) {
      this.index += 3;
      lookaround = true;
    } else if (rest.startsWith("(?<=") || rest.startsWith("(?<!")) {
      this.index += 4;
      lookaround = true;
    } else if (rest.startsWith("(?<")) {
      const close = this.source.indexOf(">", this.index);
      this.index = close < 0 ? this.index + 3 : close + 1;
    } else if (rest.startsWith("(?")) {
      // `(?:` or a modifier group such as `(?i:` / `(?-i:`.
      const modifiers = /^\(\?([a-z]*)(?:-([a-z]*))?:/u.exec(rest);
      if (modifiers?.[1]?.includes("i")) this.ignoresCase = true;
      this.index += modifiers ? modifiers[0].length : 2;
    } else {
      this.index += 1;
    }
    const body = this.alternation();
    if (this.source[this.index] === ")") this.index += 1;
    if (lookaround) {
      this.lookarounds.push(body);
      return EMPTY_NODE;
    }
    return body;
  }

  private escape(): PatternNode {
    this.index += 1;
    const char = this.source[this.index];
    if (char === undefined) return { kind: "char", set: single(0x5c) };
    if (char === "b" || char === "B") {
      this.index += 1;
      return EMPTY_NODE;
    }
    if (char >= "1" && char <= "9") {
      const digits = /^\d+/u.exec(this.source.slice(this.index))![0];
      if (Number(digits) <= this.captureGroups) {
        this.index += digits.length;
        return BACKREFERENCE;
      }
    }
    if (
      char === "k" &&
      this.namedGroups &&
      this.source[this.index + 1] === "<"
    ) {
      const close = this.source.indexOf(">", this.index);
      this.index = close < 0 ? this.index + 1 : close + 1;
      return BACKREFERENCE;
    }
    return { kind: "char", set: this.escapedSet() };
  }

  /** An escape's characters, after its backslash; shared with classes. */
  private escapedSet(): CharSet {
    const char = this.source[this.index]!;
    this.index += 1;
    switch (char) {
      case "d":
        return DIGIT;
      case "D":
        return complement(DIGIT);
      case "w":
        return WORD;
      case "W":
        return complement(WORD);
      case "s":
        return SPACE;
      case "S":
        return complement(SPACE);
      case "n":
        return single(0x0a);
      case "r":
        return single(0x0d);
      case "t":
        return single(0x09);
      case "f":
        return single(0x0c);
      case "v":
        return single(0x0b);
      case "0":
        return single(0);
      case "c": {
        const letter = this.source[this.index];
        if (letter !== undefined && /[A-Za-z]/u.test(letter)) {
          this.index += 1;
          return single(letter.charCodeAt(0) % 32);
        }
        // `\c` without a letter is a backslash, then `c` as itself.
        this.index -= 1;
        return single(0x5c);
      }
      case "x":
        return this.hexEscape(2) ?? single(0x78);
      case "u": {
        if (this.unicode && this.source[this.index] === "{") {
          const close = this.source.indexOf("}", this.index);
          if (close < 0) return ANY;
          const code = parseInt(this.source.slice(this.index + 1, close), 16);
          this.index = close + 1;
          return Number.isNaN(code) ? ANY : single(code);
        }
        return this.hexEscape(4) ?? single(0x75);
      }
      case "p":
      case "P":
        if (this.unicode && this.source[this.index] === "{") {
          const close = this.source.indexOf("}", this.index);
          if (close >= 0) this.index = close + 1;
          return ANY;
        }
        return single(char.charCodeAt(0));
      default:
        // An identity escape, or a form read as any character.
        return char >= "1" && char <= "9" ? ANY : single(char.charCodeAt(0));
    }
  }

  private hexEscape(length: number): CharSet | undefined {
    const digits = this.source.slice(this.index, this.index + length);
    if (digits.length !== length || !HEX.test(digits)) return undefined;
    this.index += length;
    return single(parseInt(digits, 16));
  }

  private characterClass(): CharSet {
    this.index += 1;
    if (this.unicodeSets) {
      // Set notation nests classes; read it as any character.
      for (let depth = 1; this.index < this.source.length && depth > 0;) {
        const char = this.source[this.index];
        if (char === "\\") this.index += 1;
        else if (char === "[") depth += 1;
        else if (char === "]") depth -= 1;
        this.index += 1;
      }
      return ANY;
    }
    const negated = this.source[this.index] === "^";
    if (negated) this.index += 1;
    const parts: CharSet[] = [];
    while (this.index < this.source.length && this.source[this.index] !== "]") {
      const from = this.classAtom();
      if (
        this.source[this.index] === "-" &&
        this.source[this.index + 1] !== "]" &&
        this.index + 1 < this.source.length
      ) {
        this.index += 1;
        const to = this.classAtom();
        if (
          from.length === 2 &&
          to.length === 2 &&
          from[0] === from[1] &&
          to[0] === to[1]
        ) {
          parts.push([from[0]!, Math.max(from[0]!, to[1]!)]);
        } else {
          // A class escape at either end makes `-` a literal.
          parts.push(from, to, single(0x2d));
        }
      } else {
        parts.push(from);
      }
    }
    this.index += 1;
    const set = union(...parts);
    return negated ? complement(set) : set;
  }

  private classAtom(): CharSet {
    if (this.source[this.index] !== "\\") return single(this.literal());
    this.index += 1;
    const char = this.source[this.index];
    if (char === "b") {
      this.index += 1;
      return single(0x08);
    }
    if (char === "-") {
      this.index += 1;
      return single(0x2d);
    }
    return char === undefined ? single(0x5c) : this.escapedSet();
  }
}

// ── The position automaton ──────────────────────────────────────────────────

/** State → number of ways the syntax reaches it. */
type Ways = ReadonlyMap<number, number>;

interface Fragment {
  first: Ways;
  last: Ways;
  /** Number of ways it matches empty text. */
  empty: number;
}

const EMPTY_FRAGMENT: Fragment = {
  first: new Map(),
  last: new Map(),
  empty: 1,
};

/** Counts past this read as this; only their logarithm is ever used. */
const MAX_COUNT = 2 ** 30;
const bounded = (count: number) => Math.min(MAX_COUNT, count);

function addWays(a: Ways, b: Ways, scale = 1): Ways {
  if (scale === 0) return a;
  const sum = new Map(a);
  for (const [state, ways] of b) {
    sum.set(state, bounded((sum.get(state) ?? 0) + ways * scale));
  }
  return sum;
}

class PositionAutomaton {
  public readonly sets: CharSet[] = [];
  /** `next[p]`: the states that can read the character after state `p`. */
  public readonly next: Map<number, number>[] = [];
  public overflowed = false;
  private builds = 0;

  public constructor(private readonly ignoresCase: boolean) {}

  public build(node: PatternNode): Fragment {
    // Unrolling multiplies nested repeats; stop once either bound is passed.
    this.builds += 1;
    if (this.builds > MAX_STEPS) this.overflowed = true;
    if (this.overflowed) return EMPTY_FRAGMENT;
    switch (node.kind) {
      case "empty":
        return EMPTY_FRAGMENT;
      case "char": {
        if (this.sets.length >= MAX_POSITIONS) {
          this.overflowed = true;
          return EMPTY_FRAGMENT;
        }
        const state = this.sets.length;
        this.sets.push(this.ignoresCase ? foldCase(node.set) : node.set);
        this.next.push(new Map());
        const ways = new Map([[state, 1]]);
        return { first: ways, last: ways, empty: 0 };
      }
      case "seq":
        return this.sequence(node.items.map((item) => () => this.build(item)));
      case "alt":
        return node.branches
          .map((branch) => this.build(branch))
          .reduce((a, b) => ({
            first: addWays(a.first, b.first),
            last: addWays(a.last, b.last),
            empty: bounded(a.empty + b.empty),
          }));
      case "repeat":
        return this.repeat(node.body, node.min, node.max);
    }
  }

  private repeat(body: PatternNode, min: number, max: number): Fragment {
    if (max === 0) return EMPTY_FRAGMENT;
    const copy = () => this.build(body);
    if (max <= MAX_UNROLLED_REPEAT) {
      // `a{2,4}` as `aa(a(a)?)?`: each further copy only after the one before.
      const optional = (count: number): Fragment => {
        if (count === 0) return EMPTY_FRAGMENT;
        const chain = this.sequence([copy, () => optional(count - 1)]);
        return { ...chain, empty: bounded(chain.empty + 1) };
      };
      return this.sequence([
        ...Array.from({ length: min }, () => copy),
        () => optional(max - min),
      ]);
    }
    // Unbounded, or too large to unroll: `a{3,}` as `aa(a)+`.
    const leading = min >= 2 && min - 1 <= MAX_UNROLLED_REPEAT ? min - 1 : 0;
    const loop = (): Fragment => {
      const fragment = this.build(body);
      this.link(fragment.last, fragment.first);
      // The engine stops a loop whose pass reads nothing, so no empty passes.
      return min === 0 ? { ...fragment, empty: 1 } : fragment;
    };
    return this.sequence([
      ...Array.from({ length: leading }, () => copy),
      loop,
    ]);
  }

  /** The parts in order, each built only when its turn comes. */
  private sequence(parts: (() => Fragment)[]): Fragment {
    let result = EMPTY_FRAGMENT;
    for (const part of parts) {
      const fragment = part();
      this.link(result.last, fragment.first);
      result = {
        first: addWays(result.first, fragment.first, result.empty),
        last: addWays(fragment.last, result.last, fragment.empty),
        empty: bounded(result.empty * fragment.empty),
      };
    }
    return result;
  }

  private link(from: Ways, to: Ways): void {
    for (const [source, sourceWays] of from) {
      const edges = this.next[source]!;
      for (const [target, targetWays] of to) {
        edges.set(
          target,
          bounded((edges.get(target) ?? 0) + sourceWays * targetWays),
        );
      }
    }
  }
}

// ── Judging the automaton ───────────────────────────────────────────────────

class OverBudget extends Error {}

type Step = () => void;

function automatonRefusal(
  root: PatternNode,
  ignoresCase: boolean,
  budget: { steps: number },
): string | undefined {
  const automaton = new PositionAutomaton(ignoresCase);
  const whole = automaton.build(root);
  if (automaton.overflowed) return TOO_COMPLEX_TO_CHECK;
  const step = () => {
    budget.steps += 1;
    if (budget.steps > MAX_STEPS) throw new OverBudget();
  };
  try {
    const components = stronglyConnected(automaton.next);
    const loops = components.filter(
      (states) =>
        states.length > 1 || automaton.next[states[0]!]!.has(states[0]!),
    );
    if (loops.some((states) => readsOneTextTwoWays(automaton, states, step))) {
      return "too complex: a repeated part can match the same text in more than one way, as in (a+)+ or (a|a)*";
    }
    if (
      longestOverlappingRun(automaton, loops, step) > MAX_OVERLAPPING_REPEATS
    ) {
      return `too complex: more than ${MAX_OVERLAPPING_REPEATS} repeats in a row can match the same text, as in .*.*.*`;
    }
    if (splitBits(automaton, whole.first, components, step) > MAX_SPLIT_BITS) {
      return `too complex: it can match the same text in more than ${2 ** MAX_SPLIT_BITS} ways`;
    }
    return undefined;
  } catch (error) {
    if (error instanceof OverBudget) return TOO_COMPLEX_TO_CHECK;
    throw error;
  }
}

/**
 * Tarjan's strongly connected components, each emitted after every component
 * it can reach (reverse topological order).
 */
function stronglyConnected(next: readonly Map<number, number>[]): number[][] {
  const order = new Array<number>(next.length).fill(-1);
  const lowest = new Array<number>(next.length).fill(0);
  const onStack = new Array<boolean>(next.length).fill(false);
  const stack: number[] = [];
  const components: number[][] = [];
  let counter = 0;
  const visit = (state: number) => {
    order[state] = lowest[state] = counter++;
    stack.push(state);
    onStack[state] = true;
    for (const target of next[state]!.keys()) {
      if (order[target] === -1) {
        visit(target);
        lowest[state] = Math.min(lowest[state]!, lowest[target]!);
      } else if (onStack[target]) {
        lowest[state] = Math.min(lowest[state]!, order[target]!);
      }
    }
    if (lowest[state] === order[state]) {
      const component: number[] = [];
      let member: number;
      do {
        member = stack.pop()!;
        onStack[member] = false;
        component.push(member);
      } while (member !== state);
      components.push(component);
    }
  };
  for (let state = 0; state < next.length; state += 1) {
    if (order[state] === -1) visit(state);
  }
  return components;
}

const pairKey = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);

/**
 * Of the pairs of states two paths reach from `starts` by reading the same
 * text, the pairs of two different states from which the paths can meet
 * again at one state. Only states `allowed` admits are walked.
 */
function rejoiningPairs(
  automaton: PositionAutomaton,
  starts: readonly (readonly [number, number])[],
  allowed: (state: number) => boolean,
  step: Step,
): Set<string> {
  const successors = (state: number) =>
    [...automaton.next[state]!.keys()].filter(allowed);
  const pairsAfter = (a: number, b: number): [number, number][] => {
    const pairs: [number, number][] = [];
    for (const x of successors(a)) {
      for (const y of successors(b)) {
        step();
        if (overlaps(automaton.sets[x]!, automaton.sets[y]!))
          pairs.push([x, y]);
      }
    }
    return pairs;
  };
  const reached = new Map<string, [number, number]>();
  const queue: [number, number][] = [];
  const reach = ([a, b]: readonly [number, number]) => {
    const key = pairKey(a, b);
    if (reached.has(key)) return;
    reached.set(key, [a, b]);
    queue.push([a, b]);
  };
  starts.forEach(reach);
  for (let i = 0; i < queue.length; i += 1) {
    pairsAfter(...queue[i]!).forEach(reach);
  }
  const parted = [...reached.values()].filter(([a, b]) => a !== b);
  const meets = new Set(
    [...reached.values()]
      .filter(([a, b]) => a === b)
      .map(([a]) => pairKey(a, a)),
  );
  for (let grew = parted.length > 0; grew;) {
    grew = false;
    for (const [a, b] of parted) {
      const key = pairKey(a, b);
      if (meets.has(key)) continue;
      if (pairsAfter(a, b).some(([x, y]) => meets.has(pairKey(x, y)))) {
        meets.add(key);
        grew = true;
      }
    }
  }
  return new Set(
    parted.map(([a, b]) => pairKey(a, b)).filter((key) => meets.has(key)),
  );
}

/**
 * Whether two different paths around this loop read the same text: an edge
 * the syntax reaches two ways, or two paths that part at one state and meet
 * again at another, reading the same characters in between.
 */
function readsOneTextTwoWays(
  automaton: PositionAutomaton,
  states: number[],
  step: Step,
): boolean {
  const inLoop = new Set(states);
  for (const state of states) {
    for (const [target, ways] of automaton.next[state]!) {
      if (inLoop.has(target) && ways > 1) return true;
    }
  }
  const diagonal = states.map((state) => [state, state] as const);
  return (
    rejoiningPairs(automaton, diagonal, (state) => inLoop.has(state), step)
      .size > 0
  );
}

/**
 * The longest run of loops, each reachable from the one before, where both
 * loops and every state between them can read a character they share: `.*`,
 * `:` and `.*` in `.*:.*` are such a run of two.
 */
function longestOverlappingRun(
  automaton: PositionAutomaton,
  loops: number[][],
  step: Step,
): number {
  const loopSets = loops.map((states) =>
    union(...states.map((state) => automaton.sets[state]!)),
  );
  const leadsTo = (from: number, to: number): boolean => {
    const shared = intersect(loopSets[from]!, loopSets[to]!);
    if (shared.length === 0) return false;
    const target = new Set(loops[to]);
    const seen = new Set(loops[from]);
    const queue = [...loops[from]!];
    for (let i = 0; i < queue.length; i += 1) {
      for (const state of automaton.next[queue[i]!]!.keys()) {
        step();
        if (seen.has(state) || !overlaps(automaton.sets[state]!, shared)) {
          continue;
        }
        if (target.has(state)) return true;
        seen.add(state);
        queue.push(state);
      }
    }
    return false;
  };
  // Components come after everything they reach, so a loop's successors are
  // already scored when it is.
  const run: number[] = [];
  for (let i = 0; i < loops.length; i += 1) {
    let longest = 1;
    for (let j = 0; j < i; j += 1) {
      if (run[j]! + 1 > longest && leadsTo(i, j)) longest = run[j]! + 1;
    }
    run.push(longest);
  }
  return Math.max(0, ...run);
}

/**
 * How many ways one text can be read along a single path through the
 * pattern, as a power of two: each state where two paths part and later meet
 * again doubles it, and an edge the syntax reaches `n` ways multiplies it by
 * `n`. `(a|a)(a|a)` reads `aa` four ways; `.{0,9}Z` reads any text one way.
 */
function splitBits(
  automaton: PositionAutomaton,
  first: Ways,
  components: number[][],
  step: Step,
): number {
  const START = -1;
  const edgesOf = (state: number): Ways =>
    state === START ? first : automaton.next[state]!;
  const forksOf = (state: number): [number, number][] => {
    const targets = [...edgesOf(state).keys()];
    const forks: [number, number][] = [];
    for (let i = 0; i < targets.length; i += 1) {
      for (let j = i + 1; j < targets.length; j += 1) {
        step();
        const [x, y] = [targets[i]!, targets[j]!];
        if (overlaps(automaton.sets[x]!, automaton.sets[y]!))
          forks.push([x, y]);
      }
    }
    return forks;
  };
  const states = [START, ...automaton.sets.keys()];
  const forks = new Map(states.map((state) => [state, forksOf(state)]));
  const rejoining = rejoiningPairs(
    automaton,
    [...forks.values()].flat(),
    () => true,
    step,
  );
  const bits = (state: number) =>
    Math.log2(Math.max(1, ...edgesOf(state).values())) +
    (forks.get(state)!.some(([x, y]) => rejoining.has(pairKey(x, y))) ? 1 : 0);
  const componentOf = new Array<number>(automaton.sets.length);
  components.forEach((members, index) =>
    members.forEach((state) => (componentOf[state] = index)),
  );
  // Components come after everything they reach.
  const best: number[] = [];
  const after = (state: number, own: number) => {
    let most = 0;
    for (const target of edgesOf(state).keys()) {
      const component = componentOf[target]!;
      if (component !== own) most = Math.max(most, best[component]!);
    }
    return most;
  };
  components.forEach((members, index) => {
    const own = members.reduce((sum, state) => sum + bits(state), 0);
    best.push(
      own + Math.max(0, ...members.map((state) => after(state, index))),
    );
  });
  return bits(START) + after(START, -1);
}
