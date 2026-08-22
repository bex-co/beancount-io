import BigNumber from "bignumber.js";
import type { DirectiveJson } from "@rustledger/wasm";
import { clampDirectives, parseDateRange } from "../index";
import golden from "./time-clamp.golden.json";

/**
 * Golden-parity tests for {@link clampDirectives} — a port of beancount's
 * `summarize.clamp_opt` (which Fava's `TimeFilter.apply` runs).
 *
 * `time-clamp.golden.json` was produced by running the REAL beancount 3.2.0
 * `summarize.clamp_opt` (from the in-repo `beancount-ledger/.venv`) over three
 * representative source ledgers — a single-currency ledger (`nocost`), a
 * held-at-cost portfolio (`cost`), and a multi-currency ledger whose `@ price`
 * postings trigger a synthesized `Conversion` entry (`mc`) — for several `time`
 * filters. For each ledger it stores:
 *   - `directives`: the exact `DirectiveJson[]` the real `@rustledger/wasm`
 *     engine emits for that source (the input to `clampDirectives`).
 *   - `clamp[time]`: the Python `clamp_opt` output, normalized to the same
 *     posting shape `clampDirectives` produces (account/units/cost/price),
 *     numbers canonicalized, as an order-independent MULTISET of directives.
 *
 * We compare as a multiset because the downstream balance-summing reports are
 * order-independent within a date (see `time-clamp.ts`); the SET of synthetic
 * postings + their dates is what must match byte-exactly.
 *
 * ── DOCUMENTED RESIDUAL GAP ──────────────────────────────────────────────────
 * The synthetic `Conversion` entry's `narration` is NOT reproduced byte-exact
 * (beancount renders it from `Inventory.__str__`, a currency-ordered display
 * with per-commodity precision). It is cosmetic — it never affects a balance-
 * summing report — so the golden and this test compare the conversion entry's
 * POSTINGS (which ARE byte-exact) and ignore its narration.
 */

interface NormPosting {
  account: string;
  units?: { number: string; currency: string };
  cost?: { number: string; currency: string; date?: string; label?: string };
  price?: { number: string; currency: string };
}
type NormEntry = Record<string, unknown>;

const canon = (value: string): string => new BigNumber(value).toFixed();

function normalizePosting(posting: {
  account: string;
  units?: { number: string; currency: string };
  cost?: {
    number?: { kind: string; value?: string; per_unit?: string };
    currency?: string;
    date?: string;
    label?: string;
  };
  price?: { number: string; currency: string };
}): NormPosting {
  const out: NormPosting = { account: posting.account };
  if (posting.units) {
    out.units = {
      number: canon(posting.units.number),
      currency: posting.units.currency,
    };
  }
  if (posting.cost && posting.cost.number) {
    const cn = posting.cost.number;
    const value = cn.kind === "per_unit" ? cn.value : cn.per_unit;
    out.cost = {
      number: canon(value as string),
      currency: posting.cost.currency as string,
      ...(posting.cost.date ? { date: posting.cost.date } : {}),
      ...(posting.cost.label ? { label: posting.cost.label } : {}),
    };
  }
  if (posting.price) {
    out.price = {
      number: canon(posting.price.number),
      currency: posting.price.currency,
    };
  }
  return out;
}

/** Normalize a clamped `DirectiveJson` to the golden's shape (no narration). */
function normalizeEntry(entry: DirectiveJson): NormEntry {
  const type = entry.type[0].toUpperCase() + entry.type.slice(1);
  const base: NormEntry = { type, date: entry.date };
  if (entry.type === "transaction") {
    base.flag = entry.flag;
    base.postings = entry.postings
      .map((posting) => normalizePosting(posting))
      .sort((a, b) => (keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0));
  } else if (
    entry.type === "open" ||
    entry.type === "close" ||
    entry.type === "balance"
  ) {
    base.account = entry.account;
  } else if (entry.type === "price") {
    base.currency = entry.currency;
    base.amount = {
      number: canon(entry.amount.number),
      currency: entry.amount.currency,
    };
  }
  return base;
}

function keyOf(posting: NormPosting): string {
  return `${posting.account}|${posting.units?.currency ?? ""}`;
}

/** Normalize the golden entry the same way (it already omits narration). */
function normalizeGolden(entry: NormEntry): NormEntry {
  const out: NormEntry = { ...entry };
  if (entry.type === "Transaction") {
    const postings = (entry.postings as NormPosting[]).map((p) => ({
      account: p.account,
      ...(p.units
        ? {
            units: {
              number: canon(p.units.number),
              currency: p.units.currency,
            },
          }
        : {}),
      ...(p.cost ? { cost: { ...p.cost, number: canon(p.cost.number) } } : {}),
      ...(p.price
        ? {
            price: {
              number: canon(p.price.number),
              currency: p.price.currency,
            },
          }
        : {}),
    }));
    out.postings = postings.sort((a, b) =>
      keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0,
    );
  }
  return out;
}

