import {
  buildLlmTransaction,
  classifyAccount,
  dedupeAccounts,
  deriveSuggestions,
  deriveTwoPostingSuggestions,
  extractTwoPostingPair,
  MAX_SUGGESTIONS,
  rankLlmSuggestions,
  splitAccountsBySide,
  twoPostingPayees,
  type AccountTypes,
  type CategorySuggestionLike,
  type JournalEntryLike,
} from "../suggestion-utils";

const TYPES: AccountTypes = {
  fromPrefixes: ["Assets", "Liabilities"],
  toPrefixes: ["Expenses"],
};

const llm = (
  targetAccount: string,
  confidence: number,
): CategorySuggestionLike => ({ targetAccount, confidence });

// ──────────────────────────────────────────────────────────────────────────────
// dedupeAccounts
// ──────────────────────────────────────────────────────────────────────────────

test("dedupeAccounts preserves first-seen order and drops duplicates", () => {
  expect(dedupeAccounts(["A", "B", "A", "C", "B"])).toEqual(["A", "B", "C"]);
});

test("dedupeAccounts drops empty/whitespace-only entries and trims", () => {
  expect(dedupeAccounts(["  A  ", "", "B", "   ", "A"])).toEqual(["A", "B"]);
});

// ──────────────────────────────────────────────────────────────────────────────
// classifyAccount + splitAccountsBySide
// ──────────────────────────────────────────────────────────────────────────────

test("classifyAccount routes Assets/Liabilities to 'from', Expenses to 'to'", () => {
  expect(classifyAccount("Assets:Cash", TYPES)).toBe("from");
  expect(classifyAccount("Liabilities:US:Chase:Slate", TYPES)).toBe("from");
  expect(classifyAccount("Expenses:Food:Coffee", TYPES)).toBe("to");
});

test("classifyAccount returns null for prefixes that are neither side", () => {
  expect(classifyAccount("Income:Salary", TYPES)).toBe(null);
  expect(classifyAccount("Equity:Opening", TYPES)).toBe(null);
});

test("splitAccountsBySide separates funding from destination, preserving order", () => {
  // The real-world Starbucks case: funding account first, then expenses.
  const split = splitAccountsBySide(
    [
      "Liabilities:US:Chase:Slate",
      "Expenses:Food:Coffee",
      "Expenses:Food:Restaurant",
    ],
    TYPES,
  );
  expect(split.from).toEqual(["Liabilities:US:Chase:Slate"]);
  expect(split.to).toEqual([
    "Expenses:Food:Coffee",
    "Expenses:Food:Restaurant",
  ]);
});

test("splitAccountsBySide drops accounts whose prefix is neither side", () => {
  const split = splitAccountsBySide(
    ["Assets:Cash", "Income:Salary", "Expenses:Food"],
    TYPES,
  );
  expect(split.from).toEqual(["Assets:Cash"]);
  expect(split.to).toEqual(["Expenses:Food"]);
});

// ──────────────────────────────────────────────────────────────────────────────
// rankLlmSuggestions
// ──────────────────────────────────────────────────────────────────────────────

test("rankLlmSuggestions sorts by confidence descending", () => {
  const ranked = rankLlmSuggestions([
    llm("A", 0.2),
    llm("B", 0.9),
    llm("C", 0.5),
  ]);
  expect(ranked.map((s) => s.account)).toEqual(["B", "C", "A"]);
  expect(ranked[0]).toEqual({ account: "B", source: "llm", confidence: 0.9 });
});

test("rankLlmSuggestions dedupes by account keeping the highest confidence", () => {
  const ranked = rankLlmSuggestions([
    llm("A", 0.2),
    llm("A", 0.8),
    llm("B", 0.4),
  ]);
  expect(ranked.map((s) => s.account)).toEqual(["A", "B"]);
  expect(ranked[0].confidence).toBe(0.8);
});

test("rankLlmSuggestions caps at MAX_SUGGESTIONS", () => {
  const many = Array.from({ length: MAX_SUGGESTIONS + 3 }, (_, i) =>
    llm(`Acc:${i}`, 1 - i * 0.01),
  );
  expect(rankLlmSuggestions(many).length).toBe(MAX_SUGGESTIONS);
});

test("rankLlmSuggestions skips empty target accounts", () => {
  const ranked = rankLlmSuggestions([llm("  ", 0.9), llm("A", 0.5)]);
  expect(ranked.map((s) => s.account)).toEqual(["A"]);
});

// ──────────────────────────────────────────────────────────────────────────────
// deriveSuggestions — empty / no payee
// ──────────────────────────────────────────────────────────────────────────────

const EMPTY_RESULT = {
  from: { autoFill: null, chips: [] },
  to: { autoFill: null, chips: [] },
  source: null,
  loading: false,
};

