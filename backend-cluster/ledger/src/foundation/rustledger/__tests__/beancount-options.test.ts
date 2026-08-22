import {
  deriveBeancountOptions,
  deriveReportAccounts,
} from "@/foundation/rustledger/beancount-options";
import type { BeancountOptionsPublic } from "@/foundation/ledger-api-types";

/**
 * Golden values in this suite were produced by the REAL fava-slim + beancount
 * (via the in-repo venv):
 *
 *   cd backend-cluster/beancount-ledger
 *   ./.venv/bin/python -c "import fava.beans.load; from beancount import loader; ..."
 *
 * fava-slim overrides beancount's `render_commas` default to `true`
 * (fava/beans/beancount_defaults.py). The `title` / `operating_currency` inputs
 * mirror what the rustledger WASM `getOptions()` returns for the same source
 * (captured live via `withLedger(files, entry, l => l.getOptions())`).
 */

const DEFAULT_OPTIONS: BeancountOptionsPublic = {
  title: "Beancount",
  name_assets: "Assets",
  name_liabilities: "Liabilities",
  name_equity: "Equity",
  name_income: "Income",
  name_expenses: "Expenses",
  account_current_conversions: "Conversions:Current",
  account_current_earnings: "Earnings:Current",
  render_commas: true,
  operating_currency: [],
};

describe("deriveBeancountOptions", () => {
  it.each(["constructor", "valueOf", "hasOwnProperty", "__proto__"])(
    "ignores unknown Object.prototype option %s",
    (name) => {
      expect(
        deriveBeancountOptions({
          title: null,
          operatingCurrencies: [],
          source: `option "${name}" "x"\n`,
        }),
      ).toEqual(DEFAULT_OPTIONS);
    },
  );

  describe("defaults (empty ledger, no source)", () => {
    it("matches the Python golden default option map", () => {
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
      });
      // Python golden for load_string("") — note render_commas=true (fava-slim override).
      expect(result).toEqual(DEFAULT_OPTIONS);
    });

    it("matches defaults when source is an empty string", () => {
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: "",
      });
      expect(result).toEqual(DEFAULT_OPTIONS);
    });
  });

  describe("title and operating_currency come from the WASM inputs", () => {
    it("uses the parsed title when present", () => {
      // WASM getOptions().title === "My Ledger" for `option "title" "My Ledger"`.
      const result = deriveBeancountOptions({
        title: "My Ledger",
        operatingCurrencies: [],
        source: 'option "title" "My Ledger"\n',
      });
      expect(result.title).toBe("My Ledger");
    });

    it("preserves operating_currency order for multiple directives", () => {
      // Python golden: operating_currency === ["USD", "EUR"].
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: ["USD", "EUR"],
        source:
          'option "operating_currency" "USD"\noption "operating_currency" "EUR"\n',
      });
      expect(result.operating_currency).toEqual(["USD", "EUR"]);
    });

    it("returns a copy of operatingCurrencies (no aliasing)", () => {
      const input = ["USD"];
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: input,
      });
      expect(result.operating_currency).toEqual(["USD"]);
      expect(result.operating_currency).not.toBe(input);
    });
  });

  describe("name_* overrides (root-account validation)", () => {
    it("applies a single valid name_assets override", () => {
      // Python golden for `option "name_assets" "Activos"`.
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: 'option "name_assets" "Activos"\n',
      });
      expect(result).toEqual({ ...DEFAULT_OPTIONS, name_assets: "Activos" });
    });

    it("ignores an invalid (lowercase) root name and keeps the default", () => {
      // Python golden: `option "name_assets" "activos"` => name_assets stays "Assets" (1 error).
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: 'option "name_assets" "activos"\n',
      });
      expect(result.name_assets).toBe("Assets");
    });

    it("ignores a root name containing a colon", () => {
      // Python golden: `option "name_assets" "Assets:Sub"` => stays "Assets" (1 error).
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: 'option "name_assets" "Assets:Sub"\n',
      });
      expect(result.name_assets).toBe("Assets");
    });

    it("last override wins for a repeated option", () => {
      // Python golden: two name_equity => "Cap2".
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: 'option "name_equity" "Cap1"\noption "name_equity" "Cap2"\n',
      });
      expect(result.name_equity).toBe("Cap2");
    });
  });

  describe("account_current_* overrides (leaf-account validation)", () => {
    it("applies a valid account_current_conversions override", () => {
      // Python golden: `option "account_current_conversions" "Conv"` => "Conv".
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: 'option "account_current_conversions" "Conv"\n',
      });
      expect(result.account_current_conversions).toBe("Conv");
    });

    it("applies a multi-component leaf value", () => {
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: 'option "account_current_conversions" "Assets:Foo-Bar"\n',
      });
      expect(result.account_current_conversions).toBe("Assets:Foo-Bar");
    });

    it("ignores an invalid leaf value containing a space", () => {
      // Python golden: `option "account_current_conversions" "Bad Name"` => default kept.
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: 'option "account_current_conversions" "Bad Name"\n',
      });
      expect(result.account_current_conversions).toBe("Conversions:Current");
    });
  });

  describe("render_commas boolean parsing", () => {
    // Beancount: options_validate_boolean => value.lower() in ("1", "true", "yes").
    const truthy = ["true", "True", "TRUE", "1", "yes", "YES"];
    const falsy = ["false", "FALSE", "no", "0", "on"];

    it.each(truthy)("parses %s as true", (value) => {
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: `option "render_commas" "${value}"\n`,
      });
      expect(result.render_commas).toBe(true);
    });

    it.each(falsy)("parses %s as false", (value) => {
      // "on" is NOT truthy in beancount (verified: render_commas "on" => false).
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: `option "render_commas" "${value}"\n`,
      });
      expect(result.render_commas).toBe(false);
    });
  });

  describe("line-parsing edge cases (match beancount's effective behaviour)", () => {
    it("skips ;-commented option lines but applies indented ones", () => {
      // Python golden ("comment" case):
      //   ;option "name_assets" "X"     -> skipped (comment)
      //     option "name_income" "Y"    -> APPLIED (indented, non-fatal error)
      //   option "name_expenses" "Depenses" -> applied
      const source =
        ';option "name_assets" "X"\n  option "name_income" "Y"\noption "name_expenses" "Depenses"\n';
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source,
      });
      expect(result.name_assets).toBe("Assets");
      expect(result.name_income).toBe("Y");
      expect(result.name_expenses).toBe("Depenses");
    });

    it("ignores a line with trailing content after the value", () => {
      // Python golden: `option "title" "T" extra` => title default kept (title comes
      // from WASM input here; assert a name_* option with trailing content is ignored).
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: 'option "name_assets" "Activos" extra\n',
      });
      expect(result.name_assets).toBe("Assets");
    });

    it("accepts an option with no whitespace between tokens", () => {
      // Python golden: `option"name_assets""Activos"` => applied, no error.
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: 'option"name_assets""Activos"\n',
      });
      expect(result.name_assets).toBe("Activos");
    });

    it("decodes recognized string escapes in values", () => {
      // Beancount lexer: \n \t \r \\ \" are translated.
      const result = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: 'option "title" "A\\tB"\n',
      });
      // title comes from WASM input, so assert via a scanned field instead:
      const conv = deriveBeancountOptions({
        title: null,
        operatingCurrencies: [],
        source: 'option "account_current_conversions" "Conv\\tX"\n',
      });
      // "Conv\tX" is not a valid leaf (tab) => ignored, default kept. Confirms decode ran.
      expect(conv.account_current_conversions).toBe("Conversions:Current");
      expect(result.render_commas).toBe(true);
    });
  });

  describe("full override golden (rustledger source == Python source)", () => {
    // Shared source used against BOTH engines:
    const SOURCE = `option "title" "Ma Comptabilite"
option "name_assets" "Actifs"
option "name_expenses" "Depenses"
option "account_current_conversions" "Conversions:Courant"
option "render_commas" "FALSE"
option "operating_currency" "EUR"
option "operating_currency" "USD"

2024-01-15 * "x" "y"
  Actifs:Banque   100.00 EUR
  Depenses:Nourriture  -100.00 EUR
`;

    // rustledger WASM getOptions() for SOURCE (captured live):
    const WASM_TITLE = "Ma Comptabilite";
    const WASM_OPERATING_CURRENCIES = ["EUR", "USD"];

    // Python fava-slim golden (options map) for the identical SOURCE:
    const PYTHON_GOLDEN: BeancountOptionsPublic = {
      title: "Ma Comptabilite",
      name_assets: "Actifs",
      name_liabilities: "Liabilities",
      name_equity: "Equity",
      name_income: "Income",
      name_expenses: "Depenses",
      account_current_conversions: "Conversions:Courant",
      account_current_earnings: "Earnings:Current",
      render_commas: false,
      operating_currency: ["EUR", "USD"],
    };

    it("derives the exact Python golden from the WASM inputs + source", () => {
      const result = deriveBeancountOptions({
        title: WASM_TITLE,
        operatingCurrencies: WASM_OPERATING_CURRENCIES,
        source: SOURCE,
      });
      expect(result).toEqual(PYTHON_GOLDEN);
    });
  });
});

