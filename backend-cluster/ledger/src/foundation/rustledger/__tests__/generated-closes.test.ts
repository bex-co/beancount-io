import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { openAutoAccounts } from "../auto-accounts";
import {
  inactiveAfterGeneratedCloses,
  inactivePads,
  withoutDroppedCloseErrors,
  withoutGeneratedCloseErrors,
} from "../generated-closes";

/**
 * w21/737: close_tree's child closes were added after the engine validated,
 * so a posting after one raised nothing; and the engine's auto_accounts
 * opened no account named only by a close, so close_tree's parent read as
 * never opened. The booked stream is scripted here (WASM-free), as rustledger
 * returns it.
 */
const close = (account: string, date = "2024-04-01"): DirectiveJson => ({
  type: "close",
  date,
  account,
});
const transaction = (date: string, accounts: string[]): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  narration: "",
  tags: [],
  links: [],
  postings: accounts.map((account) => ({
    account,
    units: { number: "1", currency: "USD" },
  })),
});
const located = (errors: BeancountError[]) =>
  errors.map((error) => [error.code, error.line, error.message]);

describe("inactiveAfterGeneratedCloses", () => {
  const source = [
    'plugin "beancount.plugins.close_tree"',
    "2024-04-01 close Assets:Broker",
    '2024-04-01 * "Same day"',
    "  Assets:Broker:VTI  1 USD",
    "  Assets:Cash",
    '2024-05-01 * "Late"',
    "  ! Assets:Broker:VTI  1 USD",
    "  Assets:Broker:VTI  1 USD",
    "  Assets:Cash",
    "2024-01-01 open Assets:Broker:VTI",
    "2025-01-01 open Assets:Broker:Roth",
  ].join("\n");
  const check = (directives: DirectiveJson[]) =>
    located(
      inactiveAfterGeneratedCloses(
        directives,
        { "main.bean": source },
        "main.bean",
      ),
    );

  it("refuses each posting after a close the source does not write", () => {
    expect(
      check([
        close("Assets:Broker"),
        close("Assets:Broker:VTI"),
        transaction("2024-04-01", ["Assets:Broker:VTI", "Assets:Cash"]),
        transaction("2024-05-01", [
          "Assets:Broker:VTI",
          "Assets:Broker:VTI",
          "Assets:Cash",
        ]),
      ]),
    ).toEqual(
      Array(2).fill([
        "E1003",
        6,
        "Posting to inactive account Assets:Broker:VTI on 2024-05-01 (closed on 2024-04-01)",
      ]),
    );
  });

  // w21/753: close_tree also closes a child opened after its parent's close;
  // Beancount's date-ordered check leaves the child open and raises one error
  // for the close instead.
  it("leaves a child opened after its parent's close active", () => {
    const opened = (account: string, date: string): DirectiveJson => ({
      type: "open",
      date,
      account,
      currencies: [],
    });
    expect(
      check([
        opened("Assets:Broker", "2024-01-01"),
        close("Assets:Broker"),
        opened("Assets:Broker:VTI", "2024-01-01"),
        close("Assets:Broker:VTI"),
        opened("Assets:Broker:Roth", "2025-01-01"),
        close("Assets:Broker:Roth"),
        transaction("2025-02-01", ["Assets:Broker:Roth", "Assets:Cash"]),
        transaction("2024-05-01", ["Assets:Broker:VTI", "Assets:Cash"]),
      ]),
    ).toEqual([
      // bean-check 3.2.3's words; on the parent's close, line 2.
      ["E1001", 2, "Unopened account Assets:Broker:Roth is being closed"],
      [
        "E1003",
        6,
        "Posting to inactive account Assets:Broker:VTI on 2024-05-01 (closed on 2024-04-01)",
      ],
    ]);
  });

  it("leaves a written close to the engine, which checks it already", () => {
    expect(
      check([
        close("Assets:Broker"),
        transaction("2024-05-01", ["Assets:Broker", "Assets:Cash"]),
      ]),
    ).toEqual([]);
  });
});

