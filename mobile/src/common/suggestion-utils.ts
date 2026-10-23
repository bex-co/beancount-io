/**
 * Pure helpers that decide which account suggestions to surface for a selected
 * payee, split into the two sides of the transaction. Kept free of any `@/`
 * imports so the jest-lite runner can require it.
 *
 * `getLedgerPayeeAccounts` returns BOTH legs of past transactions with the
 * payee — the funding account (Assets/Liabilities) AND the expense account —
 * with the funding account first. So we classify each account by its top-level
 * type prefix (from the ledger's account-type names) and route it to the
 * matching side:
 *   - FROM ← funding accounts (Assets, Liabilities)
 *   - TO   ← destination accounts (Expenses)
 *
 * Rules (see `.pm/w1/m11/README.md`):
 *  - Repeat payee: the top account on each side auto-fills its row; the
 *    runner-ups render as tappable chips.
 *  - Unseen payee: the LLM category suggester feeds the TO chips only (no
 *    auto-fill — the model is guessing, so the user confirms); FROM is left
 *    alone. The LLM only suggests categories, never funding accounts.
 *  - Slow / failed queries never block: with no results we surface nothing and
 *    the add flow behaves exactly as before.
 */
import { merchantKey } from "./merchant-key";

/** Where a suggestion came from. */
type SuggestionSource = "history" | "llm";

export interface AccountSuggestion {
  account: string;
  source: SuggestionSource;
  /** Model confidence in 0..1; only meaningful for `source: "llm"`. */
  confidence?: number;
}

/** Shape of one LLM result — matches the generated `CategorySuggestion`. */
export interface CategorySuggestionLike {
  targetAccount: string;
  confidence: number;
  source?: string | null;
}

/**
 * Top-level account-type prefixes used to classify a history account as a
 * funding (FROM) or destination (TO) account. Derived from the ledger's
 * account-type option names (name_assets, name_liabilities, name_expenses).
 */
export interface AccountTypes {
  fromPrefixes: string[];
  toPrefixes: string[];
}

/** Suggestions for one side (FROM or TO) of the transaction. */
export interface SideSuggestions {
  /** Account to auto-fill into this side's row, or null to leave it alone. */
  autoFill: string | null;
  /** Runner-up accounts to render as tappable chips under the row. */
  chips: AccountSuggestion[];
}

export interface DeriveSuggestionsInput {
  payee: string;
  historyAccounts: string[];
  llmSuggestions: CategorySuggestionLike[];
  accountTypes: AccountTypes;
  historyLoading: boolean;
  llmLoading: boolean;
}

export interface DeriveSuggestionsResult {
  from: SideSuggestions;
  to: SideSuggestions;
  /** Which branch produced the chips. Null until resolved. */
  source: SuggestionSource | null;
  /** True while a relevant query is in flight and nothing to show yet. */
  loading: boolean;
}

/** Cap chips per side so a very common payee doesn't flood a row. */
export const MAX_SUGGESTIONS = 5;