test("deriveSuggestions yields nothing when payee is empty", () => {
  expect(
    deriveSuggestions({
      payee: "",
      historyAccounts: ["Assets:Cash"],
      llmSuggestions: [llm("Expenses:A", 0.9)],
      accountTypes: TYPES,
      historyLoading: true,
      llmLoading: true,
    }),
  ).toEqual(EMPTY_RESULT);
});

// ──────────────────────────────────────────────────────────────────────────────
// deriveSuggestions — repeat payee (history) splits both sides
// ──────────────────────────────────────────────────────────────────────────────

test("repeat payee auto-fills FROM with the funding account and TO with the expense", () => {
  // Regression: previously the top account (Liabilities:…) was dumped into TO.
  const result = deriveSuggestions({
    payee: "Starbucks",
    historyAccounts: [
      "Liabilities:US:Chase:Slate",
      "Expenses:Food:Coffee",
      "Expenses:Food:Restaurant",
    ],
    llmSuggestions: [],
    accountTypes: TYPES,
    historyLoading: false,
    llmLoading: false,
  });
  expect(result.source).toBe("history");
  expect(result.from.autoFill).toBe("Liabilities:US:Chase:Slate");
  expect(result.from.chips).toEqual([]);
  expect(result.to.autoFill).toBe("Expenses:Food:Coffee");
  expect(result.to.chips).toEqual([
    { account: "Expenses:Food:Restaurant", source: "history" },
  ]);
});

test("repeat payee with multiple funding accounts chips the runner-up on FROM", () => {
  const result = deriveSuggestions({
    payee: "Starbucks",
    historyAccounts: [
      "Assets:Cash",
      "Liabilities:US:Chase:Slate",
      "Expenses:Food:Coffee",
    ],
    llmSuggestions: [],
    accountTypes: TYPES,
    historyLoading: false,
    llmLoading: false,
  });
  expect(result.from.autoFill).toBe("Assets:Cash");
  expect(result.from.chips).toEqual([
    { account: "Liabilities:US:Chase:Slate", source: "history" },
  ]);
  expect(result.to.autoFill).toBe("Expenses:Food:Coffee");
});

test("history with only a funding account fills FROM and leaves TO empty", () => {
  const result = deriveSuggestions({
    payee: "Starbucks",
    historyAccounts: ["Assets:Cash"],
    llmSuggestions: [],
    accountTypes: TYPES,
    historyLoading: false,
    llmLoading: false,
  });
  expect(result.from.autoFill).toBe("Assets:Cash");
  expect(result.to.autoFill).toBe(null);
  expect(result.to.chips).toEqual([]);
});

test("history takes precedence over LLM when both are present", () => {
  const result = deriveSuggestions({
    payee: "Starbucks",
    historyAccounts: ["Assets:Cash", "Expenses:Food:Coffee"],
    llmSuggestions: [llm("Expenses:AI", 0.99)],
    accountTypes: TYPES,
    historyLoading: false,
    llmLoading: false,
  });
  expect(result.source).toBe("history");
  expect(result.to.autoFill).toBe("Expenses:Food:Coffee");
});

test("each side caps chips at MAX_SUGGESTIONS - 1", () => {
  const accounts = [
    ...Array.from({ length: MAX_SUGGESTIONS + 2 }, (_, i) => `Assets:A${i}`),
    ...Array.from({ length: MAX_SUGGESTIONS + 2 }, (_, i) => `Expenses:E${i}`),
  ];
  const result = deriveSuggestions({
    payee: "Starbucks",
    historyAccounts: accounts,
    llmSuggestions: [],
    accountTypes: TYPES,
    historyLoading: false,
    llmLoading: false,
  });
  expect(result.from.chips.length).toBe(MAX_SUGGESTIONS - 1);
  expect(result.to.chips.length).toBe(MAX_SUGGESTIONS - 1);
});

// ──────────────────────────────────────────────────────────────────────────────
// deriveSuggestions — unseen payee (LLM fallback)
// ──────────────────────────────────────────────────────────────────────────────

test("unseen payee surfaces LLM chips on TO only and never auto-fills", () => {
  const result = deriveSuggestions({
    payee: "Brand New Cafe",
    historyAccounts: [],
    llmSuggestions: [llm("Expenses:Dining", 0.8), llm("Expenses:Fun", 0.4)],
    accountTypes: TYPES,
    historyLoading: false,
    llmLoading: false,
  });
  expect(result.source).toBe("llm");
  expect(result.from.autoFill).toBe(null);
  expect(result.from.chips).toEqual([]);
  expect(result.to.autoFill).toBe(null);
  expect(result.to.chips.map((c) => c.account)).toEqual([
    "Expenses:Dining",
    "Expenses:Fun",
  ]);
  expect(result.to.chips.every((c) => c.source === "llm")).toBe(true);
});

