import {
  ACCOUNT_ROOT_PREFIXES,
  composeAccountName,
  type AccountNameValidationReason,
  validateAccountName,
} from "../screens/open-account-screen/account-name";
import {
  buildOpenAccountEntry,
  formatOpenAccountDate,
} from "../screens/open-account-screen/open-account-entry";

describe("open account name", () => {
  it("combines every dropdown prefix with the entered sub-path", () => {
    for (const prefix of ACCOUNT_ROOT_PREFIXES) {
      const account = composeAccountName(prefix, "Bank:Checking");

      expect(account).toBe(`${prefix}:Bank:Checking`);
      expect(validateAccountName(account)).toEqual({ ok: true });
    }
  });

  it("reports the precise reason for each invalid account shape", () => {
    const invalidNames: Array<[string, AccountNameValidationReason]> = [
      ["Assets", "tooFewComponents"],
      ["Unknown:Bank", "invalidRoot"],
      ["Assets::Checking", "emptyComponent"],
      ["Assets:bank", "componentMustStartUppercase"],
      ["Assets:Bank_Checking", "invalidCharacters"],
    ];

    for (const [name, reason] of invalidNames) {
      expect(validateAccountName(name)).toEqual({ ok: false, reason });
    }
  });

  it("trims the entered components and collapses stray separators", () => {
    expect(composeAccountName("Assets", " :Bank:: Checking: ")).toBe(
      "Assets:Bank:Checking",
    );
    expect(composeAccountName("Assets", "")).toBe("Assets");
  });

  it("allows digits and hyphens after a component's uppercase initial", () => {
    expect(validateAccountName("Assets:US:PreTax401k")).toEqual({ ok: true });
    expect(validateAccountName("Equity:Opening-Balances")).toEqual({
      ok: true,
    });
  });
});

describe("open account entry", () => {
  it("builds one OPEN payload with a local ISO date and currency", () => {
    const date = new Date(2026, 6, 27, 23, 30);
    expect(formatOpenAccountDate(date)).toBe("2026-07-27");
    expect(
      buildOpenAccountEntry({
        account: "Assets:Bank:Checking",
        currencies: ["USD"],
        date,
      }),
    ).toEqual({
      type: "OPEN",
      open: {
        account: "Assets:Bank:Checking",
        currencies: ["USD"],
        date: "2026-07-27",
      },
    });
  });

  it("preserves an empty currencies list", () => {
    const entry = buildOpenAccountEntry({
      account: "Equity:Opening-Balances",
      currencies: [],
      date: new Date(2026, 0, 2),
    });

    expect(entry.open?.currencies).toEqual([]);
    expect(entry.open?.date).toBe("2026-01-02");
  });

  it("copies currencies instead of retaining mutable form state", () => {
    const currencies = ["USD"];
    const entry = buildOpenAccountEntry({
      account: "Assets:Bank:Checking",
      currencies,
      date: new Date(2026, 6, 27),
    });

    currencies.push("EUR");
    expect(entry.open?.currencies).toEqual(["USD"]);
  });
});
