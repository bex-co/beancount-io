import fs from "fs";
import path from "path";
import {
  ACCOUNT_ROOT_PREFIXES,
  composeAccountName,
  isCommodityCode,
  openAccountCurrencyChoices,
  openAccountSubmitState,
  peelTypedRoot,
  rootButtonLabel,
  splitPrefillAccountName,
  typedCurrencyCode,
  typedSubPathIssue,
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

  // Note 165: the validator applied ASCII-only rules to every component, so two
  // shapes the Beancount grammar accepts were rejected — a digit-led
  // subcomponent and a non-ASCII uppercase initial (`/^[A-Z]/` has no `u` flag).
  it("accepts a digit-led subcomponent", () => {
    for (const name of [
      "Assets:US:401k",
      "Liabilities:2026-Loan",
      "Expenses:Travel:2026",
    ]) {
      expect(validateAccountName(name)).toEqual({ ok: true });
    }
  });

  it("accepts Unicode uppercase initials and bodies in subcomponents", () => {
    for (const name of [
      "Assets:Épargne",
      "Expenses:Café",
      "Assets:Банк:Счёт",
      "Assets:Ärzte",
      // A Unicode body after an ASCII initial, too.
      "Expenses:Food:Crème",
    ]) {
      expect(validateAccountName(name)).toEqual({ ok: true });
    }
  });

  it("accepts a caseless-script initial, which the ledger grammar allows", () => {
    // Han, Hiragana, Arabic and Hebrew letters are `\p{Lo}`: they have no
    // uppercase form, so an "uppercase or digit" rule would reject them even
    // though the Beancount lexer (which keys off non-ASCII bytes, not case)
    // accepts them. A caseless letter is admitted instead.
    for (const name of [
      "Expenses:日本",
      "Expenses:日本:交通",
      "Expenses:العربية",
      "Expenses:עברית",
      "Expenses:ひらがな",
    ]) {
      expect(validateAccountName(name)).toEqual({ ok: true });
    }
    // The same characters are fine once they are not the initial, too.
    expect(validateAccountName("Expenses:Japan日本")).toEqual({ ok: true });
  });

  it("still rejects a lowercase-led name in a cased script", () => {
    // The caseless allowance must not become a loophole for scripts that do
    // distinguish case.
    for (const name of [
      "Expenses:food",
      "Expenses:épargne",
      "Expenses:ελληνικά",
      "Expenses:русский",
    ]) {
      expect(validateAccountName(name)).toEqual({
        ok: false,
        reason: "componentMustStartUppercase",
      });
    }
  });

  it("still rejects lowercase-led, underscored and spaced subcomponents", () => {
    const invalid: Array<[string, AccountNameValidationReason]> = [
      ["Assets:bank", "componentMustStartUppercase"],
      ["Assets:épargne", "componentMustStartUppercase"],
      ["Assets:Bank_Checking", "invalidCharacters"],
      ["Assets:Bank Checking", "invalidCharacters"],
      ["Assets:Café Noir", "invalidCharacters"],
      ["Assets:Bank:visa", "componentMustStartUppercase"],
    ];
    for (const [name, reason] of invalid) {
      expect(validateAccountName(name)).toEqual({ ok: false, reason });
    }
  });

  it("keeps the root strictly ASCII and canonical", () => {
    // The five roots are fixed names, so the relaxed subcomponent rules must not
    // let a Unicode or digit-led root through.
    expect(validateAccountName("Équity:Opening")).toEqual({
      ok: false,
      reason: "invalidRoot",
    });
    expect(validateAccountName("401k:Savings")).toEqual({
      ok: false,
      reason: "invalidRoot",
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
    // Words typed with spaces become one component (w21/255).
    expect(splitPrefillAccountName("coffee shop", "Expenses")).toEqual({
      rootPrefix: "Expenses",
      subPath: "CoffeeShop",
    });
    expect(splitPrefillAccountName("coffee", "Expenses")).toEqual({
      rootPrefix: "Expenses",
      subPath: "coffee",
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
      "coffee-shop",
      "Expenses",
    );
    const composed = composeAccountName(rootPrefix, subPath);
    expect(composed).toBe("Expenses:coffee-shop");
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

describe("typedSubPathIssue", () => {
  it("holds back a name that is still being typed", () => {
    expect(typedSubPathIssue("Investments:")).toBe("incomplete");
    expect(typedSubPathIssue("Bank:Checking: ")).toBe("incomplete");
  });

  it("names an empty component the composer would silently collapse", () => {
    expect(typedSubPathIssue("Bank::Checking")).toBe("emptyComponent");
    expect(typedSubPathIssue(":Bank")).toBe("emptyComponent");
  });

  it("accepts a complete name and leaves an empty field to the validator", () => {
    expect(typedSubPathIssue("Investments:Brokerage")).toBe(null);
    expect(typedSubPathIssue("Bank")).toBe(null);
    expect(typedSubPathIssue("")).toBe(null);
  });

  it("gates the form's submit, and its Return key, on the typed text", () => {
    const source = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "screens",
        "open-account-screen",
        "open-account-screen.tsx",
      ),
      "utf8",
    );
    expect(
      source.includes("const nameOk = validation.ok && typedIssue === null;"),
    ).toBe(true);
    expect(source.includes("openAccountSubmitState({")).toBe(true);
    expect(source.includes("openAccounts: meta?.accounts,")).toBe(true);
    expect(source.includes("busy: loading,")).toBe(true);
    expect(source.includes("onSubmitEditing={handleSubmit}")).toBe(true);
    expect(
      source.includes(
        't("openAccountNamePreview", { account: isolateAccountPath(account) })',
      ),
    ).toBe(true);
  });
});

describe("openAccountSubmitState", () => {
  // Open Account showed "Will be created as Assets:Bank:Checking" for an
  // account the ledger already opened, so Done wrote a duplicate `open`
  // directive and broke the ledger (w0/037).
  const open = ["Assets:Bank:Checking", "Expenses:Food", "Equity:Opening"];
  const state = (
    account: string,
    overrides: Partial<Parameters<typeof openAccountSubmitState>[0]> = {},
  ) =>
    openAccountSubmitState({
      account,
      nameOk: true,
      openAccounts: open,
      busy: false,
      ...overrides,
    });

  it("refuses an account the ledger already opens", () => {
    expect(state("Assets:Bank:Checking")).toEqual({
      canSubmit: false,
      alreadyOpen: true,
    });
  });

  it("allows a new account", () => {
    expect(state("Assets:Bank:Savings")).toEqual({
      canSubmit: true,
      alreadyOpen: false,
    });
  });

  it("treats a name differing only in case as a different account", () => {
    // Beancount account names are case-sensitive.
    expect(state("Assets:Bank:CHECKING")).toEqual({
      canSubmit: true,
      alreadyOpen: false,
    });
  });

  it("waits for the ledger's accounts before allowing any name", () => {
    expect(state("Assets:Bank:Savings", { openAccounts: undefined })).toEqual({
      canSubmit: false,
      alreadyOpen: false,
    });
  });

  it("allows a first account in an empty ledger", () => {
    expect(state("Assets:Cash", { openAccounts: [] })).toEqual({
      canSubmit: true,
      alreadyOpen: false,
    });
  });

  it("leaves an invalid or busy form to its own message", () => {
    expect(state("Assets:Bank:Checking", { nameOk: false })).toEqual({
      canSubmit: false,
      alreadyOpen: false,
    });
    expect(state("Assets:Bank:Savings", { busy: true })).toEqual({
      canSubmit: false,
      alreadyOpen: false,
    });
  });
});

// A full name typed or pasted into the sub-path used to compose under the
// selected root again: `Assets:Assets:Bank:Checking` (w21/004).
describe("peelTypedRoot", () => {
  it("moves a typed root into the selector for every root", () => {
    for (const root of ACCOUNT_ROOT_PREFIXES) {
      expect(peelTypedRoot(`${root}:Bank:Checking`, "Assets")).toEqual({
        rootPrefix: root,
        subPath: "Bank:Checking",
      });
    }
  });

  it("composes the real name, so the already-open check sees it", () => {
    const typed = peelTypedRoot("Assets:Bank:Checking", "Assets");
    const account = composeAccountName(typed.rootPrefix, typed.subPath);
    expect(account).toBe("Assets:Bank:Checking");
    expect(
      openAccountSubmitState({
        account,
        nameOk: true,
        openAccounts: ["Assets:Bank:Checking"],
        busy: false,
      }),
    ).toEqual({ alreadyOpen: true, canSubmit: false });
  });

  it("matches the root in any case and keeps the rest verbatim", () => {
    expect(peelTypedRoot("assets:Bank:X", "Expenses")).toEqual({
      rootPrefix: "Assets",
      subPath: "Bank:X",
    });
    // Lowercase components stay for validation to refuse.
    expect(peelTypedRoot("Liabilities:creditCard", "Assets")).toEqual({
      rootPrefix: "Liabilities",
      subPath: "creditCard",
    });
  });

  it("switches the selector as soon as a root and colon are typed", () => {
    expect(peelTypedRoot("Expenses:", "Assets")).toEqual({
      rootPrefix: "Expenses",
      subPath: "",
    });
  });

  it("leaves a root name later in the path, or with no colon yet, alone", () => {
    expect(peelTypedRoot("Bank:Assets", "Liabilities")).toEqual({
      rootPrefix: "Liabilities",
      subPath: "Bank:Assets",
    });
    expect(peelTypedRoot("Assets", "Equity")).toEqual({
      rootPrefix: "Equity",
      subPath: "Assets",
    });
    expect(peelTypedRoot("AssetsHeld:Gold", "Assets")).toEqual({
      rootPrefix: "Assets",
      subPath: "AssetsHeld:Gold",
    });
  });
});

describe("Open Account sub-path field", () => {
  it("peels a typed root on every change", () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "screens",
        "open-account-screen",
        "open-account-screen.tsx",
      ),
      "utf8",
    );
    expect(source.includes("peelTypedRoot(value, rootPrefix, roots)")).toBe(
      true,
    );
  });
});

// w21/041: names the ledger opens, refused by the validator (the mobile
// counterpart of the dashboard's w4/279).
describe("validateAccountName: combining marks and titlecase initials", () => {
  const decomposed = "E\u0301pargne";

  it("accepts the names the ledger opens", () => {
    for (const name of [
      "Assets:Qa-20261020:हिंदी", // Devanagari with vowel signs
      `Assets:Qa-20261020:${decomposed}`, // a decomposed accent
      "Assets:Qa-20261020:Épargne", // a composed accent
      "Assets:Qa-20261020:ǅep", // a titlecase initial
      "Assets:Qa-20261020:Snacks",
    ])
      expect(validateAccountName(name)).toEqual({ ok: true });
  });

  it("still refuses what the ledger does not", () => {
    const cases: [string, AccountNameValidationReason][] = [
      ["bank:checking", "invalidRoot"],
      ["Assets:Bank:", "emptyComponent"],
      ["Assets:Bank:Chécking Acct", "invalidCharacters"],
      ["Assets:bank", "componentMustStartUppercase"],
      // A combining mark cannot start a component.
      ["Assets:\u0301Bank", "componentMustStartUppercase"],
    ];
    for (const [name, reason] of cases)
      expect(validateAccountName(name)).toEqual({ ok: false, reason });
  });

  it("writes a decomposed name composed", () => {
    const name = composeAccountName("Assets", `Qa:${decomposed}`);
    expect(name).toBe("Assets:Qa:Épargne");
    expect(name).toBe(name.normalize("NFC"));
  });
});

// w21/085: Open Account offered only the operating currencies, and a failed
// first meta read left the default on "No currency" for good.
describe("Open Account currencies", () => {
  it("offers every commodity, operating currencies first", () => {
    expect(openAccountCurrencyChoices(["USD"], ["VTI", "EUR", "USD"])).toEqual([
      "USD",
      "EUR",
      "VTI",
    ]);
    expect(openAccountCurrencyChoices([], ["EUR"])).toEqual(["EUR"]);
  });

  it("defaults once the meta has arrived, not once loading stops", () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "screens",
        "open-account-screen",
        "open-account-screen.tsx",
      ),
      "utf8",
    );
    expect(source.includes("const metaLoaded = meta !== undefined;")).toBe(
      true,
    );
    expect(source.includes("if (!currencyInitialized && metaLoaded) {")).toBe(
      true,
    );
    expect(
      source
        .replace(/\s+/g, "")
        .includes(
          "...openAccountCurrencyChoices(currencies,meta?.currencies??[],typedCurrencies,).map(",
        ),
    ).toBe(true);
  });
});