// ──────────────────────────────────────────────────────────────────────────────
// deriveSuggestions — loading / non-blocking behavior
// ──────────────────────────────────────────────────────────────────────────────

test("while history is loading, flags loading with nothing to show", () => {
  const result = deriveSuggestions({
    payee: "Starbucks",
    historyAccounts: [],
    llmSuggestions: [],
    accountTypes: TYPES,
    historyLoading: true,
    llmLoading: false,
  });
  expect(result.loading).toBe(true);
  expect(result.from).toEqual({ autoFill: null, chips: [] });
  expect(result.to).toEqual({ autoFill: null, chips: [] });
});

test("unseen payee with history resolved-empty flags loading while LLM in flight", () => {
  const result = deriveSuggestions({
    payee: "Brand New Cafe",
    historyAccounts: [],
    llmSuggestions: [],
    accountTypes: TYPES,
    historyLoading: false,
    llmLoading: true,
  });
  expect(result.loading).toBe(true);
});

test("unseen payee with both queries done and empty behaves exactly as today", () => {
  expect(
    deriveSuggestions({
      payee: "Brand New Cafe",
      historyAccounts: [],
      llmSuggestions: [],
      accountTypes: TYPES,
      historyLoading: false,
      llmLoading: false,
    }),
  ).toEqual(EMPTY_RESULT);
});

// ──────────────────────────────────────────────────────────────────────────────
// buildLlmTransaction
// ──────────────────────────────────────────────────────────────────────────────

test("buildLlmTransaction maps screen fields onto the LLM input shape", () => {
  expect(
    buildLlmTransaction({
      amount: "12.50",
      date: "2026-07-12",
      payee: "Starbucks",
      narration: "morning coffee",
    }),
  ).toEqual({
    amount: 12.5,
    date: "2026-07-12",
    payee: "Starbucks",
    description: "morning coffee",
    rowIndex: 0,
  });
});

test("buildLlmTransaction falls back to payee as description when narration is blank", () => {
  expect(
    buildLlmTransaction({
      amount: "10",
      date: "2026-07-12",
      payee: "Starbucks",
      narration: "   ",
    }).description,
  ).toBe("Starbucks");
});

test("buildLlmTransaction coerces a non-numeric amount to 0", () => {
  expect(
    buildLlmTransaction({
      amount: "not-a-number",
      date: "2026-07-12",
      payee: "Starbucks",
      narration: "",
    }).amount,
  ).toBe(0);
});

// ──────────────────────────────────────────────────────────────────────────────
// Two-posting (simple transaction) path — extractTwoPostingPair
// ──────────────────────────────────────────────────────────────────────────────

// Helper: build a journal-like entry from (account, signed-number) postings.
function txn(
  payee: string,
  postings: { account: string; n: number }[],
  type = "Transaction",
): JournalEntryLike {
  return {
    payee,
    type,
    postings: postings.map((p) => ({
      account: p.account,
      units: { number: p.n },
    })),
  };
}

test("extractTwoPostingPair returns from/to for a neg+pos two-posting txn", () => {
  expect(
    extractTwoPostingPair(
      txn("X", [
        { account: "Assets:Cash", n: -5 },
        { account: "Expenses:Coffee", n: 5 },
      ]),
    ),
  ).toEqual({ from: "Assets:Cash", to: "Expenses:Coffee" });
});

test("extractTwoPostingPair coerces decimal-string amounts", () => {
  const entry: JournalEntryLike = {
    payee: "X",
    type: "Transaction",
    postings: [
      { account: "A", units: { number: "-5.00" } },
      { account: "B", units: { number: "5.00" } },
    ],
  };
  expect(extractTwoPostingPair(entry)).toEqual({ from: "A", to: "B" });
});

test("extractTwoPostingPair returns null for non-two-posting entries", () => {
  // 3 postings (split)
  expect(
    extractTwoPostingPair(
      txn("X", [
        { account: "A", n: -5 },
        { account: "B", n: 3 },
        { account: "C", n: 2 },
      ]),
    ),
  ).toBe(null);
  // non-Transaction directive with 2 postings
  expect(
    extractTwoPostingPair(
      txn(
        "X",
        [
          { account: "A", n: -5 },
          { account: "B", n: 5 },
        ],
        "Balance",
      ),
    ),
  ).toBe(null);
  // no postings
  expect(extractTwoPostingPair(txn("X", []))).toBe(null);
});

test("extractTwoPostingPair returns null when amounts are zero/missing/same-sign", () => {
  expect(
    extractTwoPostingPair(
      txn("X", [
        { account: "A", n: 0 },
        { account: "B", n: 5 },
      ]),
    ),
  ).toBe(null);
  expect(
    extractTwoPostingPair({
      payee: "X",
      type: "Transaction",
      postings: [
        { account: "A", units: null },
        { account: "B", units: { number: 5 } },
      ],
    }),
  ).toBe(null);
  // both negative — no destination
  expect(
    extractTwoPostingPair(
      txn("X", [
        { account: "A", n: -5 },
        { account: "B", n: -5 },
      ]),
    ),
  ).toBe(null);
});

