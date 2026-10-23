import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { openAutoAccounts } from "../auto-accounts";
import { inactiveAfterGeneratedCloses } from "../generated-closes";

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
