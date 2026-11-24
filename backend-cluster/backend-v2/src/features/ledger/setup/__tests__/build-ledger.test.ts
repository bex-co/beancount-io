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

  // w1/349: the assertions were followed by "", so the committed file ended
  // in a blank line that `git diff --check` refused, unlike `bea init`'s.
  it("ends a ledger with opening balances in one newline", () => {
    const main = buildLedgerFiles(
      {
        preset: "personal@1",
        operatingCurrency: "USD",
        historyStart: "2026-01-01",
        accounts: [
          { name: "Assets:Bank", openingState: "known", amount: "100" },
          { name: "Assets:Cash", openingState: "known", amount: "0" },
        ],
      },
      "2026-01-01",
    )["main.bean"];
    expect(main.endsWith("2026-01-01 balance Assets:Cash 0 USD\n")).toBe(true);
    expect(main.endsWith("\n\n")).toBe(false);
  });

  it("does not switch on auto_accounts, so a misspelt account is refused (w23/059)", () => {
    const main = buildLedgerFiles(
      { preset: "personal@1", historyStart: "2026-02-01" },
      "2026-01-01",
    )["main.bean"];
    expect(main).not.toMatch(/^plugin /m);
    expect(main).not.toContain("auto_accounts");
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

  // w31/059: a known opening posts on dayBefore(historyStart), so 0001-01-01
  // underflowed to year 0000 (0000-12-31), which stock Beancount refuses.
  describe("minimum historyStart with known opening balances (w31/059)", () => {
    it.each(["100", "0"])(
      "refuses 0001-01-01 when an account has openingState known (amount %s)",
      (amount) => {
        const setup: LedgerSetup = {
          preset: "personal@1",
          operatingCurrency: "USD",
          historyStart: "0001-01-01",
          accounts: [{ name: "Assets:Cash", openingState: "known", amount }],
        };
        for (const run of [
          () => previewLedgerSetup(setup, "2026-01-01"),
          () => buildLedgerFiles(setup, "2026-01-01"),
        ]) {
          let thrown: unknown;
          try {
            run();
          } catch (error) {
            thrown = error;
          }
          expect(thrown).toBeInstanceOf(ValidationError);
          const error = thrown as ValidationError;
          expect(error.category).toBe("VALIDATION_FAILED");
          expect(error.metadata).toMatchObject({ field: "setup" });
          expect(error.message).toContain("day before");
          expect(error.message).toContain("0001-01-02");
        }
      },
    );

    it.each(["unknown", "zero"] as const)(
      "still accepts 0001-01-01 with openingState %s and emits no year-0000 dates",
      (openingState) => {
        const preview = previewLedgerSetup(
          {
            preset: "personal@1",
            operatingCurrency: "USD",
            historyStart: "0001-01-01",
            accounts: [{ name: "Assets:Cash", openingState }],
          },
          "2026-01-01",
        );
        const main = preview.files["main.bean"];
        expect(main).toContain("0001-01-01 open Assets:Cash");
        expect(main).toContain(
          `bcio_opening_balance_status: "${openingState}"`,
        );
        expect(main).not.toContain("0000-");
      },
    );

    it.each(["100", "0"])(
      "accepts 0001-01-02 with openingState known (amount %s) and posts on 0001-01-01",
      (amount) => {
        const preview = previewLedgerSetup(
          {
            preset: "personal@1",
            operatingCurrency: "USD",
            historyStart: "0001-01-02",
            accounts: [{ name: "Assets:Cash", openingState: "known", amount }],
          },
          "2026-01-01",
        );
        const main = preview.files["main.bean"];
        expect(main).toContain("0001-01-01 open Assets:Cash");
        expect(main).toContain("0001-01-01 open Equity:OpeningBalances");
        expect(main).toContain('0001-01-01 * "Opening balance"');
        expect(main).toContain(`0001-01-02 balance Assets:Cash ${amount} USD`);
        expect(main).not.toContain("0000-");
      },
    );

    it("still accepts 9999-12-31 with openingState known", () => {
      const main = previewLedgerSetup(
        {
          preset: "personal@1",
          operatingCurrency: "USD",
          historyStart: "9999-12-31",
          accounts: [
            { name: "Assets:Cash", openingState: "known", amount: "100" },
          ],
        },
        "2026-01-01",
      ).files["main.bean"];
      expect(main).toContain("9999-12-30 open Assets:Cash");
      expect(main).toContain('9999-12-30 * "Opening balance"');
      expect(main).toContain("9999-12-31 balance Assets:Cash 100 USD");
    });
  });

  // w31/078: engine Decimal holds at most 28 significant digits and 28
  // fractional digits; wider amounts silently rounded or cascaded parse errors.
  describe("28-significant-digit engine decimal limit on opening amounts (w31/078)", () => {
    it.each([
      ["29-digit integer", "10000000000000000000000000000"],
      ["29-significant-digit fraction", "1.0000000000000000000000000001"],
      ["30-significant-digit fraction", "1.00000000000000000000000000001"],
      ["30-fraction-digit small decimal", "0.000000000000000000000000000001"],
      ["29-fraction-digit small decimal", "0.00000000000000000000000000001"],
      ["34-digit overflow", "9999999999999999999999999999999999"],
      ["signed 29-digit integer", "-10000000000000000000000000000"],
      ["explicit-plus 29-digit integer", "+10000000000000000000000000000"],
    ])("refuses %s (%s) with ValidationError on setup", (_label, amount) => {
      const setup: LedgerSetup = {
        preset: "personal@1",
        operatingCurrency: "USD",
        historyStart: "2026-02-01",
        accounts: [{ name: "Assets:Bank", openingState: "known", amount }],
      };
      for (const run of [
        () => previewLedgerSetup(setup, "2026-01-01"),
        () => buildLedgerFiles(setup, "2026-01-01"),
      ]) {
        let thrown: unknown;
        try {
          run();
        } catch (error) {
          thrown = error;
        }
        expect(thrown).toBeInstanceOf(ValidationError);
        const error = thrown as ValidationError;
        expect(error.category).toBe("VALIDATION_FAILED");
        expect(error.metadata).toMatchObject({ field: "setup" });
        expect(error.message).toContain("Assets:Bank");
        expect(error.message).toContain(amount);
        expect(error.message).toContain("28 significant digits");
      }
    });

    it("truncates very long offending amount literals in the refusal message", () => {
      const huge = "9".repeat(80);
      let thrown: unknown;
      try {
        previewLedgerSetup(
          {
            preset: "personal@1",
            historyStart: "2026-02-01",
            accounts: [
              { name: "Assets:Bank", openingState: "known", amount: huge },
            ],
          },
          "2026-01-01",
        );
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(ValidationError);
      const error = thrown as ValidationError;
      expect(error.category).toBe("VALIDATION_FAILED");
      expect(error.metadata).toMatchObject({ field: "setup" });
      expect(error.message).toContain(`${"9".repeat(64)}…`);
      expect(error.message).not.toContain(huge);
    });

    it.each([
      ["28-digit integer", "1234567890123456789012345678"],
      ["negative 28-digit integer", "-1234567890123456789012345678"],
      ["positive signed 28-digit integer", "+1234567890123456789012345678"],
      [
        "leading zeros within 28 significant digits",
        "00000000000000000000000000001.23",
      ],
      ["28-fraction-digit small decimal", "0.0000000000000000000000000001"],
      [
        "28 significant digits across decimal point",
        "1.000000000000000000000000001",
      ],
    ])("accepts %s (%s)", (_label, amount) => {
      const preview = previewLedgerSetup(
        {
          preset: "personal@1",
          operatingCurrency: "USD",
          historyStart: "2026-02-01",
          accounts: [{ name: "Assets:Bank", openingState: "known", amount }],
        },
        "2026-01-01",
      );
      const expectedAmount = amount.startsWith("+") ? amount.slice(1) : amount;
      expect(preview.files["main.bean"]).toContain(
        `2026-02-01 balance Assets:Bank ${expectedAmount} USD`,
      );
    });
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
    // w31/081: non-ASCII component starts rustledger refuses, and invisible format chars
    "Assets:Bank:épargne",
    "Assets:épargne",
    "Assets:Bank:€",
    "Assets:Bank:😀",
    "Assets:Bank:—",
    "Assets:Bank:「Foo」",
    "Assets:Bank:ʰ",
    "Assets:Bank:Ⅰ",
    "Assets:Bank:²",
    "Assets:Bank:\u0301",
    "Assets:Bank:\u200cFoo",
    "Assets:Bank:Foo\u200bBar",
    "Assets:Bank:Foo\u00adBar",
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
    "Assets:Bank:Épargne",
    "Assets:Bank:Café",
    "Assets:Bank:日本",
    "Assets:Bank:خانه‌ها",
    "Assets:Bank:Foo\u200dBar",
    "Assets:Bank:١",
    "Assets:Bank:ǅ",
    "Assets:Bank:Foo—Bar",
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

describe("personal modules (w3/m59/t002)", () => {
  const TODAY = "2026-01-01";
  const personal = (modules?: LedgerSetup["modules"], extra = {}) =>
    previewLedgerSetup(
      { preset: "personal@1", historyStart: TODAY, modules, ...extra },
      TODAY,
    );
  const opens = (text: string) =>
    text.split("\n").filter((line) => / open /.test(line));

  // personal@1 as the builder wrote it before modules existed.
  const PERSONAL_MAIN_BEAN = [
    'option "title" "Personal ledger"',
    'option "operating_currency" "USD"',
    'option "inferred_tolerance_default" "*:0.001"',
    "",
    ...[
      "Assets:Bank",
      "Assets:Cash",
      "Equity:OpeningBalances",
      "Expenses:Food",
      "Expenses:Health",
      "Expenses:Housing",
      "Expenses:Other",
      "Expenses:Transport",
      "Expenses:Utilities",
      "Income:General",
      "Liabilities:CreditCard",
      "Liabilities:Loan",
    ].map((name) => `2026-01-01 open ${name}`),
    "",
  ].join("\n");

  it("leaves personal@1 byte-identical without modules, or with none", () => {
    expect(personal().files["main.bean"]).toBe(PERSONAL_MAIN_BEAN);
    expect(personal([]).files["main.bean"]).toBe(PERSONAL_MAIN_BEAN);
  });

  it("opens each module's group once, whatever the order", () => {
    const all = personal([
      { id: "investments@1" },
      { id: "rental-property@1" },
      { id: "side-business@1" },
    ]);
    const reversed = personal([
      { id: "side-business@1" },
      { id: "rental-property@1" },
      { id: "investments@1" },
    ]);
    expect(reversed.files).toEqual(all.files);
    const names = opens(all.files["main.bean"]!).map(
      (line) => line.split(" ")[2],
    );
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(
      expect.arrayContaining([
        "Assets:Brokerage",
        "Income:Rent:Property1",
        "Liabilities:Deposits:Property1",
        "Expenses:Rental:Property1:Other",
        "Assets:Business:Bank",
        "Expenses:Business:Fees",
      ]),
    );
    expect(all.accounts).toEqual([...names].sort());
  });

  it("books the brokerage FIFO in its open line", () => {
    expect(
      opens(personal([{ id: "investments@1" }]).files["main.bean"]!),
    ).toContain('2026-01-01 open Assets:Brokerage "FIFO"');
    // After the currency, when the customer gives the account one.
    const withCurrency = personal([{ id: "investments@1" }], {
      accounts: [{ name: "Assets:Brokerage", currency: "USD" }],
    });
    expect(opens(withCurrency.files["main.bean"]!)).toContain(
      '2026-01-01 open Assets:Brokerage USD "FIFO"',
    );
  });

  it("names the rental group after the property, Property1 by default", () => {
    const named = personal([
      { id: "rental-property@1", propertyName: "OakSt" },
    ]);
    expect(named.accounts).toEqual(
      expect.arrayContaining([
        "Income:Rent:OakSt",
        "Liabilities:Deposits:OakSt",
        "Expenses:Rental:OakSt:Repairs",
        "Expenses:Rental:OakSt:Insurance",
        "Expenses:Rental:OakSt:Management",
        "Expenses:Rental:OakSt:Other",
      ]),
    );
    expect(named.accounts.some((name) => name.includes("Property1"))).toBe(
      false,
    );
    expect(personal([{ id: "rental-property@1" }]).accounts).toContain(
      "Income:Rent:Property1",
    );
  });

  it("lets a first account name a selected module's account, and only then", () => {
    const funded = personal([{ id: "side-business@1" }], {
      accounts: [
        { name: "Assets:Business:Bank", openingState: "known", amount: "250" },
      ],
    });
    expect(funded.files["main.bean"]).toContain(
      "2026-01-01 balance Assets:Business:Bank 250 USD",
    );
    expect(() =>
      personal(undefined, {
        accounts: [{ name: "Assets:Business:Bank", openingState: "zero" }],
      }),
    ).toThrow(
      'Account "Assets:Business:Bank" is not part of preset "personal@1", an enabled capability, or a selected module',
    );
  });

  it.each([
    [
      "with another preset",
      { preset: "blank@1", modules: [{ id: "investments@1" }] },
      'Module "investments@1" is accepted only with preset "personal@1", not "blank@1"',
    ],
    [
      "an unknown module",
      { preset: "personal@1", modules: [{ id: "crypto@1" }] },
      'Unknown module "crypto@1"',
    ],
    [
      "a repeated module",
      {
        preset: "personal@1",
        modules: [{ id: "investments@1" }, { id: "investments@1" }],
      },
      'Module "investments@1" is selected more than once',
    ],
    // w1/214: the second entry silently replaced the first, so a known
    // opening listed again as zero dropped its balance.
    [
      "a repeated account",
      {
        preset: "personal@1",
        historyStart: "2024-01-01",
        accounts: [
          { name: "Assets:Bank", openingState: "known", amount: "10" },
          { name: "Assets:Bank", openingState: "zero" },
        ],
      },
      'Account "Assets:Bank" is listed more than once',
    ],
    [
      "a repeated known account",
      {
        preset: "personal@1",
        historyStart: "2024-01-01",
        accounts: [
          { name: "Assets:Bank", openingState: "known", amount: "10" },
          { name: "Assets:Bank", openingState: "known", amount: "20" },
        ],
      },
      'Account "Assets:Bank" is listed more than once',
    ],
    [
      "a property name on another module",
      {
        preset: "personal@1",
        modules: [{ id: "side-business@1", propertyName: "Shop" }],
      },
      'Module "side-business@1" takes no propertyName',
    ],
    [
      "a lowercase property name",
      {
        preset: "personal@1",
        modules: [{ id: "rental-property@1", propertyName: "oakSt" }],
      },
      'Property name "oakSt" for "rental-property@1" is not valid',
    ],
    [
      "a property name that would add an account component",
      {
        preset: "personal@1",
        modules: [{ id: "rental-property@1", propertyName: "Oak:St" }],
      },
      'Property name "Oak:St" for "rental-property@1" is not valid',
    ],
  ])("refuses modules %s", (_, setup, reason) => {
    expect(() => previewLedgerSetup(setup as LedgerSetup, TODAY)).toThrow(
      reason,
    );
  });

  it("refuses modules on a non-personal preset even when the list is the only change", () => {
    expect(() =>
      previewLedgerSetup(
        { preset: "freelance@1", modules: [{ id: "side-business@1" }] },
        TODAY,
      ),
    ).toThrow(ValidationError);
    // An empty list is no module at all.
    expect(() =>
      previewLedgerSetup({ preset: "freelance@1", modules: [] }, TODAY),
    ).not.toThrow();
  });
});

describe("module conformance fixtures (w3/m59/t004)", () => {
  type ModuleFixture = {
    id: string;
    spec: LedgerSetup;
    expected: {
      openedAccounts: string[];
      booking?: Record<string, string>;
      hostedFiles: Record<string, string>;
      scenario?: { entries?: string; expected: Record<string, string> };
    };
  };
  const moduleFixtures = (
    fixturesJson.fixtures as unknown as ModuleFixture[]
  ).filter((fixture) => (fixture.spec.modules ?? []).length > 0);

  it("has one fixture per module and one with all three", () => {
    expect(moduleFixtures.map((fixture) => fixture.id).sort()).toEqual([
      "personal@1-module-investments",
      "personal@1-module-rental-property",
      "personal@1-module-side-business",
      "personal@1-modules-all",
    ]);
  });

  it.each(moduleFixtures.map((fixture) => [fixture.id, fixture] as const))(
    "%s: the hosted builder opens the promised accounts and writes the pinned files",
    (_, fixture) => {
      const preview = previewLedgerSetup(fixture.spec, "2026-01-01");
      expect(preview.accounts).toEqual(
        [...fixture.expected.openedAccounts].sort(),
      );
      // The CLI conformance test runs A.9's scenario over these exact files.
      expect(preview.files).toEqual(fixture.expected.hostedFiles);
      for (const [account, method] of Object.entries(
        fixture.expected.booking ?? {},
      )) {
        expect(preview.files["main.bean"]).toMatch(
          new RegExp(`^\\S+ open ${account}( \\S+)? "${method}"$`, "m"),
        );
      }
    },
  );

  it("opens every account A.9's scenario posts to, each in its own group", () => {
    for (const fixture of moduleFixtures) {
      const scenario = fixture.expected.scenario;
      if (!scenario?.entries) continue;
      const posted = [...scenario.entries.matchAll(/^ {2}(\S+) +-?\d/gm)].map(
        (match) => match[1]!,
      );
      expect(posted.length).toBeGreaterThan(0);
      for (const account of [...posted, ...Object.keys(scenario.expected)]) {
        expect({ fixture: fixture.id, account, opened: true }).toEqual({
          fixture: fixture.id,
          account,
          opened: fixture.expected.openedAccounts.includes(account),
        });
      }
    }
  });
});