// ──────────────────────────────────────────────────────────────────────────────
// twoPostingPayees
// ──────────────────────────────────────────────────────────────────────────────

test("twoPostingPayees lists payees with a two-posting txn, skipping split-only payees", () => {
  const entries = [
    txn("Simple", [
      { account: "A", n: -5 },
      { account: "B", n: 5 },
    ]),
    txn("Split", [
      { account: "A", n: -5 },
      { account: "B", n: 3 },
      { account: "C", n: 2 },
    ]),
    txn("Also", [
      { account: "A", n: -1 },
      { account: "D", n: 1 },
    ]),
  ];
  expect(twoPostingPayees(entries)).toEqual(["Simple", "Also"]);
});

test("twoPostingPayees dedupes payees", () => {
  const entries = [
    txn("Simple", [
      { account: "A", n: -5 },
      { account: "B", n: 5 },
    ]),
    txn("Simple", [
      { account: "A", n: -5 },
      { account: "C", n: 5 },
    ]),
  ];
  expect(twoPostingPayees(entries)).toEqual(["Simple"]);
});

// ──────────────────────────────────────────────────────────────────────────────
// deriveTwoPostingSuggestions
// ──────────────────────────────────────────────────────────────────────────────

test("deriveTwoPostingSuggestions auto-fills the most frequent FROM/TO and chips the rest", () => {
  const entries = [
    txn("Starbucks", [
      { account: "Assets:Cash", n: -5 },
      { account: "Expenses:Coffee", n: 5 },
    ]),
    txn("Starbucks", [
      { account: "Liabilities:Card", n: -5 },
      { account: "Expenses:Coffee", n: 5 },
    ]),
    txn("Starbucks", [
      { account: "Assets:Cash", n: -5 },
      { account: "Expenses:Restaurant", n: 5 },
    ]),
    // other payee + a Starbucks split — both must be ignored
    txn("Other", [
      { account: "A", n: -5 },
      { account: "B", n: 5 },
    ]),
    txn("Starbucks", [
      { account: "A", n: -5 },
      { account: "B", n: 3 },
      { account: "C", n: 2 },
    ]),
  ];
  const result = deriveTwoPostingSuggestions(entries, "Starbucks");
  // FROM: Cash (2), Card (1) → Cash auto-fills, Card is the chip
  expect(result.from.autoFill).toBe("Assets:Cash");
  expect(result.from.chips).toEqual([
    { account: "Liabilities:Card", source: "history" },
  ]);
  // TO: Coffee (2), Restaurant (1) → Coffee auto-fills, Restaurant is the chip
  expect(result.to.autoFill).toBe("Expenses:Coffee");
  expect(result.to.chips).toEqual([
    { account: "Expenses:Restaurant", source: "history" },
  ]);
});

test("deriveTwoPostingSuggestions ignores entries for other payees", () => {
  const entries = [
    txn("Starbucks", [
      { account: "A", n: -5 },
      { account: "B", n: 5 },
    ]),
    txn("Other", [
      { account: "C", n: -5 },
      { account: "D", n: 5 },
    ]),
  ];
  const result = deriveTwoPostingSuggestions(entries, "Starbucks");
  expect(result.from.autoFill).toBe("A");
  expect(result.to.autoFill).toBe("B");
  expect(result.from.chips).toEqual([]);
  expect(result.to.chips).toEqual([]);
});

test("deriveTwoPostingSuggestions caps chips at MAX_SUGGESTIONS - 1", () => {
  const froms = Array.from(
    { length: MAX_SUGGESTIONS + 2 },
    (_, i) => `Assets:F${i}`,
  );
  const entries = froms.map((f) =>
    txn("P", [
      { account: f, n: -1 },
      { account: "Expenses:T", n: 1 },
    ]),
  );
  const result = deriveTwoPostingSuggestions(entries, "P");
  expect(result.from.chips.length).toBe(MAX_SUGGESTIONS - 1);
});

test("deriveTwoPostingSuggestions yields empty sides when the payee has no two-posting txns", () => {
  const entries = [
    txn("P", [
      { account: "A", n: -5 },
      { account: "B", n: 3 },
      { account: "C", n: 2 },
    ]),
  ];
  const result = deriveTwoPostingSuggestions(entries, "P");
  expect(result.from.autoFill).toBe(null);
  expect(result.to.autoFill).toBe(null);
  expect(result.from.chips).toEqual([]);
  expect(result.to.chips).toEqual([]);
});