// w21/192: accept/reject results checked against @rustledger/wasm 0.24 over
// every code point. Persian and full-width digits passed here and were then
// refused by the engine, while a ZWNJ inside a Persian word was blocked.
describe("validateAccountName against the engine's grammar", () => {
  const accepted = [
    "Assets:Bank:خانه‌ها",
    "Assets:Ab‍c",
    "Assets:Épargne",
    "Assets:ǅep",
    "Assets:US:401k",
    "Assets:日本",
    "Assets:العربية",
    "Assets:हिंदी",
  ];
  const refused: Array<
    [string, "componentMustStartUppercase" | "invalidCharacters"]
  > = [
    ["Assets:۱۴۰۲", "componentMustStartUppercase"],
    ["Assets:１２３", "componentMustStartUppercase"],
    ["Assets:٣Bank", "componentMustStartUppercase"],
    ["Assets:०", "componentMustStartUppercase"],
    ["Assets:Ⅷ", "componentMustStartUppercase"],
    ["Assets:²nd", "componentMustStartUppercase"],
    ["Assets:①Bank", "componentMustStartUppercase"],
    ["Assets:ʰBank", "componentMustStartUppercase"],
    ["Assets:ـBank", "componentMustStartUppercase"],
    ["Assets:bank", "componentMustStartUppercase"],
    ["Assets:A_b", "invalidCharacters"],
    ["Assets:A b", "invalidCharacters"],
  ];

  for (const name of accepted) {
    it(`opens ${name}`, () => {
      expect(validateAccountName(name)).toEqual({ ok: true });
    });
  }

  for (const [name, reason] of refused) {
    it(`refuses ${name}`, () => {
      expect(validateAccountName(name)).toEqual({ ok: false, reason });
    });
  }
});

