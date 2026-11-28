import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { locateCheckDrainedErrors } from "../check-drained";
import { reconcileCoherentCostErrors } from "../coherent-cost";
import { reconcileCommodityAttrErrors } from "../commodity-attr";
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

  // w31/107: the engine dates the copies `2024-01-03` however they are written.
  it("finds copies dated 2024/01/03 and 2024-1-3", () => {
    const source = [
      'plugin "beancount.plugins.noduplicates"',
      '2024/01/03 * "Shop" "Dup"',
      "  Assets:Cash  1 USD",
      "  Equity:Opening",
      '2024-1-3 * "Shop" "Dup"',
      "  Assets:Cash  1 USD",
      "  Equity:Opening",
    ].join("\n");
    const engine = pluginError('Duplicate transaction: 2024-01-03 "Dup"');
    expect(
      placed(
        locateDuplicateErrors([engine], { "main.bean": source }, "main.bean"),
      ),
    ).toEqual([[5, engine.message]]);
  });
});

describe("reconcileCoherentCostErrors", () => {
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
  const reconcile = (errors: BeancountError[], text: string) =>
    reconcileCoherentCostErrors(
      errors,
      stream,
      { "main.bean": text },
      "main.bean",
    );
  const VTI = "Currency 'VTI' is used both with and without cost";
  // rustledger's own coherent_cost, for a priced gift: unlocated (w31/129).
  const engine = pluginError(
    "Currency 'VTI' is used with both cost and price-only notation - this may cause inconsistencies",
  );
  const other = pluginError("Some other plugin error");

  it("refuses a commodity held at cost and without, on its first uncosted use", () => {
    expect(placed(reconcile([], source))).toEqual([[5, VTI]]);
  });

  it("replaces the engine's error for a priced gift with Beancount's one, located", () => {
    // bean-check 3.2.3 lists one error for `1 VTI @ 100 USD` beside a costed
    // buy; the engine's unlocated duplicate was kept beside it.
    const priced = source.replace(
      "  Assets:Broker  1 VTI\n",
      "  Assets:Broker  1 VTI @ 100 USD\n",
    );
    expect(placed(reconcile([other, engine], priced))).toEqual([
      [null, other.message],
      [5, VTI],
    ]);
  });

  it("runs under pedantic, and not without either", () => {
    const pedantic = source.replace("coherent_cost", "pedantic");
    expect(placed(reconcile([], pedantic))).toEqual([[5, VTI]]);
    const without = source.split("\n").slice(1).join("\n");
    expect(reconcile([], without)).toEqual([]);
    // Undeclared, nothing of the engine's is touched.
    expect(reconcile([engine], without)).toEqual([engine]);
  });

  it("keeps the other errors when no currency is held both ways", () => {
    const costed = [stream[0]!];
    expect(
      reconcileCoherentCostErrors(
        [other, engine],
        costed,
        { "main.bean": source },
        "main.bean",
      ),
    ).toEqual([other]);
  });
});

// w31/156: check_drained's and commodity_attr's errors were unlocated, in the
// engine's words; bean-check 3.2.3 puts them on the close or commodity line.
describe("locateCheckDrainedErrors", () => {
  const source = [
    'plugin "beancount.plugins.check_drained"',
    'include "other.bean"',
    "2024-01-01 open Assets:Cash",
    "2024-08-30 close Assets:Cash",
  ].join("\n");
  const files = { "main.bean": source, "other.bean": "" };
  const close: DirectiveJson = {
    type: "close",
    date: "2024-08-30",
    account: "Assets:Cash",
  };
  const engine = (got: string, account = "Assets:Cash"): BeancountError => ({
    ...pluginError(
      `Balance failed for ${account}: expected 0 USD, got ${got} USD\n  note: directive was synthesized by a plugin (no source location in your files)`,
    ),
    code: "E2001",
    phase: "validate",
  });
  const locate = (
    errors: BeancountError[],
    text = source,
    directives = [close],
  ) =>
    placed(
      locateCheckDrainedErrors(
        errors,
        directives,
        { ...files, "main.bean": text },
        "main.bean",
      ),
    );

  it("puts each failure on its close line, in bean-check's words", () => {
    expect(locate([engine("49.75"), engine("-10.500")])).toEqual([
      [
        4,
        "Balance failed for 'Assets:Cash': expected 0 USD != accumulated 49.75 USD (49.75 too much)",
      ],
      [
        4,
        "Balance failed for 'Assets:Cash': expected 0 USD != accumulated -10.500 USD (10.500 too little)",
      ],
    ]);
  });

  it("runs under pedantic, and finds a close in an included file", () => {
    const pedantic = source.replace("check_drained", "pedantic");
    expect(locate([engine("1")], pedantic)).toEqual([
      [
        4,
        "Balance failed for 'Assets:Cash': expected 0 USD != accumulated 1 USD (1 too much)",
      ],
    ]);
    const moved = source.replace("2024-08-30 close Assets:Cash", "");
    const errors = locateCheckDrainedErrors(
      [engine("1")],
      [close],
      { "main.bean": moved, "other.bean": "\n2024-08-30 close Assets:Cash" },
      "main.bean",
    );
    expect(errors.map((error) => [error.file, error.line])).toEqual([
      ["other.bean", 2],
    ]);
  });

  it("leaves a close close_tree made unlocated, as stock does", () => {
    const child: DirectiveJson = { ...close, account: "Assets:Cash:Sub" };
    expect(
      locate([engine("1", "Assets:Cash:Sub")], source, [close, child]),
    ).toEqual([
      [
        null,
        "Balance failed for 'Assets:Cash:Sub': expected 0 USD != accumulated 1 USD (1 too much)",
      ],
    ]);
  });

  it("leaves a written balance, an open account and an undeclared plugin alone", () => {
    const written = { ...engine("49.75"), file: "main.bean", line: 3 };
    const open = engine("49.75", "Assets:Bank");
    expect(
      locateCheckDrainedErrors([written, open], [close], files, "main.bean"),
    ).toEqual([written, open]);
    const undeclared = source.split("\n").slice(1).join("\n");
    expect(locate([engine("49.75")], undeclared)).toEqual([
      [null, engine("49.75").message],
    ]);
  });
});

