import type { DirectiveJson } from "@rustledger/wasm";
import { restoreEntrySortOrder } from "../entry-sort-order";
import { accountJournalItems } from "../journal-running-balance";

/**
 * w21/134: rustledger hands a day back grouped by kind (balance, pad,
 * transactions, note, event, price, custom), so the account journal walked a
 * salary written before a same-day pad after it: "+100 → 500" and a padding
 * row "+400 → 400". The order below is the real engine's for this source.
 */
const SOURCE = `option "operating_currency" "USD"
2020-01-01 open Assets:Pad USD
2020-01-01 open Income:Salary USD
2026-08-05 * "QA PADSAL"
  Assets:Pad  100.00 USD
  Income:Salary
2026-08-05 note Assets:Pad "n"
2026-08-05 pad Assets:Pad Equity:Opening-Balances
2026-08-05 price EUR 1.10 USD
2026-08-06 balance Assets:Pad 500.00 USD
`;
const open = (account: string): DirectiveJson => ({
  type: "open",
  date: "2020-01-01",
  account,
  currencies: ["USD"],
});
const salary: DirectiveJson = {
  type: "transaction",
  date: "2026-08-05",
  flag: "*",
  narration: "QA PADSAL",
  tags: [],
  links: [],
  postings: [
    { account: "Assets:Pad", units: { number: "100.00", currency: "USD" } },
    { account: "Income:Salary", units: { number: "-100.00", currency: "USD" } },
  ],
};
const note: DirectiveJson = {
  type: "note",
  date: "2026-08-05",
  account: "Assets:Pad",
  comment: "n",
};
const pad: DirectiveJson = {
  type: "pad",
  date: "2026-08-05",
  account: "Assets:Pad",
  source_account: "Equity:Opening-Balances",
};
const price: DirectiveJson = {
  type: "price",
  date: "2026-08-05",
  currency: "EUR",
  amount: { number: "1.10", currency: "USD" },
};
const balance: DirectiveJson = {
  type: "balance",
  date: "2026-08-06",
  account: "Assets:Pad",
  amount: { number: "500.00", currency: "USD" },
};
const ENGINE_ORDER = [
  open("Assets:Pad"),
  open("Income:Salary"),
  pad,
  salary,
  note,
  price,
  balance,
];

