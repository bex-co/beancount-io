import fs from "fs";
import { isolateLtr } from "../../../../common/bidi";
import path from "path";
import {
  mayBeGenerated,
  postingBasisText,
  selectHeroAmount as selectHeroAmountWithLabel,
  selectPostingRows,
  userMetadataLines,
  selectEntrySource,
  selectTransactionMenuActions,
  selectTransactionSubtitle,
  selectTransactionTitle,
} from "../select-transaction-detail";
import { DirectiveType } from "../../../transactions-screen/types";
import { en } from "../../../../translations/en";
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

const MIXED = "Multiple postings";

const selectHeroAmount = (t: JournalTransaction) =>
  selectHeroAmountWithLabel(t, MIXED);

describe("selectHeroAmount", () => {
  it("nets cash postings for an expense (signed out, not positive)", () => {
    const hero = selectHeroAmount(
      txn([
        posting("Expenses:Food:Coffee", "4.50"),
        posting("Assets:Checking", "-4.50"),
      ]),
    );
    expect(hero.text).toBe("-$4.50");
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

  it("shows the largest posting unsigned and neutral when no cash accounts exist", () => {
    // Income → Expenses has no in/out direction; it used to read "+" in green
    // here while its row read otherwise (w21/003).
    const hero = selectHeroAmount(
      txn([
        posting("Expenses:Food", "30.00"),
        posting("Income:Gifts", "-30.00"),
      ]),
    );
    expect(hero.text).toBe("$30.00");
    expect(hero.isPositive).toBe(null);
  });

  it("formats non-USD currencies with a suffix", () => {
    const hero = selectHeroAmount(
      txn([
        posting("Expenses:Travel", "90.00", "EUR"),
        posting("Assets:Cash", "-90.00", "EUR"),
      ]),
    );
    expect(hero.text).toBe("-90.00 EUR");
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
    expect(hero).toEqual({ text: "-$3,177.39", isPositive: false });
  });

  function costed(account: string, number: string): JournalPosting {
    return {
      account,
      units: { number, currency: "PROP123MAIN" },
      cost: { number: "400000", currency: "USD", date: "2026-01-02" },
    };
  }

  it("summarizes a disposal settled through several accounts, unsigned", () => {
    // Was "+$422,294.00": Checking, CapitalImprovements and AccumDepreciation
    // summed into one green inflow that matched neither proceeds nor gain.
    const hero = selectHeroAmount(
      txn([
        costed("Assets:RealEstate:Property", "-1"),
        posting("Assets:RealEstate:CapitalImprovements", "-6000"),
        posting("Assets:RealEstate:AccumDepreciation", "19394"),
        posting("Assets:Bank:Checking", "408900"),
        posting("Income:RealEstate:DepreciationRecapture", "-19394"),
        posting("Income:CapitalGains:LongTerm", "-2900"),
      ]),
    );
    expect(hero).toEqual({ text: MIXED, isPositive: null });
  });

  it("summarizes a financed purchase instead of adding loan to cash", () => {
    // Was "$400,000.00" outflow: the 80,000 down payment plus the mortgage.
    const hero = selectHeroAmount(
      txn([
        costed("Assets:RealEstate:Property", "1"),
        posting("Assets:Bank:Checking", "-80000"),
        posting("Liabilities:Mortgage", "-320000"),
      ]),
    );
    expect(hero).toEqual({ text: MIXED, isPositive: null });
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
    expect(selectPostingRows(txn([posting("Assets:Zero", "0.00")]))[0]).toEqual(
      {
        account: "Assets:Zero",
        amount: "$0.00",
        sign: 0,
      },
    );
  });

  it("passes unparseable amounts through verbatim", () => {
    const [row] = selectPostingRows(txn([posting("Assets:X", "abc")]));
    expect(row).toEqual({ account: "Assets:X", amount: "abc USD", sign: 0 });
  });
});

// w21/712: the detail hero read a reinvested $60 dividend as its cash residue.
describe("the hero of a reinvested dividend", () => {
  it("reads the income earned", () => {
    const hero = selectHeroAmountWithLabel(
      txn([
        {
          account: "Assets:Inv:Vti",
          units: { number: "0.496", currency: "QAVTI" },
          cost: { number: "120.00", currency: "USD", date: "2026-10-15" },
        },
        posting("Assets:Inv:Cash", "0.48"),
        posting("Income:Inv:Dividends", "-60.00"),
      ]),
      MIXED,
      "USD",
    );
    expect(hero.text).toBe("+$60.00");
  });
});

// w21/699: a USD posting read "$" in a CAD ledger whose headline "$" is CAD.
describe("a USD entry in a ledger whose own currency is another dollar", () => {
  const store = txn([
    posting("Expenses:Shopping", "42.50"),
    posting("Assets:Bank", "-42.50"),
  ]);

  it("labels the hero and each posting by code", () => {
    expect(selectHeroAmountWithLabel(store, MIXED, "CAD").text).toBe(
      "-42.50 USD",
    );
    expect(selectPostingRows(store, "CAD").map((row) => row.amount)).toEqual([
      "+42.50 USD",
      "-42.50 USD",
    ]);
  });

  it("labels a per-unit price by code too", () => {
    const [row] = selectPostingRows(
      txn([
        {
          account: "Assets:Bank:CAD",
          units: { number: "135.00", currency: "CAD" },
          price: { number: "0.74", currency: "USD" },
        },
      ]),
      "CAD",
    );
    expect(row.amount).toBe("+135.00 CAD");
    expect(row.price).toBe("0.74 USD");
  });

  it("keeps the $ in a USD ledger", () => {
    expect(selectPostingRows(store, "USD")[0].amount).toBe("+$42.50");
    expect(selectHeroAmountWithLabel(store, MIXED, "USD").text).toBe("-$42.50");
  });
});

// w21/668: the narration repeated under a title that already was the narration.
describe("selectTransactionSubtitle", () => {
  it("shows the narration under a different payee", () => {
    expect(
      selectTransactionSubtitle(txn([], { payee: "Cafe", narration: "Lunch" })),
    ).toBe("Lunch");
  });

  it("hides a narration the title already says", () => {
    expect(
      selectTransactionSubtitle(
        txn([], { payee: " ", narration: "qa Coffee" }),
      ),
    ).toBe(null);
    expect(
      selectTransactionSubtitle(txn([], { payee: "AMZN", narration: "AMZN" })),
    ).toBe(null);
    expect(
      selectTransactionSubtitle(txn([], { payee: "Cafe", narration: "" })),
    ).toBe(null);
  });
});

describe("selectTransactionTitle", () => {
  // w21/568: a payee of spaces won the title and left it blank.
  it("skips a payee that is only spaces", () => {
    expect(
      selectTransactionTitle(txn([], { payee: " ", narration: "Coffee" })),
    ).toBe("Coffee");
    expect(
      selectTransactionTitle(txn([], { payee: " ", narration: " " })),
    ).toBe("");
  });

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

describe("mayBeGenerated", () => {
  it("does not suspect ordinary cleared, pending, and custom-flagged transactions", () => {
    expect(mayBeGenerated(txn([], { flag: "*" }))).toBe(false);
    expect(mayBeGenerated(txn([], { flag: "!" }))).toBe(false);
    expect(mayBeGenerated(txn([], { flag: "?" }))).toBe(false);
  });

  it("suspects the flags Beancount reserves for generated transactions", () => {
    for (const flag of ["P", "S", "T", "C", "U", "R", "M"]) {
      expect(mayBeGenerated(txn([], { flag }))).toBe(true);
    }
  });
});

// w21/745: since the API accepts any capital-letter flag (w21/652), an entry
// written with flag R opened read-only, with no Edit, menu or source.
describe("selectEntrySource", () => {
  const refund = txn([], { flag: "R" });

  it("holds a reserved-flag entry read-only until its source is found", () => {
    expect(
      selectEntrySource({ entry: refund, sourced: false, notFound: false }),
    ).toEqual({ isGenerated: true, gone: false });
    expect(
      selectEntrySource({ entry: refund, sourced: true, notFound: false }),
    ).toEqual({ isGenerated: false, gone: false });
  });

  it("keeps an entry with no source generated, not gone (w21/444)", () => {
    const padding = txn([], { flag: "P" });
    expect(
      selectEntrySource({ entry: padding, sourced: false, notFound: true }),
    ).toEqual({ isGenerated: true, gone: false });
  });

  it("reads a not-found after the source was found as removed", () => {
    expect(
      selectEntrySource({ entry: refund, sourced: true, notFound: true }),
    ).toEqual({ isGenerated: false, gone: true });
    expect(
      selectEntrySource({
        entry: txn([], { flag: "*" }),
        sourced: false,
        notFound: true,
      }),
    ).toEqual({ isGenerated: false, gone: true });
  });
});

describe("selectTransactionMenuActions", () => {
  // The screen derives `isGenerated` with `selectEntrySource`; before the
  // context read finds a source, a reserved flag is what feeds this.
  const actionsFor = (entry: JournalTransaction, showWriteActions: boolean) =>
    selectTransactionMenuActions({
      isGenerated: selectEntrySource({ entry, sourced: false, notFound: false })
        .isGenerated,
      showWriteActions,
    });

  // w21/840: a plugin copy's link opens the page that deletes its whole series.
  it("hands out no link for a plugin copy, and keeps delete off it", () => {
    expect(
      selectTransactionMenuActions({
        isGenerated: false,
        showWriteActions: false,
        pluginCopy: true,
      }),
    ).toEqual([]);
    expect(
      selectTransactionMenuActions({
        isGenerated: false,
        showWriteActions: false,
        pluginCopy: false,
      }),
    ).toEqual(["shareLink", "copyLink"]);
  });

  it("offers link actions for an editable entry", () => {
    expect(actionsFor(txn([], { flag: "*" }), false)).toEqual([
      "shareLink",
      "copyLink",
    ]);
  });

  it("adds delete for an editable entry with write access", () => {
    expect(actionsFor(txn([], { flag: "*" }), true)).toEqual([
      "shareLink",
      "copyLink",
      "deleteTransaction",
    ]);
  });

  it("offers nothing for a generated entry: its permalink has no context", () => {
    for (const flag of ["P", "S", "T", "C", "U", "R", "M"]) {
      expect(actionsFor(txn([], { flag }), false)).toEqual([]);
    }
  });

  it("never restores the broken links just because write access exists", () => {
    // `showWriteActions` is already false for a generated entry (no sha256sum),
    // but delete must be the only thing it could ever add.
    expect(actionsFor(txn([], { flag: "P" }), true)).toEqual([
      "deleteTransaction",
    ]);
  });

  it("keeps link actions for a pending entry, which is ordinary source", () => {
    expect(actionsFor(txn([], { flag: "!" }), true)).toEqual([
      "shareLink",
      "copyLink",
      "deleteTransaction",
    ]);
  });
});

// w21/059: Money flow showed a sale as "−4 QAX" with no cost basis or price.
describe("selectPostingRows: cost and price", () => {
  const t = (key: "postingCost" | "postingPrice", params: { amount: string }) =>
    en[key].replace("{{amount}}", params.amount);
  const sale = txn([
    {
      ...posting("Assets:Brokerage", "-4", "QAX"),
      cost: { number: "1.50", currency: "USD", date: "2026-10-01" },
      price: { number: "2.00", currency: "USD" },
    },
    posting("Assets:Bank:Checking", "8.00"),
    posting("Income:Salary", "-2.00"),
  ]);

  it("shows a sale's cost basis and price under its units", () => {
    const [lot, cash] = selectPostingRows(sale);
    expect(lot).toEqual({
      account: "Assets:Brokerage",
      amount: "-4 QAX",
      sign: -1,
      cost: "$1.50",
      lot: "2026-10-01",
      price: "$2.00",
    });
    // Each amount isolated, so Persian keeps its currency on the written side
    // (w21/536).
    expect(postingBasisText(lot, t)).toBe(
      `cost ${isolateLtr("$1.50")} · ${isolateLtr("2026-10-01")} · price ${isolateLtr("$2.00")}`,
    );
    expect(postingBasisText(cash, t)).toBe(null);
  });

  it("names a cost alone, and a price alone as the ledger writes it", () => {
    const [buy] = selectPostingRows(
      txn([
        {
          ...posting("Assets:Brokerage", "10", "QAX"),
          cost: { number: "1.50", currency: "USD", date: "2026-10-01" },
        },
      ]),
    );
    expect(postingBasisText(buy, t)).toBe(
      `cost ${isolateLtr("$1.50")} · ${isolateLtr("2026-10-01")}`,
    );
    const [eur] = selectPostingRows(
      txn([
        {
          ...posting("Assets:Bank:Eur", "50.00", "EUR"),
          price: { number: "1.10", currency: "USD" },
        },
      ]),
    );
    expect(eur.amount).toBe("+50.00 EUR");
    expect(postingBasisText(eur, t)).toBe("@ $1.10");
  });

  // w21/160: a total divided per unit came through at full precision.
  it("rounds a per-unit figure derived from @@ or {{…}}, marked approximate", () => {
    const [fx] = selectPostingRows(
      txn([
        {
          ...posting("Expenses:Qa20261020Fx", "3.00", "EUR"),
          price: { number: "3.3333333333333333333333333333", currency: "USD" },
        },
      ]),
    );
    expect(postingBasisText(fx, t)).toBe("@ ≈$3.3333");
    const [lot] = selectPostingRows(
      txn([
        {
          ...posting("Assets:Brokerage", "3", "QAX"),
          cost: {
            number: "33.333333333333333333333333333",
            currency: "USD",
            date: "2026-10-01",
          },
        },
      ]),
    );
    expect(postingBasisText(lot, t)).toBe(
      `cost ${isolateLtr("≈$33.3333")} · ${isolateLtr("2026-10-01")}`,
    );
    const [dust] = selectPostingRows(
      txn([
        {
          ...posting("Assets:Wallet", "3", "QAX"),
          price: { number: "0.0000666666666666666666", currency: "USD" },
        },
      ]),
    );
    expect(postingBasisText(dust, t)).toBe("@ ≈$0.00006667");
  });

  // w21/322: eight decimals marked precise FX rates and tiny prices "≈".
  it("shows an exact written price of up to twelve decimals as written", () => {
    const shown = (number: string) => {
      const [row] = selectPostingRows(
        txn([
          {
            ...posting("Assets:Wallet", "100", "QAX"),
            price: { number, currency: "USD" },
          },
        ]),
      );
      return postingBasisText(row!, t);
    };
    expect(shown("1.123456789")).toBe("@ $1.123456789");
    expect(shown("0.000000012")).toBe("@ $0.000000012");
    expect(shown("0.123456789012")).toBe("@ $0.123456789012");
    // Beyond twelve it is still a division carried out at full precision.
    expect(shown("0.1234567890123")).toBe("@ ≈$0.1235");
  });

  it("keeps a price as written, however many decimals it has", () => {
    const [btc] = selectPostingRows(
      txn([
        {
          ...posting("Assets:Bank:Checking", "-50.00"),
          price: { number: "0.00001234", currency: "BTC" },
        },
      ]),
    );
    expect(postingBasisText(btc, t)).toBe("@ 0.00001234 BTC");
  });

  it("leaves an ordinary posting unchanged", () => {
    const [row] = selectPostingRows(txn([posting("Expenses:Food", "4.50")]));
    expect(row).toEqual({
      account: "Expenses:Food",
      amount: "+$4.50",
      sign: 1,
    });
    expect(postingBasisText(row, t)).toBe(null);
  });

  it("is read out with the row", () => {
    const source = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "..",
        "components",
        "posting-row.tsx",
      ),
      "utf8",
    ) as string;
    expect(source.includes('${basis ? `, ${basis}` : ""}')).toBe(true);
  });
});

// w21/161: a `!` on one posting was dropped, so the transaction read as
// fully cleared everywhere.
describe("a posting flagged pending", () => {
  it("is marked on its own row only", () => {
    const [transport, cash] = selectPostingRows(
      txn([
        { ...posting("Expenses:Transport", "8.00"), flag: "!" },
        posting("Assets:Cash", "-8.00"),
      ]),
    );
    expect(transport.pending).toBe(true);
    expect("pending" in cash).toBe(false);
  });

  it("shows the P badge and reads pending on that row", () => {
    const row = fs.readFileSync(
      path.join(__dirname, "..", "..", "components", "posting-row.tsx"),
      "utf8",
    );
    expect(row.includes('{posting.pending ? `, ${t("pending")}` : ""}')).toBe(
      true,
    );
    expect(row.includes("{posting.pending ? (")).toBe(true);
  });
});

// w21/162: metadata was readable only in the raw source.
describe("user metadata", () => {
  it("lists the user's keys, without the source position or internal keys", () => {
    expect(
      userMetadataLines({
        filename: "main.bean",
        lineno: 12,
        __tolerances__: { USD: "0.005" },
        invoice: "INV-0914",
        paid: true,
        total: { number: "12.00", currency: "USD" },
      }),
    ).toEqual(["invoice: INV-0914", "paid: true", "total: 12.00 USD"]);
    expect(userMetadataLines(null)).toEqual([]);
  });

  // w21/322: a bare `key:` line has no value to print.
  it("shows a bare key without a value as just the key", () => {
    expect(
      userMetadataLines({ reviewed: null, invoice: "INV-1", note: undefined }),
    ).toEqual(["reviewed", "invoice: INV-1", "note"]);
  });

  it("puts a posting's metadata under its own row", () => {
    const [transport, cash] = selectPostingRows(
      txn([
        {
          ...posting("Expenses:Transport", "1.00"),
          meta: { filename: "main.bean", lineno: 5, note: "posting meta" },
        },
        posting("Assets:Cash", "-1.00"),
      ]),
    );
    expect(transport.meta).toEqual(["note: posting meta"]);
    expect("meta" in cash).toBe(false);
  });

  it("is shown in Details and under the posting", () => {
    const screen = fs.readFileSync(
      path.join(__dirname, "..", "..", "transaction-detail-screen.tsx"),
      "utf8",
    );
    expect(
      screen.includes("const entryMeta = userMetadataLines(entry.meta);"),
    ).toBe(true);
    expect(
      screen.includes(
        "entry.tags?.length || entry.links?.length || entryMeta.length",
      ),
    ).toBe(true);
    const row = fs.readFileSync(
      path.join(__dirname, "..", "..", "components", "posting-row.tsx"),
      "utf8",
    );
    expect(row.includes("{posting.meta?.map((line) => (")).toBe(true);
  });
});

// w21/445: only USD was padded, so "4.5 EUR" sat under a "-4.50 EUR" headline.
describe("selectPostingRows amounts", () => {
  const amounts = (number: string, currency: string) =>
    selectPostingRows(txn([posting("Expenses:Food", number, currency)]))[0]!
      .amount;

  it("pads a currency to its own minor units, as the headline does", () => {
    expect(amounts("4.5", "EUR")).toBe("+4.50 EUR");
    expect(amounts("-5", "EUR")).toBe("-5.00 EUR");
    expect(amounts("12.3", "KWD")).toBe("+12.300 KWD");
    expect(amounts("4.5", "USD")).toBe("+$4.50");
  });

  // w21/914: no symbol in the icon table, but minor units of their own.
  it("pads a currency that has minor units but no symbol", () => {
    expect(amounts("12.5", "CLF")).toBe("+12.5000 CLF");
    expect(amounts("-3", "UYW")).toBe("-3.0000 UYW");
  });

  it("keeps a yen amount whole and a longer recorded scale as written", () => {
    expect(amounts("1500", "JPY")).toBe("+1,500 JPY");
    expect(amounts("1.2345", "EUR")).toBe("+1.2345 EUR");
  });

  it("leaves a commodity that is not a currency at its recorded digits", () => {
    expect(amounts("10", "QAX")).toBe("+10 QAX");
    expect(amounts("0.5", "QAX")).toBe("+0.5 QAX");
  });

  // w21/506: BND, AMD and NOK are also currency codes, so a share count of
  // them read as money.
  it("leaves units held at a cost at their recorded digits", () => {
    const held = (number: string, currency: string) =>
      selectPostingRows(
        txn([
          {
            ...posting("Assets:Brokerage", number, currency),
            cost: { number: "80", currency: "USD", date: "2026-07-06" },
          },
        ]),
      )[0]!.amount;
    expect(held("10", "BND")).toBe("+10 BND");
    expect(held("10", "AMD")).toBe("+10 AMD");
    expect(held("3", "NOK")).toBe("+3 NOK");
    // Without a cost the same codes are currencies, as before.
    expect(amounts("4.5", "EUR")).toBe("+4.50 EUR");
    expect(amounts("10", "NOK")).toBe("+10.00 NOK");
  });
});

// w21/603: two sales from different lots read "-5 VTI · cost $100.00 · price
// $120.00", though the lot's date decides short- or long-term gain.
describe("selectPostingRows: the lot behind a cost", () => {
  const t = (key: "postingCost" | "postingPrice", params: { amount: string }) =>
    en[key].replace("{{amount}}", params.amount);
  const sale = (date: string, label?: string) =>
    selectPostingRows(
      txn([
        {
          ...posting("Assets:Brokerage", "-5", "VTI"),
          cost: { number: "100.00", currency: "USD", date, label },
          price: { number: "120.00", currency: "USD" },
        },
      ]),
    )[0]!;

  it("tells two sales from different lots apart, on screen and to VoiceOver", () => {
    const old = sale("2023-01-15");
    const recent = sale("2025-06-01", "lot-b");
    expect(old.lot).toBe("2023-01-15");
    expect(recent.lot).toBe("2025-06-01 · lot-b");
    expect(postingBasisText(old, t)).not.toBe(postingBasisText(recent, t));
    expect(postingBasisText(recent, t)).toBe(
      `cost ${isolateLtr("$100.00")} · ${isolateLtr("2025-06-01 · lot-b")} · price ${isolateLtr("$120.00")}`,
    );
  });

  it("names no lot when the cost has neither a date nor a label", () => {
    const bare = selectPostingRows(
      txn([
        {
          ...posting("Assets:Brokerage", "5", "VTI"),
          cost: { number: "100.00", currency: "USD" } as never,
        },
      ]),
    )[0]!;
    expect(bare.lot).toBe(undefined);
    expect(postingBasisText(bare, t)).toBe(`cost ${isolateLtr("$100.00")}`);
  });
});
