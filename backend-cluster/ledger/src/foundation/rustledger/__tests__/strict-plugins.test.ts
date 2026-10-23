import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { reconcileCheckCommodityErrors } from "../check-commodity";
import { reconcileNounusedErrors } from "../nounused";
import { reconcileOneCommodityErrors } from "../one-commodity";
import { beancountPluginRuns } from "../plugins/collect-plugins";
import { reconcileUniquePriceErrors } from "../unique-prices";

/**
 * w21/739: the engine reports nounused and check_commodity as warnings, which
 * the server drops as advice, and its pedantic runs no nounused, so a ledger
 * bean-check refuses read as healthy. The expected errors are bean-check
 * 3.2.3's. The booked stream is scripted here (WASM-free).
 */
const open = (account: string, currencies: string[] = []): DirectiveJson => ({
  type: "open",
  date: "2024-01-01",
  account,
  currencies,
});
const transaction = (
  postings: [string, string, string?][],
  date = "2024-01-02",
): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  narration: "",
  tags: [],
  links: [],
  postings: postings.map(([account, currency, price]) => ({
    account,
    units: { number: "1", currency },
    ...(price ? { price: { number: "2", currency: price } } : {}),
  })),
});
const warning = (message: string): BeancountError => ({
  message,
  code: "PLUGIN",
  phase: "plugin",
  hint: null,
  file: null,
  line: null,
  column: null,
  end_line: null,
  end_column: null,
  severity: "warning",
});
const source = (plugin: string) =>
  [
    `plugin "beancount.plugins.${plugin}"`,
    "2024-01-01 open Assets:Cash USD",
    "2024-01-01 open Assets:Unused USD",
    "2024-01-01 open Equity:Opening USD",
  ].join("\n");
const stream = [
  open("Assets:Cash", ["USD"]),
  open("Assets:Unused", ["USD"]),
  open("Equity:Opening", ["USD"]),
  transaction([
    ["Assets:Cash", "USD"],
    ["Equity:Opening", "USD"],
  ]),
];
const shown = (errors: BeancountError[]) =>
  errors.map((error) => [error.severity, error.line, error.message]);

describe("reconcileNounusedErrors", () => {
  const check = (plugin: string, errors: BeancountError[] = []) =>
    shown(
      reconcileNounusedErrors(
        errors,
        stream,
        { "main.bean": source(plugin) },
        "main.bean",
      ),
    );

  it("refuses an opened account nothing names, on its open line", () => {
    expect(
      check("nounused", [
        warning("Account 'Assets:Unused' is opened but never used"),
      ]),
    ).toEqual([["error", 3, "Unused account 'Assets:Unused'"]]);
  });

  it("runs under pedantic, which the engine's leaves it out of", () => {
    expect(check("pedantic")).toEqual([
      ["error", 3, "Unused account 'Assets:Unused'"],
    ]);
  });

  it("counts a close as a use, and leaves a ledger without it alone", () => {
    const closed = [
      ...stream,
      { type: "close", date: "2024-02-01", account: "Assets:Unused" },
    ] as DirectiveJson[];
    expect(
      reconcileNounusedErrors(
        [],
        closed,
        { "main.bean": source("nounused") },
        "main.bean",
      ),
    ).toEqual([]);
    const advice = warning("Account 'Assets:Unused' is opened but never used");
    expect(check("leafonly", [advice])).toEqual([
      ["warning", null, advice.message],
    ]);
  });
});

