import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { reconcileOneCommodityErrors } from "../one-commodity";
import { collectLedgerPluginDeclarations } from "../plugins/collect-plugins";

/**
 * w21/736: rustledger's onecommodity honoured none of Beancount's opt-outs,
 * repeated an account once per transaction, and had no location. The booked
 * stream and the engine's errors are scripted here (WASM-free), as rustledger
 * returns them; the expected errors are bean-check 3.2.3's.
 */
const open = (
  account: string,
  currencies: string[] = [],
  meta?: DirectiveJson["meta"],
): DirectiveJson => ({
  type: "open",
  date: "2024-01-01",
  account,
  currencies,
  ...(meta ? { meta } : {}),
});
const transaction = (
  date: string,
  postings: [string, string, string?][],
): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  narration: "",
  tags: [],
  links: [],
  postings: postings.map(([account, currency, cost]) => ({
    account,
    units: { number: "1", currency },
    ...(cost
      ? {
          cost: {
            number: { kind: "per_unit", value: "1" },
            currency: cost,
          },
        }
      : {}),
  })),
});
const rustledgerError = (account: string): BeancountError => ({
  message: `Account '${account}' uses multiple currencies: USD and EUR`,
  code: "PLUGIN",
  phase: "plugin",
  hint: null,
  file: null,
  line: null,
  column: null,
  end_line: null,
  end_column: null,
  severity: "error",
});
const check = (
  entries: DirectiveJson[],
  source: string,
  errors: BeancountError[] = [],
) =>
  reconcileOneCommodityErrors(
    errors,
    entries,
    { "main.bean": source },
    "main.bean",
  ).map((error) => [error.line, error.message]);

const PLUGIN = 'plugin "beancount.plugins.onecommodity"';
const travel = [
  '2024-01-04 * "Trip"',
  "  Expenses:Travel  10 USD",
  "  Equity:Opening",
  '2024-01-05 * "Trip abroad"',
  "  ! Expenses:Travel  10 EUR",
  "  Equity:Opening",
];
const trips = [
  transaction("2024-01-04", [
    ["Expenses:Travel", "USD"],
    ["Equity:Opening", "USD"],
  ]),
  transaction("2024-01-05", [
    ["Expenses:Travel", "EUR"],
    ["Equity:Opening", "EUR"],
  ]),
];

describe("reconcileOneCommodityErrors", () => {
  it("reports each account once, on its last entry, in Beancount's words", () => {
    expect(
      check(
        [open("Expenses:Travel"), ...trips],
        [PLUGIN, ...travel].join("\n"),
        [rustledgerError("Expenses:Travel"), rustledgerError("Equity:Opening")],
      ),
    ).toEqual([
      [5, "More than one currency in account 'Expenses:Travel': USD,EUR"],
      [5, "More than one currency in account 'Equity:Opening': USD,EUR"],
    ]);
  });

  it("skips an account opened onecommodity: FALSE", () => {
    expect(
      check(
        [
          open("Expenses:Travel", [], { onecommodity: false }),
          open("Equity:Opening", [], { onecommodity: false }),
          ...trips,
        ],
        [PLUGIN, ...travel].join("\n"),
        [rustledgerError("Expenses:Travel")],
      ),
    ).toEqual([]);
  });

  it("skips an account opened with several currencies", () => {
    expect(
      check(
        [
          open("Expenses:Travel", ["USD", "EUR"]),
          open("Equity:Opening", ["USD", "EUR"]),
          ...trips,
        ],
        [PLUGIN, ...travel].join("\n"),
      ),
    ).toEqual([]);
  });

  it("checks only the accounts its pattern matches from their start", () => {
    const entries = [open("Expenses:Travel"), open("Equity:Opening"), ...trips];
    expect(
      check(entries, [`${PLUGIN} "Expenses:Tra"`, ...travel].join("\n")),
    ).toEqual([
      [5, "More than one currency in account 'Expenses:Travel': USD,EUR"],
    ]);
    // `re.match` anchors at the start only: "Travel" matches no account.
    expect(
      check(entries, [`${PLUGIN} "Travel"`, ...travel].join("\n")),
    ).toEqual([]);
  });

  it("checks cost currencies, and places balances before the day's entries", () => {
    const source = [
      PLUGIN,
      '2024-01-02 * "Buy in USD"',
      "  Assets:Broker  1 VTI {100 USD}",
      "  Assets:Cash",
      '2024-01-03 * "Buy in EUR"',
      "  Assets:Broker  1 VTI {90 EUR}",
      "  Assets:Cash",
      '2024-01-03 * "Later that day"',
      "  Assets:Savings  10 USD",
      "  Assets:Cash",
      "2024-01-03 balance Assets:Savings  10 EUR",
    ].join("\n");
    expect(
      check(
        [
          transaction("2024-01-02", [["Assets:Broker", "VTI", "USD"]]),
          transaction("2024-01-03", [["Assets:Broker", "VTI", "EUR"]]),
          transaction("2024-01-03", [["Assets:Savings", "USD"]]),
          {
            type: "balance",
            date: "2024-01-03",
            account: "Assets:Savings",
            amount: { number: "10", currency: "EUR" },
          },
        ],
        source,
      ),
    ).toEqual([
      [8, "More than one currency in account 'Assets:Savings': USD,EUR"],
      [5, "More than one cost currency in account 'Assets:Broker': USD,EUR"],
    ]);
  });

  it("leaves the engine's errors alone without Beancount's plugin", () => {
    expect(
      check(trips, travel.join("\n"), [rustledgerError("Expenses:Travel")]),
    ).toEqual([
      [null, "Account 'Expenses:Travel' uses multiple currencies: USD and EUR"],
    ]);
  });
});

describe("collectLedgerPluginDeclarations", () => {
  it("keeps each plugin's config, decoded", () => {
    expect(
      collectLedgerPluginDeclarations(
        'plugin "a"\nplugin "b" "Expenses:\\"Q\\""\n',
      ),
    ).toEqual([
      { name: "a", config: null },
      { name: "b", config: 'Expenses:"Q"' },
    ]);
  });
});
