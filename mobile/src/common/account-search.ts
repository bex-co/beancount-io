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

import { foldArabicLetters } from "./arabic-script-fold";
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

/**
 * `text` lowercased one UTF-16 unit at a time, so it stays index-aligned with
 * `text`. `"İ".toLowerCase()` is two units (`i` + U+0307), and lowercasing the
 * whole string shifted every later character by one, so "bank" stopped
 * finding `Assets:İşBank` (w21/060); its first unit, `i`, is what a typed
 * pattern holds.
 */
function lowerAligned(text: string): string {
  const whole = text.toLowerCase();
  if (whole.length === text.length) {
    return whole;
  }
  let lower = "";
  for (let index = 0; index < text.length; index += 1) {
    lower += text[index].toLowerCase()[0];
  }
  return lower;
}

function toNfc(text: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7f]*$/.test(text)) return text;
  // And the Arabic letters one way, keeping every character in place: an
  // account spelled with Arabic ي is found by a Persian ی (w21/836).
  return foldArabicLetters(text.normalize("NFC"));
}

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
  // Both sides as NFC: a ledger imported from a system that writes decomposed
  // Unicode holds "Café" as "Cafe" + U+0301, which neither "café" nor "Café"
  // would find (w21/256). Plain ASCII, nearly every account, skips the work.
  pattern = toNfc(pattern);
  text = toNfc(text);
  if (pattern.length === 0) {
    return 1;
  }
  if (pattern.length > text.length) {
    return 0;
  }

  // Lowercased once per candidate instead of per character compared.
  const lowerText = lowerAligned(text);
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
 * How exactly `pattern` names `account`: 2 for the whole name, 1 for its last
 * segment, else 0, under the same smartcase rule as the match. A past pick of
 * `Expenses:Rental-Car` ranked it above `Expenses:Rent` for "rent", since a
 * whole-segment match scored like a prefix and usage broke the tie (w21/642).
 */
function exactness(pattern: string, account: string): number {
  const wanted = toNfc(pattern);
  const named = (text: string) =>
    text.length === wanted.length &&
    substringIndex(text, lowerAligned(text), wanted) === 0;
  const text = toNfc(account);
  if (named(text)) return 2;
  return named(text.slice(text.lastIndexOf(SEGMENT_SEPARATOR) + 1)) ? 1 : 0;
}

/**
 * Accounts matching `pattern`, best first. An empty pattern returns the input
 * order untouched, so the caller can hand back its browse ordering unchanged.
 *
 * An account the query names exactly (its whole name, then its last segment)
 * comes first. Then match quality dominates — a better match outranks a
 * more-used weaker one. Only once two accounts match equally well does `usage`
 * decide, so the ones the user actually books against come first; remaining
 * ties break on the shorter account, then alphabetically, so equally-good
 * matches land in a stable, predictable order rather than query-order chance.
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
  // Every word of the query must match, in any order: an account name has no
  // spaces, so "credit card" as one pattern matched nothing and then offered
  // to create an account the form refuses (w21/255). A single word scores
  // exactly as before.
  const words = trimmed.split(/\s+/);

  const matches: Array<{
    account: string;
    exact: number;
    score: number;
    frecency: number;
  }> = [];
  for (const account of accounts) {
    let score = 0;
    for (const word of words) {
      const wordScore = fuzzyMatch(word, account);
      if (wordScore === 0) {
        score = 0;
        break;
      }
      score += wordScore;
    }
    if (score === 0) {
      continue;
    }
    // Frecency is scored here rather than in the comparator, which would
    // re-derive it O(n log n) times per keystroke — and only for accounts that
    // survived the match, which on a real chart of accounts is few of them.
    matches.push({
      account,
      exact: words.length === 1 ? exactness(trimmed, account) : 0,
      score,
      frecency: ranking
        ? frecencyScore(ranking.usage[account], ranking.now)
        : 0,
    });
  }

  return matches
    .sort(
      (a, b) =>
        b.exact - a.exact ||
        b.score - a.score ||
        b.frecency - a.frecency ||
        a.account.length - b.account.length ||
        a.account.localeCompare(b.account),
    )
    .map((scored) => scored.account);
}