// w21/234: the picker lists commodities the ledger has posted, so a first EUR,
// GBP or stock account could not be constrained to its commodity.
describe("Open Account's typed currency", () => {
  it("accepts Beancount commodity codes, upper-cased and trimmed", () => {
    for (const [typed, code] of [
      ["EUR", "EUR"],
      [" vti ", "VTI"],
      ["usdc", "USDC"],
      ["A1B", "A1B"],
      ["V", "V"],
      ["BRK.B", "BRK.B"],
      ["TSLA23", "TSLA23"],
    ]) {
      expect(typedCurrencyCode(typed)).toBe(code);
    }
  });

  it("refuses what the ledger would not read as a commodity", () => {
    for (const bad of [
      "",
      "  ",
      "1ABC",
      "-EUR",
      "EUR-",
      "E UR",
      "€",
      "ABC!",
      "A".repeat(25),
    ]) {
      expect(typedCurrencyCode(bad)).toBe(null);
    }
    expect(isCommodityCode("eur")).toBe(false);
    expect(isCommodityCode("A".repeat(24))).toBe(true);
  });

  it("offers a typed currency with the others, after the operating ones", () => {
    expect(
      openAccountCurrencyChoices(["USD"], ["VTI"], ["EUR", "VTI"]),
    ).toEqual(["USD", "EUR", "VTI"]);
    expect(openAccountCurrencyChoices([], [], ["GBP"])).toEqual(["GBP"]);
  });

  it("is a row of the currency picker that opens the typed entry", () => {
    const source = fs
      .readFileSync(
        path.join(
          __dirname,
          "..",
          "screens",
          "open-account-screen",
          "open-account-screen.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      source.includes(
        'value:OTHER_CURRENCY,label:t("openAccountOtherCurrency")',
      ),
    ).toBe(true);
    expect(source.includes("item.value===OTHER_CURRENCY")).toBe(true);
    expect(source.includes("setOtherCurrencyVisible(true)")).toBe(true);
  });
});