describe("restoreEntrySortOrder", () => {
  it("orders a day by Beancount's type rank, then line", () => {
    expect(
      restoreEntrySortOrder(ENGINE_ORDER, { "main.bean": SOURCE }),
    ).toEqual([
      open("Assets:Pad"),
      open("Income:Salary"),
      salary,
      note,
      pad,
      price,
      balance,
    ]);
  });

  it("puts a same-day balance and open first and a close last", () => {
    const close: DirectiveJson = {
      type: "close",
      date: "2026-08-05",
      account: "Assets:Pad",
    };
    const sameDay = { ...balance, date: "2026-08-05" };
    const source = `2026-08-05 close Assets:Pad
2026-08-05 * "QA PADSAL"
  Assets:Pad  100.00 USD
  Income:Salary
2026-08-05 balance Assets:Pad 500.00 USD
`;
    expect(
      restoreEntrySortOrder([sameDay, salary, close], { "main.bean": source }),
    ).toEqual([sameDay, salary, close]);
  });

  // w21/324: one generated directive used to put the whole day back in the
  // engine's grouping, and the running balance with it.
  it("keeps the rest of the day in source order when a plugin adds a directive", () => {
    // auto_accounts opens an account the source never opened, on the day of its
    // first use: more `open`s than the source has, so only `open` is unmapped.
    const generated = open("Expenses:Generated");
    const withOpens = [
      open("Assets:Pad"),
      open("Income:Salary"),
      {
        ...generated,
        date: "2026-08-05",
      },
      pad,
      salary,
      note,
      price,
      balance,
    ];
    const sorted = restoreEntrySortOrder(withOpens, { "main.bean": SOURCE });
    // Salary → Note → Pad, as without the plugin.
    expect(
      sorted.filter((d) => d.date === "2026-08-05").map((d) => d.type),
    ).toEqual(["open", "transaction", "note", "pad", "price"]);
  });

  it("does the same when implicit_prices adds a same-day price", () => {
    const generatedPrice: DirectiveJson = {
      ...price,
      amount: { number: "1.1", currency: "USD" },
    };
    const sorted = restoreEntrySortOrder(
      [pad, salary, note, price, generatedPrice, balance],
      { "main.bean": SOURCE },
    );
    expect(sorted.map((d) => d.type)).toEqual([
      "transaction",
      "note",
      "pad",
      "price",
      "price",
      "balance",
    ]);
  });

  it("puts a directive the source cannot place after the ones it can, in engine order", () => {
    // A plugin-made note has no line of its own.
    const extra = { ...note, comment: "generated" };
    expect(
      restoreEntrySortOrder([pad, salary, note, extra, price], {
        "main.bean": SOURCE,
      }),
    ).toEqual([salary, pad, price, note, extra]);
  });

  it("gives the account journal Beancount's running balances", () => {
    const padding: DirectiveJson = {
      ...salary,
      flag: "P",
      narration: "Padding",
      postings: [
        { account: "Assets:Pad", units: { number: "400.00", currency: "USD" } },
        {
          account: "Equity:Opening-Balances",
          units: { number: "-400.00", currency: "USD" },
        },
      ],
    };
    const sorted = restoreEntrySortOrder(ENGINE_ORDER, {
      "main.bean": SOURCE,
    });
    // The engine adapter then inserts each padding row after its pad.
    sorted.splice(sorted.indexOf(pad) + 1, 0, padding);
    expect(
      accountJournalItems(sorted, "Assets:Pad").map((item) => [
        item.entry.type,
        item.change,
        item.balance,
      ]),
    ).toEqual([
      ["open", {}, {}],
      ["transaction", { USD: "100.00" }, { USD: "100.00" }],
      ["note", {}, { USD: "100.00" }],
      ["pad", {}, { USD: "100.00" }],
      ["transaction", { USD: "400.00" }, { USD: "500.00" }],
      ["balance", {}, { USD: "500.00" }],
    ]);
  });
});

// w21/843, w21/844: a main-file entry took an included file's line number, and a
// stray .bean file nothing includes threw the counts off.
describe("restoreEntrySortOrder across files", () => {
  const txn = (narration: string): DirectiveJson => ({
    type: "transaction",
    date: "2024-01-05",
    flag: "*",
    narration,
    tags: [],
    links: [],
    postings: [],
  });
  const mainLate = txn("main-late-line");
  const incEarly = txn("inc-early-line");
  const MAIN = [
    'include "b.bean"',
    "",
    "2024-01-01 open Assets:Cash",
    "",
    "",
    "",
    "",
    "",
    '2024-01-05 * "main-late-line"',
    "  Assets:Cash  10 USD",
    "",
  ].join("\n");
  const B = [
    '2024-01-05 * "inc-early-line"',
    "  Assets:Cash  -3 USD",
    "",
    '2024-01-05 note Assets:Cash "n"',
  ].join("\n");
  // The engine walks the entry point's entries, then the include's.
  const ENGINE = [mainLate, incEarly];

  it("orders same-day entries of different files by line number, as Beancount does", () => {
    const sorted = restoreEntrySortOrder(
      ENGINE,
      { "main.bean": MAIN, "b.bean": B },
      "main.bean",
    );
    expect(sorted.map((d) => (d as { narration: string }).narration)).toEqual([
      "inc-early-line",
      "main-late-line",
    ]);
  });

  it("ignores a .bean file the entry point does not load", () => {
    const stray = '2024-01-05 * "old copy"\n  Assets:Cash  1 USD\n';
    const sorted = restoreEntrySortOrder(
      ENGINE,
      { "main.bean": MAIN, "b.bean": B, "old/backup.bean": stray },
      "main.bean",
    );
    expect(sorted.map((d) => (d as { narration: string }).narration)).toEqual([
      "inc-early-line",
      "main-late-line",
    ]);
  });
});