describe("reconcileCommodityAttrErrors", () => {
  const config = "{'name': None, 'sector': ['Tech', 'Energy'], 'tier': []}";
  const source = [
    `plugin "beancount.plugins.commodity_attr" "${config}"`,
    "2024-01-01 commodity QAX",
    '  sector: "Other"',
    "2024-01-01 commodity QAY",
    "  sector: 5.10",
    "  tier: TRUE",
    "2024-01-01 commodity QAZ",
    "  sector:",
  ].join("\n");
  const commodity = (
    currency: string,
    meta: Record<string, string | boolean | null>,
  ): DirectiveJson => ({
    type: "commodity",
    date: "2024-01-01",
    currency,
    meta,
  });
  const stream = [
    commodity("QAX", { sector: "Other" }),
    commodity("QAY", { sector: "5.10", tier: true }),
    commodity("QAZ", { sector: null }),
  ];
  const missing = (currency: string, attribute: string) =>
    pluginError(
      `Commodity '${currency}' missing required attribute '${attribute}'`,
    );
  const invalid = (
    currency: string,
    attribute: string,
    value: string,
    allowed: string,
  ) =>
    pluginError(
      `Commodity '${currency}' attribute '${attribute}' has invalid value '${value}' (allowed: ${allowed})`,
    );
  const reconcile = (errors: BeancountError[], text = source) =>
    placed(
      reconcileCommodityAttrErrors(
        errors,
        stream,
        { "main.bean": text },
        "main.bean",
      ),
    );

  it("puts each finding on its commodity line, in bean-check's words", () => {
    expect(
      reconcile([
        missing("QAX", "name"),
        invalid("QAX", "sector", "Other", '["Tech", "Energy"]'),
        invalid("QAY", "sector", 'Number("5.10")', '["Tech", "Energy"]'),
        invalid("QAY", "tier", "Bool(true)", "[]"),
        invalid("QAZ", "sector", "", '["Tech", "Energy"]'),
      ]),
    ).toEqual([
      [2, "Missing attribute 'name' for Commodity directive QAX"],
      [
        2,
        "Invalid value 'Other' for attribute sector, Commodity directive QAX; valid options: Tech, Energy",
      ],
      [
        4,
        "Invalid value '5.10' for attribute sector, Commodity directive QAY; valid options: Tech, Energy",
      ],
      // An empty list checks nothing, and an empty value is missing.
      [7, "Missing attribute 'sector' for Commodity directive QAZ"],
    ]);
  });

  it("reports a config that is not a dict, unlocated", () => {
    const CONFIG = "Invalid configuration for commodity_attr plugin; skipping.";
    for (const [written, refused] of [
      ["[1, 2]", true],
      ["None", true],
      ["'abc'", true],
      ["{'name', 'sector'}", true],
      ["{'name': ", true],
      ["{}", false],
      // A None inside a string is text; a trailing comma reads.
      ["{'note': 'None (True)', 'name': None,}", false],
      ["{'sector': ('Tech', 'Energy'), 'listed': True}", false],
    ] as const) {
      const text = source.replace(config, written);
      expect([written, reconcile([], text)]).toEqual([
        written,
        refused ? [[null, CONFIG]] : [],
      ]);
    }
  });

  it("leaves other errors, and an undeclared plugin's, alone", () => {
    const other = pluginError("Some other plugin error");
    expect(reconcile([other])).toEqual([[null, other.message]]);
    const undeclared = source.split("\n").slice(1).join("\n");
    const engine = missing("QAX", "name");
    expect(reconcile([engine], undeclared)).toEqual([[null, engine.message]]);
  });
});