// w21/255: a space-separated search seeded Create with a name the form refuses.
describe("Create seeded from a search with spaces", () => {
  it("joins the words of a component", () => {
    expect(splitPrefillAccountName("credit card")).toEqual({
      rootPrefix: "Assets",
      subPath: "CreditCard",
    });
    expect(
      splitPrefillAccountName("my savings:emergency fund", "Assets"),
    ).toEqual({ rootPrefix: "Assets", subPath: "MySavings:EmergencyFund" });
    expect(splitPrefillAccountName("liabilities:credit card")).toEqual({
      rootPrefix: "Liabilities",
      subPath: "CreditCard",
    });
  });

  it("leaves text without spaces as it was", () => {
    expect(splitPrefillAccountName("Bank:Checking")).toEqual({
      rootPrefix: "Assets",
      subPath: "Bank:Checking",
    });
    expect(splitPrefillAccountName("assets:bank:checking")).toEqual({
      rootPrefix: "Assets",
      subPath: "bank:checking",
    });
  });
});

// w21/256: Open Account's duplicate check compared raw strings, so it created a
// second, identical-looking "Expenses:Café" next to a decomposed one.
describe("Open Account against decomposed Unicode", () => {
  it("says an account is already open whichever way it is spelled", () => {
    const nfd = "Expenses:Café";
    expect(
      openAccountSubmitState({
        account: "Expenses:Café",
        nameOk: true,
        openAccounts: [nfd],
        busy: false,
      }),
    ).toEqual({ alreadyOpen: true, canSubmit: false });
    expect(
      openAccountSubmitState({
        account: nfd,
        nameOk: true,
        openAccounts: ["Expenses:Café"],
        busy: false,
      }).alreadyOpen,
    ).toBe(true);
  });

  it("still lets a different account through", () => {
    expect(
      openAccountSubmitState({
        account: "Expenses:Cafés",
        nameOk: true,
        openAccounts: ["Expenses:Café"],
        busy: false,
      }),
    ).toEqual({ alreadyOpen: false, canSubmit: true });
  });
});

