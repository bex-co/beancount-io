import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { coherentCostErrors } from "../coherent-cost";
import { reconcileLeafOnlyErrors } from "../leafonly";
import { locateDuplicateErrors } from "../noduplicates";

/**
 * w21/740: built-in plugins' errors came back with no file or line, so their
 * Notifications rows could not be opened, and leafonly listed a parent once
 * per posting. The expected lines are bean-check 3.2.3's. The booked stream
 * and the engine's errors are scripted here (WASM-free).
 */
const pluginError = (message: string): BeancountError => ({
  message,
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
const open = (account: string): DirectiveJson => ({
  type: "open",
  date: "2024-01-01",
  account,
  currencies: [],
});
const transaction = (
  date: string,
  postings: [string, string, boolean?][],
): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  narration: "",
  tags: [],
  links: [],
  postings: postings.map(([account, currency, atCost]) => ({
    account,
    units: { number: "1", currency },
    ...(atCost
      ? {
          cost: {
            number: { kind: "per_unit", value: "100" },
            currency: "USD",
          },
        }
      : {}),
  })),
});
const placed = (errors: BeancountError[]) =>
  errors.map((error) => [error.line, error.message]);

describe("reconcileLeafOnlyErrors", () => {
  const source = [
    'plugin "beancount.plugins.leafonly"',
    "2024-01-01 open Assets:Cash",
    "2024-01-01 open Assets:Cash:Sub",
    "2024-01-01 open Assets:Savings",
    "2024-01-01 open Assets:Savings:Sub",
  ].join("\n");
  const check = (directives: DirectiveJson[], errors: BeancountError[] = []) =>
    placed(
      reconcileLeafOnlyErrors(
        errors,
        directives,
        { "main.bean": source },
        "main.bean",
      ),
    );
  const engine = pluginError(
    "Posting to non-leaf account 'Assets:Cash' - has child accounts",
  );

  it("reports a parent once, on its open line, however many postings", () => {
    expect(
      check(
        [
          open("Assets:Cash"),
          open("Assets:Cash:Sub"),
          transaction("2024-01-02", [
            ["Assets:Cash", "USD"],
            ["Assets:Cash", "USD"],
            ["Assets:Cash:Sub", "USD"],
          ]),
        ],
        [engine, engine],
      ),
    ).toEqual([[2, "Non-leaf account 'Assets:Cash' has postings on it"]]);
  });

  it("counts a parent's note but not its balances", () => {
    const savings: DirectiveJson[] = [
      open("Assets:Savings"),
      open("Assets:Savings:Sub"),
      {
        type: "balance",
        date: "2024-01-02",
        account: "Assets:Savings",
        amount: { number: "0", currency: "USD" },
      },
    ];
    expect(check(savings)).toEqual([]);
    expect(
      check([
        ...savings,
        {
          type: "note",
          date: "2024-01-03",
          account: "Assets:Savings",
          comment: "on the parent",
        },
      ]),
    ).toEqual([[4, "Non-leaf account 'Assets:Savings' has postings on it"]]);
  });
});

describe("locateDuplicateErrors", () => {
  it("puts each error on a later copy, past a different same-named entry", () => {
    const source = [
      'plugin "beancount.plugins.noduplicates"',
      '2024-01-03 * "Shop" "Dup"',
      "  Assets:Cash  1 USD",
      "  Equity:Opening",
      '2024-01-03 * "Shop" "Dup"',
      "  Assets:Cash  2 USD",
      "  Equity:Opening",
      '2024-01-03 * "Shop" "Dup"',
      "  id: 7",
      "  Assets:Cash   1 USD ; a comment",
      "  Equity:Opening",
    ].join("\n");
    const engine = pluginError('Duplicate transaction: 2024-01-03 "Dup"');
    expect(
      placed(
        locateDuplicateErrors([engine], { "main.bean": source }, "main.bean"),
      ),
    ).toEqual([[8, engine.message]]);
  });
});

describe("coherentCostErrors", () => {
  const source = [
    'plugin "beancount.plugins.coherent_cost"',
    '2024-01-04 * "Buy"',
    "  Assets:Broker  1 VTI {100 USD}",
    "  Assets:Cash",
    '2024-01-05 * "Gift"',
    "  Assets:Broker  1 VTI",
    "  Equity:Opening  -1 VTI",
  ].join("\n");
  const stream = [
    transaction("2024-01-04", [
      ["Assets:Broker", "VTI", true],
      ["Assets:Cash", "USD"],
    ]),
    transaction("2024-01-05", [
      ["Assets:Broker", "VTI"],
      ["Equity:Opening", "VTI"],
    ]),
  ];

  it("refuses a commodity held at cost and without, on its first uncosted use", () => {
    expect(
      placed(coherentCostErrors(stream, { "main.bean": source }, "main.bean")),
    ).toEqual([[5, "Currency 'VTI' is used both with and without cost"]]);
  });

  it("runs under pedantic, and not without either", () => {
    const pedantic = source.replace("coherent_cost", "pedantic");
    expect(
      coherentCostErrors(stream, { "main.bean": pedantic }, "main.bean"),
    ).toHaveLength(1);
    expect(
      coherentCostErrors(
        stream,
        { "main.bean": source.split("\n").slice(1).join("\n") },
        "main.bean",
      ),
    ).toEqual([]);
  });
});