describe("reconcileCheckCommodityErrors", () => {
  const check = (
    plugin: string,
    directives: DirectiveJson[] = stream,
    errors: BeancountError[] = [],
  ) =>
    shown(
      reconcileCheckCommodityErrors(
        errors,
        directives,
        { "main.bean": plugin },
        "main.bean",
      ),
    );
  const declared = 'plugin "beancount.plugins.check_commodity"';

  it("refuses each undeclared currency once, naming its first account", () => {
    expect(
      check(declared, stream, [
        warning("commodity 'USD' used but not declared"),
      ]),
    ).toEqual([
      ["error", null, "Missing Commodity directive for 'USD' in 'Assets:Cash'"],
    ]);
  });

  it("reads prices after accounts, and skips declared commodities", () => {
    const directives: DirectiveJson[] = [
      { type: "commodity", date: "2024-01-01", currency: "USD" },
      open("Assets:Cash"),
      transaction([["Assets:Cash", "VTI", "USD"]]),
      {
        type: "price",
        date: "2024-01-03",
        currency: "BND",
        amount: { number: "80", currency: "VTI" },
      },
    ];
    expect(check(declared, directives)).toEqual([
      ["error", null, "Missing Commodity directive for 'VTI' in 'Assets:Cash'"],
      [
        "error",
        null,
        "Missing Commodity directive for 'BND' in 'Price Directive Context'",
      ],
    ]);
  });

  it("honours its ignore patterns, matched from the start", () => {
    expect(check(`${declared} "{'Assets:.*': 'US'}"`)).toEqual([
      [
        "error",
        null,
        "Missing Commodity directive for 'USD' in 'Equity:Opening'",
      ],
    ]);
    expect(check(`${declared} "[1]"`)).toEqual([
      [
        "error",
        null,
        "Invalid configuration for check_commodity plugin; skipping.",
      ],
    ]);
  });

  it("runs under pedantic, and not without either", () => {
    expect(check('plugin "beancount.plugins.pedantic"')).toEqual([
      ["error", null, "Missing Commodity directive for 'USD' in 'Assets:Cash'"],
    ]);
    expect(check("")).toEqual([]);
  });
});

describe("pedantic's other checks", () => {
  const PEDANTIC = 'plugin "beancount.plugins.pedantic"\n';

  it("runs its plugins with no config, beside their own declarations", () => {
    expect(
      beancountPluginRuns(
        `${PEDANTIC}plugin "beancount.plugins.onecommodity" "Assets"\n`,
        "onecommodity",
      ),
    ).toEqual([null, "Assets"]);
    expect(beancountPluginRuns(PEDANTIC, "implicit_prices")).toEqual([]);
  });

  it("holds onecommodity and unique_prices to Beancount's rules", () => {
    const mixed = [
      open("Assets:Cash"),
      transaction([
        ["Assets:Cash", "USD"],
        ["Assets:Cash", "EUR"],
      ]),
    ];
    const files = {
      "main.bean": `${PEDANTIC}2024-01-02 * "Mixed"\n  Assets:Cash  1 USD\n  Assets:Cash  1 EUR\n2024-01-08 price VTI 100 USD\n2024-01-08 price VTI 101 USD\n`,
    };
    expect(
      shown(reconcileOneCommodityErrors([], mixed, files, "main.bean")),
    ).toEqual([
      ["error", 2, "More than one currency in account 'Assets:Cash': USD,EUR"],
    ]);
    // The engine's pedantic raises nothing for these prices.
    const prices: DirectiveJson[] = ["100", "101"].map((number) => ({
      type: "price",
      date: "2024-01-08",
      currency: "VTI",
      amount: { number, currency: "USD" },
    }));
    expect(
      shown(reconcileUniquePriceErrors([], prices, files, "main.bean")),
    ).toEqual([["error", 5, "Disagreeing price entries"]]);
  });
});

// w21/757: close_tree's closes counted as uses whatever the plugin order, so
// an idle child it closed read as used under nounused declared first.
describe("reconcileNounusedErrors and close_tree", () => {
  const ledger = (first: string, second: string) =>
    [
      `plugin "beancount.plugins.${first}"`,
      `plugin "beancount.plugins.${second}"`,
      "2024-01-01 open Assets:Broker",
      "2024-01-01 open Assets:Broker:Idle",
      "2024-04-01 close Assets:Broker",
    ].join("\n");
  // The stream holds close_tree's close of the child.
  const stream: DirectiveJson[] = [
    open("Assets:Broker"),
    open("Assets:Broker:Idle"),
    transaction([["Assets:Broker", "USD"]]),
    { type: "close", date: "2024-04-01", account: "Assets:Broker" },
    { type: "close", date: "2024-04-01", account: "Assets:Broker:Idle" },
  ];
  const run = (first: string, second: string) =>
    shown(
      reconcileNounusedErrors(
        [],
        stream,
        { "main.bean": ledger(first, second) },
        "main.bean",
      ),
    );

  it("does not count close_tree's close when nounused runs first", () => {
    expect(run("nounused", "close_tree")).toEqual([
      ["error", 4, "Unused account 'Assets:Broker:Idle'"],
    ]);
  });

  it("counts it when close_tree runs first, as Beancount does", () => {
    expect(run("close_tree", "nounused")).toEqual([]);
  });
});