// w21/628: "Credit Card" was refused while "Assets:Credit Card" became CreditCard.
describe("peelTypedRoot joins words with or without a root", () => {
  it("gives the same name for the same words", () => {
    const bare = peelTypedRoot("Credit Card", "Liabilities");
    const rooted = peelTypedRoot("Liabilities:Credit Card", "Assets");
    expect(bare).toEqual({ rootPrefix: "Liabilities", subPath: "CreditCard" });
    expect(rooted).toEqual(bare);
    expect(peelTypedRoot("Bank:credit card", "Assets").subPath).toBe(
      "Bank:CreditCard",
    );
  });

  it("leaves a single word, and a word with a trailing space, as typed", () => {
    expect(peelTypedRoot("Credit", "Assets").subPath).toBe("Credit");
    expect(peelTypedRoot("Credit ", "Assets").subPath).toBe("Credit ");
  });
});

// w21/629: VoiceOver read the canonical root beside a visible renamed one.
describe("rootButtonLabel", () => {
  it("reads the ledger's name for the root", () => {
    expect(
      rootButtonLabel("Account type", "Assets", { assets: "Activos" }),
    ).toBe("Account type: Activos");
  });

  it("reads the canonical root when the ledger keeps it", () => {
    expect(rootButtonLabel("Account type", "Expenses")).toBe(
      "Account type: Expenses",
    );
  });
});