/** Drop empties and duplicates, preserving first-seen order. */
export function dedupeAccounts(accounts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const account of accounts) {
    const trimmed = account?.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/** Classify an account as funding ("from"), destination ("to"), or neither. */
export function classifyAccount(
  account: string,
  types: AccountTypes,
): "from" | "to" | null {
  const prefix = account.split(":")[0];
  if (types.fromPrefixes.includes(prefix)) {
    return "from";
  }
  if (types.toPrefixes.includes(prefix)) {
    return "to";
  }
  return null;
}

/** Split deduped accounts into funding vs destination, preserving order. */
export function splitAccountsBySide(
  accounts: string[],
  types: AccountTypes,
): { from: string[]; to: string[] } {
  const from: string[] = [];
  const to: string[] = [];
  for (const account of accounts) {
    const side = classifyAccount(account, types);
    if (side === "from") {
      from.push(account);
    } else if (side === "to") {
      to.push(account);
    }
  }
  return { from, to };
}

/** Top account auto-fills; the rest (up to the cap) are runner-up chips. */
function buildSide(
  accounts: string[],
  source: SuggestionSource,
): SideSuggestions {
  const capped = accounts.slice(0, MAX_SUGGESTIONS);
  return {
    autoFill: capped[0] ?? null,
    chips: capped.slice(1).map((account) => ({ account, source })),
  };
}

/**
 * Rank LLM suggestions by confidence (desc), dedupe by target account, cap at
 * MAX_SUGGESTIONS. This ranks by the model's own confidence — it is NOT local
 * usage ranking (explicitly out of scope for v1).
 */
export function rankLlmSuggestions(
  suggestions: CategorySuggestionLike[],
): AccountSuggestion[] {
  const ranked = [...suggestions].sort((a, b) => b.confidence - a.confidence);
  const seen = new Set<string>();
  const out: AccountSuggestion[] = [];
  for (const suggestion of ranked) {
    const account = suggestion.targetAccount?.trim();
    if (!account || seen.has(account)) {
      continue;
    }
    seen.add(account);
    out.push({ account, source: "llm", confidence: suggestion.confidence });
    if (out.length >= MAX_SUGGESTIONS) {
      break;
    }
  }
  return out;
}

const EMPTY_SIDE: SideSuggestions = { autoFill: null, chips: [] };

/**
 * Decide each side's auto-fill + chips, the source, and loading state.
 */
export function deriveSuggestions(
  input: DeriveSuggestionsInput,
): DeriveSuggestionsResult {
  const {
    payee,
    historyAccounts,
    llmSuggestions,
    accountTypes,
    historyLoading,
    llmLoading,
  } = input;

  if (!payee.trim()) {
    return {
      from: EMPTY_SIDE,
      to: EMPTY_SIDE,
      source: null,
      loading: false,
    };
  }

  // History takes precedence; LLM is only the fallback for unseen payees.
  if (historyAccounts.length > 0) {
    const { from, to } = splitAccountsBySide(
      dedupeAccounts(historyAccounts),
      accountTypes,
    );
    return {
      from: buildSide(from, "history"),
      to: buildSide(to, "history"),
      source: "history",
      loading: false,
    };
  }

  // No history — surface the LLM picks as TO chips only (no auto-fill). The
  // LLM suggests categories, never funding accounts, so FROM stays empty.
  const ranked = rankLlmSuggestions(llmSuggestions);
  if (ranked.length > 0) {
    return {
      from: EMPTY_SIDE,
      to: { autoFill: null, chips: ranked },
      source: "llm",
      loading: false,
    };
  }

  // Nothing resolved yet — keep loading so the skeleton can show.
  return {
    from: EMPTY_SIDE,
    to: EMPTY_SIDE,
    source: null,
    loading: historyLoading || llmLoading,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Two-posting (simple transaction) path — used by the quick-add screen, which
// only ever produces a FROM→TO (two-posting) transaction. The journal gives us
// each transaction's postings with signed amounts, so the pair can be read
// directly (no prefix classification) and multi-leg splits ignored.
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal shape of a journal posting read off the JSONObject. */
interface JournalPostingLike {
  account: string;
  /** Decimal amount, usually a string from getLedgerJournal; Number() coerces. */
  units?: { number: string | number | null } | null;
}

/** Minimal shape of a journal entry we inspect for two-posting pairs. */
export interface JournalEntryLike {
  payee?: string | null;
  /** "Transaction" | "Balance" | "Open" | … */
  type?: string | null;
  postings?: JournalPostingLike[] | null;
}

export interface AccountPair {
  from: string;
  to: string;
}

/**
 * If `entry` is a two-posting transaction, return its FROM (negative-amount /
 * credit) and TO (positive-amount / debit) accounts. Otherwise null — covers
 * multi-leg splits (≠2 postings), non-transaction directives, and postings
 * whose amounts don't resolve to exactly one negative + one positive.
 */
export function extractTwoPostingPair(
  entry: JournalEntryLike,
): AccountPair | null {
  if (entry.type && entry.type !== "Transaction") {
    return null;
  }
  const postings = entry.postings ?? [];
  if (postings.length !== 2) {
    return null;
  }
  let from: string | null = null;
  let to: string | null = null;
  for (const posting of postings) {
    const amount = Number(posting.units?.number);
    if (!Number.isFinite(amount) || amount === 0) {
      return null;
    }
    if (amount < 0) {
      from = posting.account;
    } else {
      to = posting.account;
    }
  }
  if (!from || !to) {
    return null;
  }
  return { from, to };
}

/** Sort first-seen `order` by occurrence count in `counts`, descending. */
function rankByFrequency(
  counts: Map<string, number>,
  order: string[],
): string[] {
  return [...order].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
}

/** Payees that have at least one two-posting transaction, in first-seen order. */
export function twoPostingPayees(entries: JournalEntryLike[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    const payee = entry.payee?.trim();
    if (!payee || seen.has(payee)) {
      continue;
    }
    if (extractTwoPostingPair(entry)) {
      seen.add(payee);
      out.push(payee);
    }
  }
  return out;
}

/**
 * For one payee, the accounts seen across its two-posting transactions, split
 * into an auto-fill and chips per side. The auto-fill pair is the most common
 * (from, to) pair: ranking the sides separately filled a pair that never
 * occurred together, even the same account twice (a PayPal payee's top-ups
 * `Checking → PayPal` and purchases `PayPal → Shopping` filled
 * `PayPal → PayPal`) (w21/412). Ties go to the pair seen first. The chips are
 * the other accounts seen on each side, by frequency. Multi-leg transactions
 * and other payees are ignored.
 */
export function deriveTwoPostingSuggestions(
  entries: JournalEntryLike[],
  payee: string,
): { from: SideSuggestions; to: SideSuggestions } {
  // Every spelling the suggestion list merged into the row picked (w21/509,
  // w21/257): matched exactly, a newer "Whole  Foods", a decomposed "Café" or
  // "QA BEAN SHOP" history filled in nothing (w21/730).
  const target = merchantKey(payee);
  const fromCounts = new Map<string, number>();
  const toCounts = new Map<string, number>();
  // Per pair of accounts, either way round: a purchase and its later refund are
  // one pair, and the direction most used (the older one on a tie, the
  // purchase) fills it (w21/833).
  const pairCounts = new Map<
    string,
    { directions: Map<string, number>; oldest: AccountPair; count: number }
  >();
  const fromOrder: string[] = [];
  const toOrder: string[] = [];
  const bump = (
    counts: Map<string, number>,
    order: string[],
    account: string,
  ) => {
    if (!counts.has(account)) {
      order.push(account);
    }
    counts.set(account, (counts.get(account) ?? 0) + 1);
  };

  for (const entry of entries) {
    if (merchantKey(entry.payee ?? "") !== target) {
      continue;
    }
    const pair = extractTwoPostingPair(entry);
    if (!pair) {
      continue;
    }
    bump(fromCounts, fromOrder, pair.from);
    bump(toCounts, toOrder, pair.to);
    const key = [pair.from, pair.to].sort().join("\u0000");
    const direction = `${pair.from}\u0000${pair.to}`;
    const seen = pairCounts.get(key);
    if (seen) {
      seen.count += 1;
      seen.directions.set(direction, (seen.directions.get(direction) ?? 0) + 1);
      // Newest first, so the last one seen is the oldest.
      seen.oldest = pair;
    } else {
      pairCounts.set(key, {
        directions: new Map([[direction, 1]]),
        oldest: pair,
        count: 1,
      });
    }
  }

  // The most common pair that is a real transfer between two accounts, in the
  // direction it was used most.
  let best: AccountPair | null = null;
  let bestCount = 0;
  for (const { directions, oldest, count } of pairCounts.values()) {
    if (oldest.from === oldest.to || count <= bestCount) continue;
    const used = [...directions.entries()].map(([direction, n]) => ({
      direction,
      n,
    }));
    const top = Math.max(...used.map(({ n }) => n));
    const tied = used.filter(({ n }) => n === top);
    const oldestDirection = `${oldest.from}\u0000${oldest.to}`;
    const chosen = tied.length === 1 ? tied[0].direction : oldestDirection;
    const [from, to] = chosen.split("\u0000");
    best = { from, to };
    bestCount = count;
  }
  const ranked = (
    counts: Map<string, number>,
    order: string[],
    chosen: string | undefined,
  ) => {
    const rest = rankByFrequency(counts, order);
    return chosen === undefined
      ? rest
      : [chosen, ...rest.filter((account) => account !== chosen)];
  };

  return {
    from: buildSide(ranked(fromCounts, fromOrder, best?.from), "history"),
    to: buildSide(ranked(toCounts, toOrder, best?.to), "history"),
  };
}

/**
 * Build the single `TransactionToCategorizeInput` the LLM op expects from the
 * values already on the review screen. Narration is the best description we
 * have; fall back to the payee name when the user hasn't written one.
 */
export function buildLlmTransaction(input: {
  amount: string;
  date: string;
  payee: string;
  narration: string;
}): {
  amount: number;
  date: string;
  description: string;
  payee: string;
  rowIndex: number;
} {
  return {
    amount: parseFloat(input.amount) || 0,
    date: input.date,
    payee: input.payee,
    description: input.narration?.trim() || input.payee,
    rowIndex: 0,
  };
}