/** A multiset of directives, order-independent, as a sorted list of JSON strings. */
function multiset(entries: NormEntry[]): string[] {
  return entries
    .map((entry) => JSON.stringify(entry, Object.keys(entry).sort()))
    .sort();
}

const FIXTURE = golden as unknown as Record<
  string,
  { directives: DirectiveJson[]; clamp: Record<string, NormEntry[]> }
>;

describe("clampDirectives — beancount summarize.clamp_opt parity", () => {
  for (const [ledgerName, data] of Object.entries(FIXTURE)) {
    describe(`ledger: ${ledgerName}`, () => {
      for (const [time, expected] of Object.entries(data.clamp)) {
        it(`time="${time}" matches Python clamp_opt (as a directive multiset)`, () => {
          const range = parseDateRange(time);
          expect(range).toBeDefined();
          const clamped = clampDirectives(
            data.directives,
            range!.begin,
            range!.end,
          );
          const got = multiset(clamped.map(normalizeEntry));
          const want = multiset(expected.map(normalizeGolden));
          expect(got).toEqual(want);
        });
      }
    });
  }

  describe("total-cost kind (beancount CostSpec abs semantics)", () => {
    it("books a NEGATIVE-unit total cost at per-unit total/abs(units) in the opening balance", () => {
      // -10 HOOL {{1000.00 USD}} pre-period: compute_cost_number books
      // per-unit = 1000.00 / abs(-10) = 100, so the summarized opening
      // position is -10 HOOL {100 USD} with a +1000 USD balancing leg
      // (get_cost = -10 × 100 = -1000, negated). Signed division would flip
      // both signs.
      const directives: DirectiveJson[] = [
        {
          type: "transaction",
          date: "2024-01-10",
          flag: "*",
          narration: "Short sale",
          tags: [],
          links: [],
          postings: [
            {
              account: "Assets:Broker",
              units: { number: "-10", currency: "HOOL" },
              cost: {
                number: { kind: "total", value: "1000.00" },
                currency: "USD",
                date: "2024-01-10",
              },
            },
            {
              account: "Assets:Checking",
              units: { number: "1000.00", currency: "USD" },
            },
          ],
        } as DirectiveJson,
      ];
      const clamped = clampDirectives(directives, "2024-02-01", "2024-03-01");
      const opening = clamped.find(
        (entry) =>
          entry.type === "transaction" &&
          (entry.narration ?? "").includes("Assets:Broker"),
      );
      expect(opening).toBeDefined();
      if (opening?.type !== "transaction")
        throw new Error("expected transaction");
      expect(opening.date).toBe("2024-01-31");
      expect(opening.postings[0]).toEqual({
        account: "Assets:Broker",
        units: { number: "-10", currency: "HOOL" },
        cost: {
          number: { kind: "per_unit", value: "100.00" },
          currency: "USD",
          date: "2024-01-10",
        },
      });
      expect(opening.postings[1]).toEqual({
        account: "Equity:Opening-Balances",
        units: { number: "1000.00", currency: "USD" },
      });
    });
  });

  it("preserves Python Decimal scale in synthetic opening postings", () => {
    const directives: DirectiveJson[] = [
      {
        type: "transaction",
        date: "2024-01-10",
        flag: "*",
        narration: "Scaled lot",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Broker",
            units: { number: "2.0", currency: "HOOL" },
            cost: {
              number: { kind: "per_unit", value: "100.00" },
              currency: "USD",
            },
          },
          {
            account: "Assets:Cash",
            units: { number: "-200.000", currency: "USD" },
          },
        ],
      },
    ];

    const clamped = clampDirectives(directives, "2024-02-01", "2024-03-01");
    const opening = clamped.find(
      (entry) =>
        entry.type === "transaction" &&
        (entry.narration ?? "").includes("Assets:Broker"),
    );
    expect(opening).toMatchObject({
      type: "transaction",
      postings: [
        {
          account: "Assets:Broker",
          units: { number: "2.0", currency: "HOOL" },
          cost: {
            number: { kind: "per_unit", value: "100.00" },
            currency: "USD",
          },
        },
        {
          account: "Equity:Opening-Balances",
          units: { number: "-200.000", currency: "USD" },
        },
      ],
    });
  });

  it("does not leave phantom income balances when transferring cost lots", () => {
    const directives: DirectiveJson[] = [
      {
        type: "transaction",
        date: "2024-01-10",
        flag: "*",
        narration: "costed expense",
        tags: [],
        links: [],
        postings: [
          {
            account: "Expenses:Trading",
            units: { number: "2", currency: "HOOL" },
            cost: {
              number: { kind: "per_unit", value: "10" },
              currency: "USD",
            },
          },
          {
            account: "Assets:Cash",
            units: { number: "-20", currency: "USD" },
          },
        ],
      },
    ];
    const clamped = clampDirectives(directives, "2024-02-01", "2024-03-01");
    // transferBalances runs before summarizeBefore, so its T transaction is
    // intentionally collapsed into the opening snapshot. The observable
    // invariant is that the transferred income account has no residual S
    // transaction in either its lot currency or its cost currency.
    expect(
      clamped.some(
        (entry) =>
          entry.type === "transaction" &&
          entry.flag === "S" &&
          (entry.narration ?? "").includes("Expenses:Trading"),
      ),
    ).toBe(false);
  });
});

