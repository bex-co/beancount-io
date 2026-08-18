/**
 * Fuzzy matching for beancount account names, mirroring fava's editor
 * autocomplete (`frontend/src/lib/fuzzy.ts`) so muscle memory carries over from
 * the web: pattern characters must appear in order but may have gaps, an exact
 * substring beats a scattered match, consecutive runs score higher than
 * isolated hits, and a lowercase pattern character matches either case while an
 * uppercase one demands an exact match.
 *
 * On top of fava's rules we score colon segments, because that is how people
 * read account names: a match that starts a segment (`fo` → `Expenses:Food`)
 * outranks one that starts mid-word (`Assets:Bofo`).
 *
 * Kept free of any `@/` imports so the jest-lite runner can require it.
 */

import { SEGMENT_SEPARATOR } from "./account-util";
import { frecencyScore, type RankingContext } from "./account-frecency";

/** Extra score per pattern character that lands on a segment boundary. */
const SEGMENT_MATCH_BONUS = 2;

/**
 * An exact substring adds `length² + 3·length`, which outruns the best possible
 * scattered score (`3·length`: every character isolated on a segment start) at
 * every pattern length — so an exact hit always sorts above a scattered one.
 */
const EXACT_MATCH_LENGTH_FACTOR = 3;

function isSegmentStart(text: string, index: number): boolean {
  return index === 0 || text[index - 1] === SEGMENT_SEPARATOR;
}

/**
 * Index of `pattern` as a contiguous run, or -1. `lowerText` is passed in
 * rather than lowercased here: this runs per candidate on every keystroke, and
 * fava's smartcase rule (a lowercase pattern character matches either case, an
 * uppercase one only itself) needs both cases of the text anyway.
 */
function substringIndex(
  text: string,
  lowerText: string,
  pattern: string,
): number {
  const lastStart = text.length - pattern.length;
  for (let start = 0; start <= lastStart; start += 1) {
    let matched = true;
    for (let offset = 0; offset < pattern.length; offset += 1) {
      const patternChar = pattern[offset];
      if (
        text[start + offset] !== patternChar &&
        lowerText[start + offset] !== patternChar
      ) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return start;
    }
  }
  return -1;
}

/**
 * Score `text` against `pattern`. Higher is a better match; 0 means no match.
 * An empty pattern matches everything with a neutral score of 1.
 */
export function fuzzyMatch(pattern: string, text: string): number {
  if (pattern.length === 0) {
    return 1;
  }
  if (pattern.length > text.length) {
    return 0;
  }

  // Lowercased once per candidate instead of per character compared.
  const lowerText = text.toLowerCase();
  let patternIndex = 0;
  let runLength = 0;
  let score = 0;

  for (let index = 0; index < text.length; index += 1) {
    const patternChar = pattern[patternIndex];
    if (text[index] === patternChar || lowerText[index] === patternChar) {
      patternIndex += 1;
      runLength += 1;
      // Squared so contiguity compounds: `Fo` in `Expenses:Food` has to beat
      // an `F` and an `O` landing on two different segment starts.
      score += runLength ** 2;
      if (isSegmentStart(text, index)) {
        score += SEGMENT_MATCH_BONUS;
      }
      // Nothing left to match — the rest of the text only resets `runLength`.
      if (patternIndex === pattern.length) {
        break;
      }
    } else {
      runLength = 0;
    }
  }

  // Every pattern character has to land somewhere, in order.
  if (patternIndex < pattern.length) {
    return 0;
  }

  const exactIndex = substringIndex(text, lowerText, pattern);
  if (exactIndex >= 0) {
    score += pattern.length ** 2 + EXACT_MATCH_LENGTH_FACTOR * pattern.length;
    if (isSegmentStart(text, exactIndex)) {
      score += pattern.length;
    }
  }

  return score;
}

/**
 * Accounts matching `pattern`, best first. An empty pattern returns the input
 * order untouched, so the caller can hand back its browse ordering unchanged.
 *
 * Match quality always dominates — a better match outranks a more-used weaker
 * one. Only once two accounts match equally well does `usage` decide, so the
 * ones the user actually books against come first; remaining ties break on the
 * shorter account, then alphabetically, so equally-good matches land in a
 * stable, predictable order rather than query-order chance.
 */
export function filterAccounts(
  pattern: string,
  accounts: string[],
  ranking?: RankingContext,
): string[] {
  const trimmed = pattern.trim();
  if (trimmed.length === 0) {
    return [...accounts];
  }

  const matches: Array<{
    account: string;
    score: number;
    frecency: number;
  }> = [];
  for (const account of accounts) {
    const score = fuzzyMatch(trimmed, account);
    if (score === 0) {
      continue;
    }
    // Frecency is scored here rather than in the comparator, which would
    // re-derive it O(n log n) times per keystroke — and only for accounts that
    // survived the match, which on a real chart of accounts is few of them.
    matches.push({
      account,
      score,
      frecency: ranking
        ? frecencyScore(ranking.usage[account], ranking.now)
        : 0,
    });
  }

  return matches
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.frecency - a.frecency ||
        a.account.length - b.account.length ||
        a.account.localeCompare(b.account),
    )
    .map((scored) => scored.account);
}
