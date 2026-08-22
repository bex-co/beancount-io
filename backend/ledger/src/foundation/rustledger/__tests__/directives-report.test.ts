import type { DirectiveJson } from "@rustledger/wasm";
import {
  accountsForPayee,
  collectAttributes,
  collectDocuments,
  collectEvents,
  commodityPairsWithPrices,
  entriesCountPerType,
} from "../directives-report";

// A representative parsed ledger covering the directive arms the reports read.
const DIRECTIVES: DirectiveJson[] = [
  {
    type: "open",
    date: "2024-01-01",
    account: "Assets:Checking",
    currencies: ["USD"],
  },
  {
    type: "open",
    date: "2024-01-01",
    account: "Income:Salary",
    currencies: ["USD"],
  },
  {
    type: "open",
    date: "2023-01-01",
    account: "Expenses:Food",
    currencies: ["USD", "EUR"],
  },
  {
    type: "transaction",
    date: "2024-01-15",
    flag: "*",
    payee: "Employer",
    narration: "Salary",
    tags: ["income"],
    links: ["ref-1"],
    postings: [
      {
        account: "Assets:Checking",
        units: { number: "3000.00", currency: "USD" },
      },
      {
        account: "Income:Salary",
        units: { number: "-3000.00", currency: "USD" },
      },
    ],
  },
  {
    type: "transaction",
    date: "2025-02-20",
    flag: "*",
    payee: "Store",
    narration: "Groceries",
    tags: ["food"],
    links: [],
    postings: [
      {
        account: "Assets:Checking",
        units: { number: "-9.99", currency: "EUR" },
      },
      { account: "Expenses:Food", units: { number: "9.99", currency: "EUR" } },
    ],
  },
  {
    type: "balance",
    date: "2024-02-01",
    account: "Assets:Checking",
    amount: { number: "3000.00", currency: "USD" },
  },
  {
    type: "price",
    date: "2024-01-10",
    currency: "EUR",
    amount: { number: "1.10", currency: "USD" },
  },
  {
    type: "event",
    date: "2024-03-01",
    event_type: "location",
    value: "Berlin",
  },
  {
    type: "document",
    date: "2024-04-01",
    account: "Expenses:Food",
    path: "receipts/r1.pdf",
    tags: ["receipt"],
    links: ["ref-2"],
    meta: {
      "receipt-id": "r1",
      reviewed: true,
      total: { number: "12.50", currency: "USD" },
    },
  },
];

describe("entriesCountPerType", () => {
  it("counts directives by type", () => {
    expect(entriesCountPerType(DIRECTIVES)).toEqual({
      open: 3,
      transaction: 2,
      balance: 1,
      price: 1,
      event: 1,
      document: 1,
    });
  });

  it("returns an empty object for no directives", () => {
    expect(entriesCountPerType([])).toEqual({});
  });
});

describe("collectAttributes", () => {
  const attrs = collectAttributes(DIRECTIVES);

  it("collects and recency-ranks the opened/closed account set", () => {
    expect(attrs.accounts).toEqual([
      "Assets:Checking",
      "Expenses:Food",
      "Income:Salary",
    ]);
  });

  it("collects payees and narrations from transactions", () => {
    expect(attrs.payees).toEqual(["Store", "Employer"]);
    expect(attrs.narrations).toEqual(["Groceries", "Salary"]);
  });

  it("collects tags and links from transactions and documents", () => {
    expect(attrs.tags).toEqual(["food", "income", "receipt"]);
    expect(attrs.links).toEqual(["ref-1", "ref-2"]);
  });

  it("sorts tags and links with Python's case-sensitive ordering", () => {
    const directives: DirectiveJson[] = [
      {
        type: "document",
        date: "2024-01-01",
        account: "Assets:Checking",
        path: "receipt.pdf",
        tags: ["zeta", "Alpha"],
        links: ["z-link", "A-link"],
      },
    ];

    expect(collectAttributes(directives).tags).toEqual(["Alpha", "zeta"]);
    expect(collectAttributes(directives).links).toEqual(["A-link", "z-link"]);
  });

  it("collects and recency-ranks transaction units/cost currencies", () => {
    expect(attrs.currencies).toEqual(["EUR", "USD"]);
  });

  it("collects active years newest-first", () => {
    expect(attrs.years).toEqual(["2025", "2024", "2023"]);
  });

  it("uses fiscal-year labels when fiscal_year_end is non-calendar", () => {
    expect(collectAttributes(DIRECTIVES, "06-30").years).toEqual([
      "FY2025",
      "FY2024",
      "FY2023",
    ]);
  });

  it("includes a posting cost currency but not declaration-only currencies", () => {
    const directives: DirectiveJson[] = [
      {
        type: "open",
        date: "2024-01-01",
        account: "Assets:Stock",
        currencies: ["HOOL"],
      },
      {
        type: "open",
        date: "2024-01-01",
        account: "Assets:Cash",
        currencies: ["USD"],
      },
      { type: "commodity", date: "2024-01-01", currency: "UNUSED" },
      {
        type: "transaction",
        date: "2024-02-01",
        flag: "*",
        narration: "Buy",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Stock",
            units: { number: "1", currency: "HOOL" },
            cost: { currency: "USD" },
          },
          {
            account: "Assets:Cash",
            units: { number: "-10", currency: "USD" },
          },
        ],
      },
    ];

    expect(collectAttributes(directives).currencies).toEqual(["USD", "HOOL"]);
  });
});

