import { ValidationError } from "@/shared/errors";
import {
  buildLedgerFiles,
  previewLedgerSetup,
  type LedgerSetup,
} from "../build-ledger";
import fixturesJson from "../fixtures.json";
import { setupCatalog } from "../index";

describe("buildLedgerFiles (w3/m53/t002)", () => {
  it("builds the personal preset with a known opening balance", () => {
    const files = buildLedgerFiles(
      {
        preset: "personal@1",
        title: "Household",
        operatingCurrency: "EUR",
        historyStart: "2026-02-01",
        accounts: [
          {
            name: "Assets:Cash",
            openingState: "known",
            amount: "100",
          },
        ],
      },
      "2026-01-01",
    );
    const main = files["main.bean"];
    expect(main).toContain('option "title" "Household"');
    expect(main).toContain('option "operating_currency" "EUR"');
    // Accounts open the day before the boundary so the opening transaction
    // can post then; the assertion stays on the boundary.
    expect(main).toMatch(/^2026-01-31 open Assets:Cash$/m);
    // Opening transaction lands the day before the history boundary and the
    // assertion on the boundary itself (fixture personal@1-opening-known).
    expect(main).toContain('2026-01-31 * "Opening balance"');
    expect(main).toContain("Assets:Cash 100 EUR");
    expect(main).toContain("Equity:OpeningBalances -100 EUR");
    expect(main).toContain("2026-02-01 balance Assets:Cash 100 EUR");
  });

  it("keeps unknown and zero opening states distinct", () => {
    const unknown = buildLedgerFiles(
      {
        preset: "personal@1",
        operatingCurrency: "EUR",
        historyStart: "2026-02-01",
        accounts: [{ name: "Assets:Cash", openingState: "unknown" }],
      },
      "2026-01-01",
    )["main.bean"];
    expect(unknown).toContain('bcio_opening_balance_status: "unknown"');
    expect(unknown).not.toContain("balance Assets:Cash");

    const zero = buildLedgerFiles(
      {
        preset: "personal@1",
        operatingCurrency: "EUR",
        historyStart: "2026-02-01",
        accounts: [{ name: "Assets:Cash", openingState: "zero" }],
      },
      "2026-01-01",
    )["main.bean"];
    expect(zero).toContain('bcio_opening_balance_status: "zero"');
    expect(zero).not.toContain("balance Assets:Cash");
  });

  it("opens capability accounts only when the capability is enabled", () => {
    const deferred = buildLedgerFiles(
      { preset: "freelance@1", historyStart: "2026-01-01" },
      "2026-01-01",
    )["main.bean"];
    expect(deferred).not.toContain("Assets:AccountsReceivable");

    const enabled = buildLedgerFiles(
      {
        preset: "freelance@1",
        historyStart: "2026-01-01",
        capabilities: { invoices: "enabled" },
      },
      "2026-01-01",
    )["main.bean"];
    expect(enabled).toContain("Assets:AccountsReceivable");
  });

  it("refuses invalid explicit values and creates nothing", () => {
    expect(() =>
      buildLedgerFiles({ preset: "nope@1" as never }, "2026-01-01"),
    ).toThrow(ValidationError);
    expect(() =>
      buildLedgerFiles(
        { preset: "personal@1", operatingCurrency: "ZZZ" },
        "2026-01-01",
      ),
    ).toThrow(ValidationError);
    expect(() =>
      buildLedgerFiles(
        { preset: "personal@1", historyStart: "2026-13-01" },
        "2026-01-01",
      ),
    ).toThrow(ValidationError);
    expect(() =>
      buildLedgerFiles(
        {
          preset: "personal@1",
          accounts: [{ name: "Assets:Cash", openingState: "known" }],
        },
        "2026-01-01",
      ),
    ).toThrow(ValidationError);
    expect(() =>
      buildLedgerFiles(
        {
          preset: "personal@1",
          accounts: [{ name: "Assets:Nope", openingState: "zero" }],
        },
        "2026-01-01",
      ),
    ).toThrow(ValidationError);
  });

  // w21/438: the arguments were swapped, so `field` held the whole sentence and
  // the message read "Validation failed for Unsupported operating currency …: setup".
  it("names the setup as the field and the problem as the reason", () => {
    let thrown: unknown;
    try {
      buildLedgerFiles(
        { preset: "personal@1", operatingCurrency: "XX" },
        "2026-01-01",
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ValidationError);
    const error = thrown as ValidationError;
    expect(error.metadata).toMatchObject({ field: "setup" });
    expect(String(error.metadata?.reason)).toContain(
      "Unsupported operating currency",
    );
    expect(error.message).toMatch(
      /^Validation failed for setup: .*Unsupported operating currency/,
    );
  });

  it("matches every clean conformance fixture (w3/m53/t005)", () => {
    const clean = fixturesJson.fixtures.filter((fixture) =>
      fixture.id.endsWith("-clean"),
    );
    expect(clean).toHaveLength(8);
    for (const fixture of clean) {
      const preview = previewLedgerSetup(
        fixture.spec as LedgerSetup,
        "2026-01-01",
      );
      expect(preview.accounts).toEqual(
        [...(fixture.expected.openedAccounts ?? [])].sort(),
      );
      for (const optional of fixture.expected.optionalAccountsNotOpened ?? []) {
        expect(preview.accounts).not.toContain(optional);
      }
      expect(preview.files["main.bean"]).not.toContain(" balance ");
    }
  });

  it("matches the opening conformance fixtures", () => {
    const known = previewLedgerSetup(
      {
        preset: "personal@1",
        operatingCurrency: "EUR",
        historyStart: "2026-02-01",
        accounts: [
          { name: "Assets:Cash", openingState: "known", amount: "100" },
        ],
      },
      "2026-01-01",
    );
    expect(known.files["main.bean"]).toContain(
      '2026-01-31 * "Opening balance"',
    );
    expect(known.files["main.bean"]).toContain(
      "2026-02-01 balance Assets:Cash 100 EUR",
    );
  });

  // w21/104: a credit card's 500 owed was written as +500, raising net worth.
  it("stores a liability's amount owed as the negative posting", () => {
    const main = previewLedgerSetup(
      {
        preset: "personal@1",
        operatingCurrency: "USD",
        historyStart: "2026-02-01",
        accounts: [
          {
            name: "Liabilities:CreditCard",
            openingState: "known",
            amount: "500",
          },
          { name: "Assets:Cash", openingState: "known", amount: "100" },
        ],
      },
      "2026-01-01",
    ).files["main.bean"];
    expect(main).toContain("  Liabilities:CreditCard -500 USD");
    expect(main).toContain("  Equity:OpeningBalances 500 USD");
    expect(main).toContain(
      "2026-02-01 balance Liabilities:CreditCard -500 USD",
    );
    // Assets are unchanged.
    expect(main).toContain("2026-02-01 balance Assets:Cash 100 USD");
  });

  it("keeps an explicit negative on a liability as written", () => {
    const main = previewLedgerSetup(
      {
        preset: "personal@1",
        historyStart: "2026-02-01",
        accounts: [
          {
            name: "Liabilities:CreditCard",
            openingState: "known",
            amount: "-30.50",
          },
        ],
      },
      "2026-01-01",
    ).files["main.bean"];
    expect(main).toContain(
      "2026-02-01 balance Liabilities:CreditCard -30.50 USD",
    );
    expect(main).not.toContain("--30.50");
  });

  // w21/549: an explicit sign is the ledger's own, so a card in credit can be
  // stated; an unsigned positive keeps meaning "owed" for older clients.
  describe("a liability opening with an explicit sign", () => {
    const main = (amount: string) =>
      previewLedgerSetup(
        {
          preset: "personal@1",
          operatingCurrency: "USD",
          historyStart: "2026-02-01",
          accounts: [
            { name: "Liabilities:CreditCard", openingState: "known", amount },
          ],
        },
        "2026-01-01",
      ).files["main.bean"];

    it("writes +50 as 50 in credit, with the counter posting balancing it", () => {
      const text = main("+50");
      expect(text).toContain("  Liabilities:CreditCard 50 USD");
      expect(text).toContain("  Equity:OpeningBalances -50 USD");
      expect(text).toContain(
        "2026-02-01 balance Liabilities:CreditCard 50 USD",
      );
      expect(text).not.toContain("+50");
      expect(text).not.toContain("-+");
    });

    it("writes -500 and an unsigned 500 as the same debt", () => {
      for (const amount of ["-500", "500"]) {
        const text = main(amount);
        expect(text).toContain("  Liabilities:CreditCard -500 USD");
        expect(text).toContain("  Equity:OpeningBalances 500 USD");
      }
    });

    it("leaves a signed amount on an asset as its own sign", () => {
      const text = previewLedgerSetup(
        {
          preset: "personal@1",
          historyStart: "2026-02-01",
          accounts: [
            { name: "Assets:Cash", openingState: "known", amount: "+100" },
          ],
        },
        "2026-01-01",
      ).files["main.bean"];
      expect(text).toContain("  Assets:Cash 100 USD");
    });
  });

  // w21/552: GraphQL passes a client's explicit null through; REST and MCP never
  // carry one.
  it("takes an explicit null on a nullable field as omitted", () => {
    const omitted = previewLedgerSetup(
      {
        preset: "personal@1",
        accounts: [{ name: "Assets:Cash" }],
      } as never,
      "2026-01-01",
    );
    const nulls = previewLedgerSetup(
      {
        preset: "personal@1",
        title: null,
        operatingCurrency: null,
        historyStart: null,
        capabilities: null,
        accounts: [
          {
            name: "Assets:Cash",
            openingState: null,
            amount: null,
            currency: null,
          },
        ],
      } as never,
      "2026-01-01",
    );
    expect(nulls).toEqual(omitted);
  });

  it("still refuses an amount on an account that is not known", () => {
    expect(() =>
      previewLedgerSetup(
        {
          preset: "personal@1",
          accounts: [{ name: "Assets:Cash", amount: "5", openingState: null }],
        } as never,
        "2026-01-01",
      ),
    ).toThrow("must not carry an amount");
  });

  // w21/548: `Date.UTC` read years 0001-0099 as 1900-1999, so a valid early
  // Books begin was refused (the ledger itself accepts them, w4/m38).
  it("accepts a history start in years 0001-0099 and still refuses impossible days", () => {
    for (const historyStart of ["0050-03-01", "0099-12-31", "0001-01-01"]) {
      expect(
        previewLedgerSetup({ preset: "personal@1", historyStart }, "2026-01-01")
          .files["main.bean"],
      ).toContain(`${historyStart} open`);
    }
    for (const historyStart of ["0050-02-30", "0000-01-01", "0100-02-29"]) {
      expect(() =>
        previewLedgerSetup(
          { preset: "personal@1", historyStart },
          "2026-01-01",
        ),
      ).toThrow(`Invalid history start "${historyStart}"`);
    }
    // 0004 is a leap year in the proleptic calendar Beancount uses.
    expect(
      previewLedgerSetup(
        { preset: "personal@1", historyStart: "0004-02-29" },
        "2026-01-01",
      ).files["main.bean"],
    ).toContain("0004-02-29 open");
  });

  // w21/107: Date.parse rolled 2026-04-31 over to 1 May, so it was accepted.
  it("refuses a history start that is not a calendar day", () => {
    for (const historyStart of ["2026-02-30", "2026-04-31", "2025-02-29"]) {
      expect(() =>
        previewLedgerSetup(
          { preset: "personal@1", historyStart },
          "2026-01-01",
        ),
      ).toThrow(`Invalid history start "${historyStart}"`);
    }
    expect(
      previewLedgerSetup(
        { preset: "personal@1", historyStart: "2024-02-29" },
        "2026-01-01",
      ).files["main.bean"],
    ).toContain("2024-02-29 open");
  });

  it("builds a blank ledger with no accounts", () => {
    const main = buildLedgerFiles(
      { preset: "blank@1", title: "Books", operatingCurrency: "JPY" },
      "2026-01-01",
    )["main.bean"];
    expect(main).not.toContain(" open ");
    expect(main).toContain('option "operating_currency" "JPY"');
  });
});

// w23/048: a known opening opened Equity:OpeningBalances a second time in
// every preset that lists it, opened it in one currency only, and wrote an
// assertion for an equity "opening" no transaction posted. The engine run
// over every combination is recorded in the w23/048 resolution; these pin
// the shape that loads.
// w21/687: every preset account was opened restricted to the operating
// currency, so Portfolio refused its own first share purchase and a euro lunch
// failed bean-check in a dollar ledger.
describe("accounts are not restricted to the operating currency", () => {
  it.each(["personal@1", "portfolio@1"] as const)(
    "opens no %s account with a currency",
    (preset) => {
      const { files } = previewLedgerSetup(
        { preset, operatingCurrency: "USD" },
        "2026-10-21",
      );
      const opens = files["main.bean"]
        .split("\n")
        .filter((line) => / open /.test(line));
      expect(opens.length).toBeGreaterThan(0);
      for (const line of opens) {
        expect(line).toMatch(/^\d{4}-\d{2}-\d{2} open \S+$/);
      }
    },
  );

  it("still restricts an account set up with its own currency", () => {
    const { files } = previewLedgerSetup(
      {
        preset: "blank@1",
        operatingCurrency: "USD",
        accounts: [{ name: "Assets:Euro", currency: "EUR" }],
      },
      "2026-10-21",
    );
    expect(files["main.bean"]).toContain("2026-10-21 open Assets:Euro EUR");
  });
});

describe("known openings and the opening-balances account", () => {
  const opens = (text: string) =>
    text.split("\n").filter((line) => / open /.test(line));

  for (const preset of setupCatalog.presets) {
    const questions = preset.optionalQuestions.map((question) => question.id);
    for (let mask = 0; mask < 1 << questions.length; mask += 1) {
      const capabilities = Object.fromEntries(
        questions.map((id, i) => [
          id,
          mask & (1 << i) ? "enabled" : "declined",
        ]),
      ) as Record<string, "enabled" | "declined">;
      const presetId = preset.id as LedgerSetup["preset"];
      const target = previewLedgerSetup(
        { preset: presetId, capabilities },
        "2026-10-21",
      ).accounts.find((account) => account !== "Equity:OpeningBalances");
      // `blank@1` opens nothing by default; the next tests cover it.
      if (!target) continue;
      it(`${preset.id} ${JSON.stringify(capabilities)} opens each account once`, () => {
        const { files } = previewLedgerSetup(
          {
            preset: presetId,
            capabilities,
            accounts: [
              { name: target, openingState: "known", amount: "1250.00" },
            ],
          },
          "2026-10-21",
        );
        const lines = opens(files["main.bean"]!);
        const names = lines.map((line) => line.split(" ")[2]);
        expect(new Set(names).size).toBe(names.length);
        expect(lines).toContain("2026-10-20 open Equity:OpeningBalances");
      });
    }
  }

  it("takes openings in several currencies on one unconstrained equity account", () => {
    const { files } = previewLedgerSetup(
      {
        preset: "blank@1",
        accounts: [
          {
            name: "Assets:Bank",
            currency: "EUR",
            openingState: "known",
            amount: "5",
          },
          { name: "Assets:Cash", openingState: "known", amount: "7" },
        ],
      },
      "2026-10-21",
    );
    const text = files["main.bean"]!;
    expect(opens(text)).toContain("2026-10-20 open Equity:OpeningBalances");
    expect(text).toContain("  Equity:OpeningBalances -5 EUR");
    expect(text).toContain("  Equity:OpeningBalances -7 USD");
  });

  it("refuses a known opening on the opening-balances account itself", () => {
    expect(() =>
      previewLedgerSetup({
        preset: "blank@1",
        accounts: [
          {
            name: "Equity:OpeningBalances",
            openingState: "known",
            amount: "5",
          },
        ],
      }),
    ).toThrow("cannot have a known opening of its own");
  });
});

// w23/049: account names and the title were interpolated raw, so a blank@1
// name with a newline injected directives and a title ending in `\` broke
// the file.
describe("names and titles written into main.bean", () => {
  it.each([
    "Assets:Bank USD\n2020-01-01 open Assets:Evil",
    'Assets:Bank\noption "operating_currency" "EUR"',
    "assets:lower",
    "Foo:Bar",
    "Assets",
    "Assets:bank",
    "Assets:Bank Account",
  ])("refuses the account name %j", (name) => {
    expect(() =>
      previewLedgerSetup({ preset: "blank@1", accounts: [{ name }] }),
    ).toThrow("is not a Beancount account name");
  });

  it.each([
    "Assets:Bank-2",
    "Liabilities:Card:2026",
    "Assets:Café",
    "Assets:现金",
  ])("accepts the account name %j", (name) => {
    const { files } = previewLedgerSetup(
      { preset: "blank@1", accounts: [{ name }] },
      "2026-10-21",
    );
    expect(files["main.bean"]).toContain(`2026-10-21 open ${name}\n`);
  });

  it("accepts every account the catalog offers", () => {
    for (const preset of setupCatalog.presets) {
      const capabilities = Object.fromEntries(
        preset.optionalQuestions.map((question) => [question.id, "enabled"]),
      ) as Record<string, "enabled">;
      const presetId = preset.id as LedgerSetup["preset"];
      const { accounts } = previewLedgerSetup(
        { preset: presetId, capabilities },
        "2026-10-21",
      );
      expect(() =>
        previewLedgerSetup({
          preset: presetId,
          capabilities,
          accounts: accounts.map((name) => ({ name })),
        }),
      ).not.toThrow();
    }
  });

  it.each([
    ["Books\\", 'option "title" "Books\\\\"'],
    ['A "quoted" title', 'option "title" "A \\"quoted\\" title"'],
  ])("escapes the title %j", (title, line) => {
    const { files } = previewLedgerSetup({ preset: "personal@1", title });
    expect(files["main.bean"]!.split("\n")[0]).toBe(line);
  });

  it("refuses a title with a line break", () => {
    expect(() =>
      previewLedgerSetup({ preset: "personal@1", title: "Books\noption" }),
    ).toThrow("must not contain line breaks");
  });
});
