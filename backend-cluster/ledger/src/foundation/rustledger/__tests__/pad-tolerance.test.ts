import type { DirectiveJson } from "@rustledger/wasm";
import { dropPaddingWithinTolerance } from "../pad-tolerance";

/**
 * w21/135: rustledger padded a 2.00 gap that a `~ 5.00` balance already
 * accepts, so Assets:Cash read its asserted 100 instead of 98, and the
 * "Unused Pad entry" Beancount reports never appeared.
 */
const SOURCE = `2020-01-01 open Assets:Cash USD
2026-01-31 pad Assets:Cash Equity:Opening-Balances
2026-02-01 balance Assets:Cash 100.00 ~ 5.00 USD
`;
const pad: DirectiveJson = {
  type: "pad",
  date: "2026-01-31",
  account: "Assets:Cash",
  source_account: "Equity:Opening-Balances",
};
const balance = (number: string, tolerance?: string): DirectiveJson => ({
  type: "balance",
  date: "2026-02-01",
  account: "Assets:Cash",
  amount: { number, currency: "USD" },
  ...(tolerance ? { tolerance } : {}),
});
const padding = (difference: string): DirectiveJson => ({
  type: "transaction",
  date: "2026-01-31",
  flag: "P",
  narration: `(Padding inserted for Balance of 100.00 USD for difference ${difference} USD)`,
  tags: [],
  links: [],
  postings: [
    { account: "Assets:Cash", units: { number: difference, currency: "USD" } },
    {
      account: "Equity:Opening-Balances",
      units: { number: `-${difference}`, currency: "USD" },
    },
  ],
});
const files = { "main.bean": SOURCE };

describe("dropPaddingWithinTolerance", () => {
  it("drops padding inside an explicit tolerance and reports the pad unused", () => {
    const result = dropPaddingWithinTolerance(
      [pad, balance("100.00", "5.00")],
      [padding("2.00")],
      files,
    );
    expect(result.paddingTransactions).toEqual([]);
    expect(result.errors).toEqual([
      {
        message: "Unused Pad entry",
        code: "E2003",
        phase: "validate",
        hint: null,
        file: "main.bean",
        line: 2,
        column: 1,
        end_line: null,
        end_column: null,
        severity: "error",
      },
    ]);
  });

  // w31/107: the engine dates `2026/01/31` and `2026-1-31` as `2026-01-31`.
  it.each(["2026/01/31", "2026-1-31"])(
    "puts the unused pad on its line when it is dated %s",
    (date) => {
      const written = { "main.bean": SOURCE.replace("2026-01-31", date) };
      const result = dropPaddingWithinTolerance(
        [pad, balance("100.00", "5.00")],
        [padding("2.00")],
        written,
      );
      expect(result.errors.map((e) => [e.file, e.line])).toEqual([
        ["main.bean", 2],
      ]);
    },
  );

  it("keeps padding beyond the tolerance", () => {
    const kept = padding("10.00");
    expect(
      dropPaddingWithinTolerance(
        [pad, balance("100.00", "5.00")],
        [kept],
        files,
      ),
    ).toEqual({ paddingTransactions: [kept], errors: [] });
  });

  it("infers the tolerance from the asserted amount's last place", () => {
    // 100.00 tolerates 0.01: a 0.005 gap is not padded, a 0.02 one is.
    expect(
      dropPaddingWithinTolerance(
        [pad, balance("100.00")],
        [padding("0.005")],
        files,
      ).paddingTransactions,
    ).toEqual([]);
    const kept = padding("0.02");
    expect(
      dropPaddingWithinTolerance([pad, balance("100.00")], [kept], files)
        .paddingTransactions,
    ).toEqual([kept]);
    // A whole-number assertion tolerates nothing.
    const whole = padding("0.5");
    expect(
      dropPaddingWithinTolerance([pad, balance("100")], [whole], files)
        .paddingTransactions,
    ).toEqual([whole]);
  });
});
