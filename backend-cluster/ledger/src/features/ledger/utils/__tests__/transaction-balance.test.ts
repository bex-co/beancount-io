import {
  checkTransactionBalance,
  scanInferredToleranceDefault,
  DEFAULT_INFERRED_TOLERANCE,
} from "@/features/ledger/utils/transaction-balance";
import { entryInputToText } from "@/foundation/rustledger/entry-build";

const usd = (number: string) => ({ number, currency: "USD" });
const posting = (account: string, number?: string) => ({
  account,
  ...(number === undefined ? {} : { units: usd(number) }),
});

describe("checkTransactionBalance", () => {
  it("accepts a balanced transaction", () => {
    expect(
      checkTransactionBalance([
        posting("Expenses:Food", "10.00"),
        posting("Assets:Cash", "-10.00"),
      ]),
    ).toEqual({ ok: true, value: { residuals: [] } });
  });

  it("refuses a residual outside tolerance and names it", () => {
    const check = checkTransactionBalance([
      posting("Expenses:Food", "10"),
      posting("Assets:Cash", "-5"),
    ]);
    expect(check.ok).toBe(false);
    if (!check.ok && check.value.kind === "unbalanced") {
      expect(check.value.message).toBe(
        "Transaction does not balance: residual 5 USD",
      );
      expect(check.value.residuals).toEqual(["5 USD"]);
    } else {
      throw new Error("expected an unbalanced failure");
    }
  });

  it("keeps the residual precision of the postings", () => {
    const check = checkTransactionBalance([
      posting("Expenses:Food", "10.00"),
      posting("Assets:Cash", "-5.00"),
    ]);
    if (!check.ok && check.value.kind === "unbalanced") {
      expect(check.value.residuals).toEqual(["5.00 USD"]);
    } else {
      throw new Error("expected an unbalanced failure");
    }
  });

  it("tolerates dust within the inferred half-unit", () => {
    // 100.00 implies 0.005; a 0.004 residual passes.
    expect(
      checkTransactionBalance([
        posting("Expenses:Food", "100.00"),
        posting("Assets:Cash", "-99.996"),
      ]).ok,
    ).toBe(true);
  });

  it(" floors tolerance at inferred_tolerance_default", () => {
    // High-precision numbers imply a tiny tolerance, but the 0.005 default
    // still covers a 0.004 residual.
    expect(
      checkTransactionBalance([
        posting("Expenses:Food", "100.0000"),
        posting("Assets:Cash", "-99.9960"),
      ]).ok,
    ).toBe(true);
  });

  it("honours a custom inferred_tolerance_default", () => {
    const postings = [
      posting("Expenses:Food", "100.0000"),
      posting("Assets:Cash", "-99.9900"),
    ];
    expect(checkTransactionBalance(postings, "0.005").ok).toBe(false);
    expect(checkTransactionBalance(postings, "0.02").ok).toBe(true);
  });

  it("rejects two or more elided postings", () => {
    const check = checkTransactionBalance([
      posting("Expenses:Food"),
      posting("Assets:Cash"),
    ]);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.value.kind).toBe("elided-count");
  });

  it("interpolates one elided posting for the check", () => {
    expect(
      checkTransactionBalance([
        posting("Expenses:Food", "10.00"),
        posting("Assets:Cash"),
      ]),
    ).toEqual({ ok: true, value: { residuals: [] } });
  });

  it("refuses an elided posting across multiple currencies", () => {
    const check = checkTransactionBalance([
      posting("Expenses:Food", "10.00"),
      { account: "Assets:Cash", units: { number: "-5.00", currency: "EUR" } },
      posting("Equity:Open"),
    ]);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.value.kind).toBe("uninterpolatable");
  });

  it("computes multi-currency residuals exactly", () => {
    const check = checkTransactionBalance([
      posting("Expenses:Food", "0.1"),
      posting("Expenses:Food", "0.2"),
      posting("Assets:Cash", "-0.3"),
    ]);
    // 0.1 + 0.2 - 0.3 is exactly zero in decimal math — no float dust.
    expect(check).toEqual({ ok: true, value: { residuals: [] } });
  });
});

describe("scanInferredToleranceDefault", () => {
  it("finds the option override", () => {
    expect(
      scanInferredToleranceDefault([
        '2020-01-01 open Assets:Cash USD\n\noption "inferred_tolerance_default" "0.02"\n',
      ]),
    ).toBe("0.02");
  });

  it("falls back to Beancount's default", () => {
    expect(scanInferredToleranceDefault(["2020-01-01 open Assets:Cash USD\n"])).toBe(
      DEFAULT_INFERRED_TOLERANCE,
    );
    expect(scanInferredToleranceDefault([])).toBe(DEFAULT_INFERRED_TOLERANCE);
  });
});

describe("entryInputToText with an elided posting", () => {
  it("renders the posting without an amount", () => {
    const text = entryInputToText({
      type: "transaction",
      entry: {
        date: "2026-09-01",
        flag: "*",
        narration: "Food",
        postings: [
          { account: "Expenses:Food", units: { number: "10.00", currency: "USD" } },
          { account: "Assets:Cash" },
        ],
      },
    });
    expect(text).toContain("Expenses:Food");
    expect(text).toContain("Assets:Cash");
    expect(text).not.toMatch(/Assets:Cash\s+\S/);
  });
});