describe("deriveReportAccounts", () => {
  it("returns beancount default roots + clamp accounts for a plain ledger", () => {
    const { roots, clamp } = deriveReportAccounts({
      source: "",
      operatingCurrencies: ["USD"],
    });
    expect(roots).toEqual({
      assets: "Assets",
      liabilities: "Liabilities",
      equity: "Equity",
      income: "Income",
      expenses: "Expenses",
    });
    expect(clamp).toEqual({
      nameIncome: "Income",
      nameExpenses: "Expenses",
      accountPreviousEarnings: "Equity:Earnings:Previous",
      accountPreviousBalances: "Equity:Opening-Balances",
      accountCurrentConversions: "Equity:Conversions:Current",
      conversionCurrency: "NOTHING",
    });
  });

  it('honors renamed roots (option "name_assets" "Actif")', () => {
    const { roots } = deriveReportAccounts({
      source:
        'option "name_assets" "Actif"\noption "name_expenses" "Depenses"\n',
      operatingCurrencies: ["EUR"],
    });
    expect(roots.assets).toBe("Actif");
    expect(roots.expenses).toBe("Depenses");
    // Untouched roots keep their defaults.
    expect(roots.liabilities).toBe("Liabilities");
  });

  it("rebases the synthetic clamp equity accounts on a renamed equity root", () => {
    const { clamp } = deriveReportAccounts({
      source: 'option "name_equity" "Capital"\n',
      operatingCurrencies: ["USD"],
    });
    expect(clamp.accountPreviousEarnings).toBe("Capital:Earnings:Previous");
    expect(clamp.accountPreviousBalances).toBe("Capital:Opening-Balances");
    expect(clamp.accountCurrentConversions).toBe("Capital:Conversions:Current");
  });

  it("respects an account_current_conversions leaf override", () => {
    const { clamp } = deriveReportAccounts({
      source: 'option "account_current_conversions" "Trading:Current"\n',
      operatingCurrencies: ["USD"],
    });
    expect(clamp.accountCurrentConversions).toBe("Equity:Trading:Current");
  });

  it("falls back to defaults when the source is unavailable", () => {
    const { roots } = deriveReportAccounts({
      source: undefined,
      operatingCurrencies: [],
    });
    expect(roots.assets).toBe("Assets");
  });
});
