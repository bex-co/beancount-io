import {
  ACCOUNT_ROOT_PREFIXES,
  composeAccountName,
  splitPrefillAccountName,
  type AccountNameValidationReason,
  validateAccountName,
} from "../screens/open-account-screen/account-name";
import { buildOpenAccountEntry } from "../screens/open-account-screen/open-account-entry";

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

describe("splitPrefillAccountName", () => {
  it("splits a canonical name into its root and verbatim sub-path", () => {
    expect(splitPrefillAccountName("Expenses:Coffee")).toEqual({
      rootPrefix: "Expenses",
      subPath: "Coffee",
    });
    expect(splitPrefillAccountName("Assets:Bank:Checking")).toEqual({
      rootPrefix: "Assets",
      subPath: "Bank:Checking",
    });
  });

  it("matches the root case-insensitively but keeps the sub-path verbatim", () => {
    expect(splitPrefillAccountName("expenses:coffee")).toEqual({
      rootPrefix: "Expenses",
      subPath: "coffee",
    });
    expect(splitPrefillAccountName("LIABILITIES:Visa")).toEqual({
      rootPrefix: "Liabilities",
      subPath: "Visa",
    });
  });

  it("treats a bare root as that root with an empty sub-path", () => {
    for (const root of ACCOUNT_ROOT_PREFIXES) {
      expect(splitPrefillAccountName(root.toLowerCase())).toEqual({
        rootPrefix: root,
        subPath: "",
      });
    }
  });

  it("puts a rootless string under the fallback root, trimmed but unrewritten", () => {
    expect(splitPrefillAccountName("coffee shop", "Expenses")).toEqual({
      rootPrefix: "Expenses",
      subPath: "coffee shop",
    });
    expect(splitPrefillAccountName("  Coffee  ")).toEqual({
      rootPrefix: "Assets",
      subPath: "Coffee",
    });
  });

  it("does not mistake a root-prefixed word for a root", () => {
    expect(splitPrefillAccountName("Assetsy:Thing", "Expenses")).toEqual({
      rootPrefix: "Expenses",
      subPath: "Assetsy:Thing",
    });
  });

  it("round-trips a valid typed name through composeAccountName", () => {
    for (const name of ["Expenses:Coffee", "Assets:Bank:Checking"]) {
      const { rootPrefix, subPath } = splitPrefillAccountName(name);
      expect(composeAccountName(rootPrefix, subPath)).toBe(name);
      expect(validateAccountName(name)).toEqual({ ok: true });
    }
  });

  it("leaves an invalid sub-path for the screen's validation to reject", () => {
    const { rootPrefix, subPath } = splitPrefillAccountName(
      "coffee shop",
      "Expenses",
    );
    const composed = composeAccountName(rootPrefix, subPath);
    expect(composed).toBe("Expenses:coffee shop");
    expect(validateAccountName(composed)).toEqual({
      ok: false,
      reason: "componentMustStartUppercase",
    });
  });
});

describe("open account entry", () => {
  it("builds one OPEN payload with a local ISO date and currency", () => {
    const date = new Date(2026, 6, 27, 23, 30);
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