describe("accountsForPayee", () => {
  it("returns all accounts with the payee's accounts ranked first", () => {
    expect(accountsForPayee(DIRECTIVES, "Employer")).toEqual([
      "Assets:Checking",
      "Income:Salary",
      "Expenses:Food",
    ]);
  });

  it("returns the alphabetical account fallback for an unknown payee", () => {
    expect(accountsForPayee(DIRECTIVES, "Nobody")).toEqual([
      "Assets:Checking",
      "Expenses:Food",
      "Income:Salary",
    ]);
  });
});

describe("commodityPairsWithPrices", () => {
  const priceDirectives: DirectiveJson[] = [
    {
      type: "price",
      date: "2024-01-10",
      currency: "EUR",
      amount: { number: "1.10", currency: "USD" },
    },
    {
      type: "price",
      date: "2024-01-11",
      currency: "EUR",
      amount: { number: "1.12", currency: "USD" },
    },
    // same-day later price should win (keep-last-per-day)
    {
      type: "price",
      date: "2024-01-11",
      currency: "EUR",
      amount: { number: "1.13", currency: "USD" },
    },
    {
      type: "price",
      date: "2024-01-10",
      currency: "AAPL",
      amount: { number: "190.00", currency: "USD" },
    },
  ];

  it("builds forward pairs with exact source rates, last-per-day", () => {
    const pairs = commodityPairsWithPrices(priceDirectives, ["USD"]);
    const eurUsd = pairs.find((p) => p.base === "EUR" && p.quote === "USD");
    expect(eurUsd).toBeDefined();
    expect(eurUsd?.prices).toEqual([
      { date: "2024-01-10", value: "1.10" },
      { date: "2024-01-11", value: "1.13" },
    ]);
    const aapl = pairs.find((p) => p.base === "AAPL" && p.quote === "USD");
    expect(aapl?.prices).toEqual([{ date: "2024-01-10", value: "190.00" }]);
    // No reverse pair when USD is the only operating currency and EUR is not.
    expect(pairs.some((p) => p.base === "USD")).toBe(false);
  });

  it("emits the reverse pair with inverse rates when both are operating currencies", () => {
    const pairs = commodityPairsWithPrices(priceDirectives, ["USD", "EUR"]);
    const usdEur = pairs.find((p) => p.base === "USD" && p.quote === "EUR");
    expect(usdEur).toBeDefined();
    // 1/1.10 and 1/1.13, high precision
    expect(usdEur?.prices[0].date).toBe("2024-01-10");
    expect(usdEur?.prices[0].value.startsWith("0.909090909")).toBe(true);
  });

  it("uses 28 significant digits for inverse rates", () => {
    const pairs = commodityPairsWithPrices(
      [
        {
          type: "price",
          date: "2024-01-01",
          currency: "EUR",
          amount: { number: "30", currency: "USD" },
        },
      ],
      ["EUR", "USD"],
    );
    expect(pairs.find((pair) => pair.base === "USD")?.prices[0].value).toBe(
      "0.03333333333333333333333333333",
    );
  });

  it("returns an empty list when there are no price directives", () => {
    expect(
      commodityPairsWithPrices(
        [
          {
            type: "open",
            date: "2024-01-01",
            account: "Assets:Cash",
            currencies: ["USD"],
          },
        ],
        ["USD"],
      ),
    ).toEqual([]);
  });
});

describe("collectEvents", () => {
  it("extracts event directives", () => {
    expect(collectEvents(DIRECTIVES)).toEqual([
      { date: "2024-03-01", type: "location", value: "Berlin" },
    ]);
  });
});

describe("collectDocuments", () => {
  it("extracts document directives with tags/links defaulted", () => {
    expect(collectDocuments(DIRECTIVES)).toEqual([
      {
        date: "2024-04-01",
        account: "Expenses:Food",
        path: "receipts/r1.pdf",
        tags: ["receipt"],
        links: ["ref-2"],
        meta: {
          "receipt-id": "r1",
          reviewed: true,
          total: { number: "12.50", currency: "USD" },
        },
      },
    ]);
  });
});