describe("clampDirectives — structural invariants", () => {
  const data = FIXTURE.nocost;

  it("preserves Open directives for accounts active before the window", () => {
    const range = parseDateRange("2023")!;
    const clamped = clampDirectives(data.directives, range.begin, range.end);
    const opens = clamped.filter((entry) => entry.type === "open");
    // Every Open in the source predates 2023, so all survive.
    const sourceOpens = data.directives.filter(
      (entry) => entry.type === "open",
    );
    expect(opens).toHaveLength(sourceOpens.length);
  });

  it("truncates entries on or after the window end", () => {
    const range = parseDateRange("2023")!;
    const clamped = clampDirectives(data.directives, range.begin, range.end);
    expect(clamped.every((entry) => entry.date < range.end)).toBe(true);
  });

  it("synthesizes an Equity:Opening-Balances summarization for prior activity", () => {
    const range = parseDateRange("2023")!;
    const clamped = clampDirectives(data.directives, range.begin, range.end);
    const opening = clamped.filter(
      (entry) =>
        entry.type === "transaction" &&
        entry.flag === "S" &&
        entry.postings.some((p) => p.account === "Equity:Opening-Balances"),
    );
    expect(opening.length).toBeGreaterThan(0);
    // All summarization entries are dated the day before the window begin.
    expect(opening.every((entry) => entry.date === "2022-12-31")).toBe(true);
  });

  it("preserves a pre-100 year on synthetic opening-balance dates", () => {
    const directives: DirectiveJson[] = [
      {
        type: "open",
        date: "0098-01-01",
        account: "Assets:Cash",
        currencies: ["USD"],
      },
      {
        type: "transaction",
        date: "0098-12-01",
        flag: "*",
        narration: "Seed",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Cash",
            units: { number: "1", currency: "USD" },
          },
          {
            account: "Equity:Opening",
            units: { number: "-1", currency: "USD" },
          },
        ],
      },
    ];
    const clamped = clampDirectives(directives, "0099-01-01", "0100-01-01");
    expect(
      clamped.some(
        (directive) =>
          directive.type === "transaction" &&
          directive.flag === "S" &&
          directive.date === "0098-12-31",
      ),
    ).toBe(true);
  });

  it("transfers prior income/expenses into Equity:Earnings:Previous", () => {
    const range = parseDateRange("2023")!;
    const clamped = clampDirectives(data.directives, range.begin, range.end);
    const touchesEarnings = clamped.some(
      (entry) =>
        entry.type === "transaction" &&
        entry.postings.some((p) => p.account === "Equity:Earnings:Previous"),
    );
    expect(touchesEarnings).toBe(true);
  });

  it("sorts retained pre-window prices chronologically for journal output", () => {
    const directives: DirectiveJson[] = [
      {
        type: "price",
        date: "2023-01-01",
        currency: "AAA",
        amount: { number: "1", currency: "USD" },
      },
      {
        type: "price",
        date: "2023-02-01",
        currency: "BBB",
        amount: { number: "2", currency: "USD" },
      },
      {
        type: "price",
        date: "2023-03-01",
        currency: "AAA",
        amount: { number: "3", currency: "USD" },
      },
    ];

    const clamped = clampDirectives(directives, "2024-01-01", "2025-01-01");
    expect(
      clamped
        .filter((directive) => directive.type === "price")
        .map((directive) => [directive.date, directive.currency]),
    ).toEqual([
      ["2023-02-01", "BBB"],
      ["2023-03-01", "AAA"],
    ]);
  });

  it("is a no-op-shaped identity when the window covers all history", () => {
    // A window strictly after all entries keeps only opening synthetics (no
    // in-period txns) — every original transaction is summarized away.
    const range = parseDateRange("2024")!;
    const clamped = clampDirectives(data.directives, range.begin, range.end);
    const inPeriodTxns = clamped.filter(
      (entry) => entry.type === "transaction" && entry.date >= range.begin,
    );
    // 2024 has 3 real transactions in the source.
    expect(inPeriodTxns.length).toBe(3);
  });
});