describe("openAutoAccounts", () => {
  const AUTO = 'plugin "beancount.plugins.auto_accounts"\n';
  const neverOpened = (account: string): BeancountError => ({
    message: `Account ${account} was never opened`,
    code: "E1001",
    phase: "validate",
    hint: null,
    file: "main.bean",
    line: 6,
    column: 1,
    end_line: null,
    end_column: null,
    severity: "error",
  });
  const stream: DirectiveJson[] = [
    {
      type: "open",
      date: "2024-01-02",
      account: "Assets:Broker:VTI",
      currencies: [],
    },
    transaction("2024-01-02", ["Assets:Broker:VTI"]),
    {
      type: "note",
      date: "2024-02-02",
      account: "Assets:OnlyNote",
      comment: "hi",
    },
    close("Assets:Broker"),
  ];
  const unknown: BeancountError = {
    ...neverOpened("x"),
    message: "Invalid reference to unknown account 'Assets:OnlyNote'",
  };

  it("opens an account named only by a close or a note, on its first use", () => {
    const { directives, errors } = openAutoAccounts(
      stream,
      [neverOpened("Assets:Broker"), unknown],
      AUTO,
    );
    expect(errors).toEqual([]);
    expect(
      directives.flatMap((directive) =>
        directive.type === "open" ? [[directive.date, directive.account]] : [],
      ),
    ).toEqual([
      ["2024-01-02", "Assets:Broker:VTI"],
      ["2024-02-02", "Assets:OnlyNote"],
      ["2024-04-01", "Assets:Broker"],
    ]);
  });

  it("keeps the error without the plugin", () => {
    expect(
      openAutoAccounts(stream, [neverOpened("Assets:Broker")], "").errors,
    ).toEqual([neverOpened("Assets:Broker")]);
  });
});

// w21/756: after a close Beancount allows only balances, documents and notes;
// the engine checked transactions only, so a pad into a closed account passed.
describe("inactivePads", () => {
  const pad = (date: string): DirectiveJson => ({
    type: "pad",
    date,
    account: "Assets:Broker:VTI",
    source_account: "Equity:Opening",
  });
  const source = [
    "2024-04-01 close Assets:Broker",
    "2024-03-01 pad Assets:Broker:VTI Equity:Opening",
    "2024-05-01 pad Assets:Broker:VTI Equity:Opening",
  ].join("\n");
  const check = (directives: DirectiveJson[]) =>
    located(inactivePads(directives, { "main.bean": source }, "main.bean"));

  it("refuses a pad after close_tree's close, or a written one, on its line", () => {
    const opened: DirectiveJson = {
      type: "open",
      date: "2024-01-01",
      account: "Assets:Broker:VTI",
      currencies: [],
    };
    const late = [
      ["E1003", 3, "Invalid reference to inactive account 'Assets:Broker:VTI'"],
    ];
    expect(
      check([
        opened,
        close("Assets:Broker:VTI"),
        pad("2024-03-01"),
        pad("2024-05-01"),
      ]),
    ).toEqual(late);
  });

  it("leaves a pad before the close, and an open account, alone", () => {
    expect(check([pad("2024-05-01")])).toEqual([]);
    expect(check([close("Assets:Broker:VTI"), pad("2024-03-01")])).toEqual([]);
  });
});

