import {
  hasEditableSource,
  selectHeroAmount,
  selectPostingRows,
  selectTransactionTitle,
} from "../select-transaction-detail";
import { DirectiveType } from "../../../transactions-screen/types";
import type {
  JournalPosting,
  JournalTransaction,
} from "../../../transactions-screen/types";

function posting(
  account: string,
  number: string,
  currency = "USD",
): JournalPosting {
  return { account, units: { number, currency } };
}

function txn(
  postings: JournalPosting[],
  extra: Partial<JournalTransaction> = {},
): JournalTransaction {
  return {
    entry_hash: "h",
    date: "2026-07-06",
    directive_type: DirectiveType.TRANSACTION,
    flag: "*",
    payee: "Blue Bottle",
    narration: "morning latte",
    tags: [],
    links: [],
    postings,
    ...extra,
  };
}

describe("selectHeroAmount", () => {
  it("nets cash postings for an expense (unsigned, not positive)", () => {
    const hero = selectHeroAmount(
      txn([
        posting("Expenses:Food:Coffee", "4.50"),
        posting("Assets:Checking", "-4.50"),
      ]),
    );
    expect(hero.text).toBe("$4.50");
    expect(hero.isPositive).toBe(false);
  });

  it("marks cash inflows with a plus sign", () => {
    const hero = selectHeroAmount(
      txn([
        posting("Assets:Checking", "900.00"),
        posting("Income:Salary", "-900.00"),
      ]),
    );
    expect(hero.text).toBe("+$900.00");
    expect(hero.isPositive).toBe(true);
  });

  it("falls back to the largest posting when no cash accounts exist", () => {
    const hero = selectHeroAmount(
      txn([
        posting("Expenses:Food", "30.00"),
        posting("Income:Gifts", "-30.00"),
      ]),
    );
    expect(hero.text).toBe("+$30.00");
    expect(hero.isPositive).toBe(true);
  });

  it("formats non-USD currencies with a suffix", () => {
    const hero = selectHeroAmount(
      txn([
        posting("Expenses:Travel", "90.00", "EUR"),
        posting("Assets:Cash", "-90.00", "EUR"),
      ]),
    );
    expect(hero.text).toBe("90.00 EUR");
  });

  it("returns empty for a transaction without postings", () => {
    expect(selectHeroAmount(txn([]))).toEqual({ text: "", isPositive: null });
  });

  it("reports the cash leg of a commodity purchase, not a mixed sum", () => {
    const hero = selectHeroAmount(
      txn([
        {
          account: "Assets:Vanguard:RGAGX",
          units: { number: "355.63", currency: "RGAGX" },
          cost: { number: "8.93", currency: "USD", date: "2026-07-06" },
        },
        posting("Assets:Vanguard:Cash", "-3177.39"),
      ]),
    );
    expect(hero).toEqual({ text: "$3,177.39", isPositive: false });
  });
});

describe("selectPostingRows", () => {
  it("signs and formats each posting amount", () => {
    const rows = selectPostingRows(
      txn([
        posting("Expenses:Food:Coffee", "4.50"),
        posting("Assets:Checking", "-4.50"),
      ]),
    );
    expect(rows).toEqual([
      { account: "Expenses:Food:Coffee", amount: "+$4.50", sign: 1 },
      { account: "Assets:Checking", amount: "-$4.50", sign: -1 },
    ]);
  });

  it("groups thousands and keeps two decimals", () => {
    const [row] = selectPostingRows(txn([posting("Assets:Broker", "1234.5")]));
    expect(row.amount).toBe("+$1,234.50");
  });

  it("preserves recorded commodity precision from the API string", () => {
    const rows = selectPostingRows(
      txn([
        posting("Assets:US:Vanguard:RGAGX", "1.843", "RGAGX"),
        posting("Assets:US:Vanguard:Cash", "-150.02"),
      ]),
    );
    expect(rows).toEqual([
      {
        account: "Assets:US:Vanguard:RGAGX",
        amount: "+1.843 RGAGX",
        sign: 1,
      },
      {
        account: "Assets:US:Vanguard:Cash",
        amount: "-$150.02",
        sign: -1,
      },
    ]);
  });

  it("keeps tiny nonzero quantities and long decimals", () => {
    expect(
      selectPostingRows(txn([posting("Assets:Dust", "0.0001", "XYZ")]))[0],
    ).toEqual({
      account: "Assets:Dust",
      amount: "+0.0001 XYZ",
      sign: 1,
    });
    expect(
      selectPostingRows(
        txn([posting("Assets:Precise", "1.23456789", "ABC")]),
      )[0].amount,
    ).toBe("+1.23456789 ABC");
  });

  it("formats zero without a sign prefix", () => {
    expect(
      selectPostingRows(txn([posting("Assets:Zero", "0.00")]))[0],
    ).toEqual({
      account: "Assets:Zero",
      amount: "$0.00",
      sign: 0,
    });
  });

  it("passes unparseable amounts through verbatim", () => {
    const [row] = selectPostingRows(txn([posting("Assets:X", "abc")]));
    expect(row).toEqual({ account: "Assets:X", amount: "abc USD", sign: 0 });
  });
});

describe("selectTransactionTitle", () => {
  it("prefers payee, then narration, then empty", () => {
    expect(selectTransactionTitle(txn([]))).toBe("Blue Bottle");
    expect(selectTransactionTitle(txn([], { payee: null }))).toBe(
      "morning latte",
    );
    expect(
      selectTransactionTitle(txn([], { payee: null, narration: null })),
    ).toBe("");
  });
});

describe("hasEditableSource", () => {
  it("allows ordinary cleared, pending, and custom-flagged transactions", () => {
    expect(hasEditableSource(txn([], { flag: "*" }))).toBe(true);
    expect(hasEditableSource(txn([], { flag: "!" }))).toBe(true);
    expect(hasEditableSource(txn([], { flag: "?" }))).toBe(true);
  });

  it("rejects Beancount-generated transaction flags", () => {
    for (const flag of ["P", "S", "T", "C", "U", "R", "M"]) {
      expect(hasEditableSource(txn([], { flag }))).toBe(false);
    }
  });
});