// w21/775: close_tree runs at its place among the plugins. Declared before
// auto_accounts it sees only the written opens: it closes no child the source
// does not open, and drops the close of a parent the source does not open.
describe("close_tree before auto_accounts", () => {
  const CLOSE_TREE = 'plugin "beancount.plugins.close_tree"';
  const AUTO = 'plugin "beancount.plugins.auto_accounts"';
  const ledger = (plugins: string[], ...lines: string[]) => ({
    "main.bean": [
      ...plugins,
      '2024-01-02 * "Buy"',
      "  Assets:Broker:VTI  1 USD",
      "  Assets:Cash",
      "2024-04-01 close Assets:Broker",
      '2024-05-01 * "Late"',
      "  Assets:Broker:VTI  1 USD",
      "  Assets:Cash",
      ...lines,
    ].join("\n"),
  });
  // The engine's stream closes the child whatever the order.
  const stream = [
    transaction("2024-01-02", ["Assets:Broker:VTI", "Assets:Cash"]),
    close("Assets:Broker"),
    close("Assets:Broker:VTI"),
    transaction("2024-05-01", ["Assets:Broker:VTI", "Assets:Cash"]),
  ];
  const late = [
    "E1003",
    7,
    "Posting to inactive account Assets:Broker:VTI on 2024-05-01 (closed on 2024-04-01)",
  ];
  const posted = (files: Record<string, string>) =>
    located(inactiveAfterGeneratedCloses(stream, files, "main.bean"));

  it("closes no child the source does not open, as bean-check", () => {
    expect(posted(ledger([CLOSE_TREE, AUTO]))).toEqual([]);
    expect(posted(ledger([AUTO, CLOSE_TREE]))).toEqual([late]);
    expect(
      posted(ledger(['plugin "beancount.plugins.auto"', CLOSE_TREE])),
    ).toEqual([late]);
    expect(
      posted(ledger([CLOSE_TREE, AUTO], "2024-01-01 open Assets:Broker:VTI")),
    ).toEqual([late]);
  });

  it("allows a pad into such a child", () => {
    const pads = (plugins: string[]) =>
      located(
        inactivePads(
          [
            close("Assets:Broker"),
            close("Assets:Broker:VTI"),
            {
              type: "pad",
              date: "2024-05-01",
              account: "Assets:Broker:VTI",
              source_account: "Equity:Opening",
            },
          ],
          {
            "main.bean": [
              ...plugins,
              "2024-04-01 close Assets:Broker",
              "2024-05-01 pad Assets:Broker:VTI Equity:Opening",
            ].join("\n"),
          },
          "main.bean",
        ),
      );
    expect(pads([CLOSE_TREE, AUTO])).toEqual([]);
    expect(pads([AUTO, CLOSE_TREE])).toEqual([
      ["E1003", 4, "Invalid reference to inactive account 'Assets:Broker:VTI'"],
    ]);
  });

  const engineError = (message: string, line: number): BeancountError => ({
    message,
    code: "E1003",
    phase: "validate",
    hint: null,
    file: "main.bean",
    line,
    column: 1,
    end_line: null,
    end_column: null,
    severity: "error",
  });
  // The engine checks the written close of a parent close_tree drops.
  const parentErrors = [
    engineError("Account Assets:Broker was never opened", 6),
    engineError("Account Assets:Broker was never opened", 8),
    engineError(
      "Posting to inactive account Assets:Broker on 2024-05-01 (closed on 2024-04-01)",
      7,
    ),
    engineError("Cannot close account Assets:Broker with non-zero balance", 6),
    engineError("Account Assets:Cash was never opened", 9),
  ];
  // Two lines before the entries, so the close is on line 6.
  const kept = (plugins: string[], ...lines: string[]) =>
    withoutDroppedCloseErrors(
      parentErrors,
      ledger([...plugins, ";", ";"].slice(0, 2), ...lines),
      "main.bean",
    ).map((error) => [error.line, error.message]);

  it("drops the engine's errors about a parent close close_tree drops", () => {
    // Only its close's own "never opened": a posting's is still one.
    expect(kept([CLOSE_TREE])).toEqual([
      [8, "Account Assets:Broker was never opened"],
      [9, "Account Assets:Cash was never opened"],
    ]);
    expect(kept([CLOSE_TREE, AUTO])).toEqual(kept([CLOSE_TREE]));
  });

  it("keeps them when the close stands", () => {
    expect(kept([])).toHaveLength(parentErrors.length);
    expect(kept([AUTO, CLOSE_TREE])).toHaveLength(parentErrors.length);
    expect(kept([CLOSE_TREE], "2024-01-01 open Assets:Broker")).toHaveLength(
      parentErrors.length,
    );
  });
});

// w21/776: a stream revalidated after the fava plugins holds the engine's
// close_tree closes. Its errors about them were kept in place of these, so a
// late child's located "being closed" became an unlocated "never opened".
describe("withoutGeneratedCloseErrors", () => {
  const revalidated = (
    message: string,
    file: string | null,
    line: number | null,
  ): BeancountError => ({
    message,
    code: "E1003",
    phase: "validate",
    hint: null,
    file,
    line,
    column: null,
    end_line: null,
    end_column: null,
    severity: "error",
  });
  const files = {
    "main.bean": [
      'plugin "beancount.plugins.close_tree"',
      'plugin "fava.plugins.tag_discovered_documents"',
      "2024-04-01 close Assets:Broker",
      "2024-04-01 close Assets:Other:Cash",
    ].join("\n"),
  };
  const errors = [
    revalidated("Account Assets:Broker:Roth was never opened", null, null),
    revalidated(
      "Posting to inactive account Assets:Broker:VTI on 2024-05-01 (closed on 2024-04-01)",
      "main.bean",
      8,
    ),
    revalidated(
      "Cannot close account Assets:Broker:VTI with non-zero balance",
      null,
      null,
    ),
    // A written close, a posting's own never-opened, and another account's.
    revalidated(
      "Posting to inactive account Assets:Other:Cash on 2024-05-01 (closed on 2024-04-01)",
      "main.bean",
      9,
    ),
    revalidated("Account Assets:Broker:Roth was never opened", "main.bean", 9),
    revalidated("Account Assets:Broker:Roth2 was never opened", null, null),
  ];

  it("leaves close_tree's closes to inactiveAfterGeneratedCloses", () => {
    expect(
      withoutGeneratedCloseErrors(
        errors,
        [
          close("Assets:Broker"),
          close("Assets:Broker:VTI"),
          close("Assets:Broker:Roth"),
          close("Assets:Other:Cash"),
        ],
        files,
        "main.bean",
      ),
    ).toEqual(errors.slice(3));
  });
});
