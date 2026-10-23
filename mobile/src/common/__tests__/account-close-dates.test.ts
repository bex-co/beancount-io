import {
  budgetHasEnded,
  closeDatesOf,
  closedAccountNamed,
  firstOpeningAfter,
  isOpenOn,
  isSeedableOn,
  notYetOpenAccountNamed,
  openOn,
} from "../account-close-dates";

// w21/045: the posting picker offered a closed account, and the save was then
// refused at Done ("Posting to inactive account … (closed on …)").
describe("accounts open on an entry's date", () => {
  const closeDates = closeDatesOf([
    { account: "Assets:Checking", closedAt: null },
    { account: "Assets:Qa20261020Closed", closedAt: "2026-09-01" },
  ]);
  const accounts = [
    "Assets:Checking",
    "Assets:Qa20261020Closed",
    "Assets:Cash",
  ];

  it("leaves out an account closed before the entry's date", () => {
    expect(openOn(accounts, "2026-10-20", closeDates)).toEqual([
      "Assets:Checking",
      "Assets:Cash",
    ]);
  });

  it("offers it again for an entry back-dated to while it was open", () => {
    expect(openOn(accounts, "2026-08-15", closeDates)).toEqual(accounts);
  });

  it("keeps it on the close date itself, where Beancount books the posting first", () => {
    expect(isOpenOn("Assets:Qa20261020Closed", "2026-09-01", closeDates)).toBe(
      true,
    );
    expect(isOpenOn("Assets:Qa20261020Closed", "2026-09-02", closeDates)).toBe(
      false,
    );
  });

  it("offers everything until close dates load", () => {
    expect(openOn(accounts, "2026-10-20", closeDatesOf(undefined))).toEqual(
      accounts,
    );
  });
});

describe("the account picker", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const source: string = require("fs").readFileSync(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("path").join(
      __dirname,
      "..",
      "..",
      "screens",
      "account-picker-screen",
      "account-picker-screen.tsx",
    ),
    "utf8",
  );

  it("filters posting pickers by the entry date and leaves the filter picker whole", () => {
    expect(
      source
        .replace(/\s+/g, "")
        .includes(
          "pickerAccounts(type,opened,entryDate??getFormatDate(newDate()),closeDates,)",
        ),
    ).toBe(true);
    // `pickerAccounts` keeps the filter list whole and dates the posting pickers.
    const sections = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "../../screens/account-picker-screen/picker-sections.ts",
      ),
      "utf8",
    );
    expect(
      sections.includes(
        'if (type === "filter") return withParentAccounts(opened);',
      ),
    ).toBe(true);
    expect(
      sections.includes("const open = openOn(opened, onDate, closeDates);"),
    ).toBe(true);
  });
});

// w21/122: a closed account's exact name offered Create in the picker, and
// Open Account then refused it as "already open".
describe("closedAccountNamed", () => {
  const { closedAccountNamed } = require("../account-close-dates");
  const closeDates = new Map([["Liabilities:QaOldCard", "2026-09-01"]]);

  it("finds a closed account by its exact name, ignoring case", () => {
    expect(
      closedAccountNamed("liabilities:qaoldcard ", "2026-10-21", closeDates),
    ).toEqual({ account: "Liabilities:QaOldCard", closedAt: "2026-09-01" });
  });

  it("finds nothing for a partial name or before the close", () => {
    expect(
      closedAccountNamed("Liabilities:QaOld", "2026-10-21", closeDates),
    ).toBe(null);
    expect(
      closedAccountNamed("Liabilities:QaOldCard", "2026-08-01", closeDates),
    ).toBe(null);
  });

  it("replaces Create in the picker and 'already open' in Open Account", () => {
    const read = (...parts: string[]) =>
      require("fs").readFileSync(
        require("path").join(__dirname, "..", "..", ...parts),
        "utf8",
      ) as string;
    const picker = read(
      "screens",
      "account-picker-screen",
      "account-picker-screen.tsx",
    );
    expect(picker.includes("!closedMatch &&")).toBe(true);
    expect(picker.includes('t("accountPickerClosedOn", {')).toBe(true);
    const open = read(
      "screens",
      "open-account-screen",
      "open-account-screen.tsx",
    );
    // The closed wording is chosen by `existingAccountNotice` (w21/723).
    expect(open.includes("existingAccountNotice(")).toBe(true);
    expect(open.includes("closeDates.get(existingName),")).toBe(true);
  });
});

// w21/229: the other half of w21/045. An account opened after a back-dated
// entry was offered, filled in by the payee seed, and refused at Done with
// "not opened until".
describe("accounts opened after an entry's date", () => {
  const dates = closeDatesOf([
    { account: "Assets:NewBank", closedAt: null, openedAt: "2026-10-01" },
    { account: "Assets:Checking", closedAt: null, openedAt: "2020-01-01" },
    {
      account: "Assets:Old",
      closedAt: "2026-09-01",
      openedAt: "2025-01-01T00:00:00Z",
    },
  ]);
  const accounts = ["Assets:NewBank", "Assets:Checking", "Assets:Old"];

  it("hides an account that is not open yet on the entry's date", () => {
    // (Assets:Old closed on 2026-09-01, so it is out as well.)
    expect(openOn(accounts, "2026-09-15", dates)).toEqual(["Assets:Checking"]);
    expect(openOn(accounts, "2026-08-15", dates)).toEqual([
      "Assets:Checking",
      "Assets:Old",
    ]);
  });

  it("shows it from its open date on, where Beancount books the open first", () => {
    expect(isOpenOn("Assets:NewBank", "2026-09-30", dates)).toBe(false);
    expect(isOpenOn("Assets:NewBank", "2026-10-01", dates)).toBe(true);
    expect(openOn(accounts, "2026-10-01", dates)).toEqual([
      "Assets:NewBank",
      "Assets:Checking",
    ]);
  });

  it("needs both ends for an account that has closed", () => {
    expect(isOpenOn("Assets:Old", "2024-12-31", dates)).toBe(false);
    expect(isOpenOn("Assets:Old", "2025-01-01", dates)).toBe(true);
    expect(isOpenOn("Assets:Old", "2026-09-01", dates)).toBe(true);
    expect(isOpenOn("Assets:Old", "2026-09-02", dates)).toBe(false);
  });

  it("falls back to the first open account for the payee seed's accounts", () => {
    const isOpen = (account: string) => isOpenOn(account, "2026-09-15", dates);
    expect(isOpen("Assets:NewBank")).toBe(false);
    expect(isOpen("Assets:Checking")).toBe(true);
  });

  it("offers everything until open dates load, as before", () => {
    expect(openOn(accounts, "2026-09-15", closeDatesOf(undefined))).toEqual(
      accounts,
    );
    // A read that supplied only close dates still filters by them alone.
    expect(
      isOpenOn(
        "Assets:NewBank",
        "2026-09-15",
        closeDatesOf([{ account: "Assets:NewBank", closedAt: null }]),
      ),
    ).toBe(true);
  });
});

// w21/256: a closed account stored decomposed is still the one the user typed.
describe("closedAccountNamed against decomposed Unicode", () => {
  it("finds it by the composed spelling", () => {
    const dates = closeDatesOf([
      { account: "Expenses:Cafe\u0301", closedAt: "2026-01-31" },
    ]);
    expect(
      closedAccountNamed("expenses:caf\u00e9", "2026-10-01", dates),
    ).toEqual({
      account: "Expenses:Cafe\u0301",
      closedAt: "2026-01-31",
    });
  });
});

// w21/281: a receipt parse could prefill an account the ledger never opened,
// and the save wrote it.
describe("isSeedableOn", () => {
  const directives = [
    { account: "Assets:Bank:Checking", openedAt: "2020-01-01" },
    { account: "Expenses:Dining", openedAt: "2020-01-01" },
    {
      account: "Assets:OldCard",
      openedAt: "2020-01-01",
      closedAt: "2024-01-01",
    },
  ];
  const dates = closeDatesOf(directives);

  it("takes a declared, open account", () => {
    expect(isSeedableOn("Expenses:Dining", "2026-10-01", dates)).toBe(true);
  });

  it("refuses an account the ledger never declared", () => {
    expect(isSeedableOn("Expenses:Food:Groceries", "2026-10-01", dates)).toBe(
      false,
    );
    expect(isSeedableOn("Assets:Cash", "2026-10-01", dates)).toBe(false);
  });

  it("still refuses a closed one", () => {
    expect(isSeedableOn("Assets:OldCard", "2026-10-01", dates)).toBe(false);
  });

  it("claims nothing when no accounts were read", () => {
    expect(isSeedableOn("Assets:Cash", "2026-10-01", closeDatesOf([]))).toBe(
      true,
    );
    expect(isSeedableOn("Assets:Cash", "2026-10-01", closeDatesOf(null))).toBe(
      true,
    );
  });
});

// w21/374: an account the ledger opens later is hidden for an earlier entry but
// its name then read as new, and Create ended at "already open".
describe("notYetOpenAccountNamed", () => {
  const closeDates = closeDatesOf([
    { account: "Assets:QaFutureBank", openedAt: "2026-11-01" },
    { account: "Assets:Cash", openedAt: "2025-01-01" },
  ]);

  it("names an account that opens after the entry's date, with its open date", () => {
    expect(
      notYetOpenAccountNamed("Assets:QaFutureBank", "2026-10-21", closeDates),
    ).toEqual({ account: "Assets:QaFutureBank", openedAt: "2026-11-01" });
    expect(
      notYetOpenAccountNamed(
        "  assets:qafuturebank ",
        "2026-10-21",
        closeDates,
      ),
    ).toEqual({ account: "Assets:QaFutureBank", openedAt: "2026-11-01" });
  });

  it("is nothing once the entry is on or after the open date, or for another name", () => {
    expect(
      notYetOpenAccountNamed("Assets:QaFutureBank", "2026-11-01", closeDates),
    ).toBe(null);
    expect(
      notYetOpenAccountNamed("Assets:Cash", "2026-10-21", closeDates),
    ).toBe(null);
    expect(notYetOpenAccountNamed("Assets:New", "2026-10-21", closeDates)).toBe(
      null,
    );
    expect(notYetOpenAccountNamed("", "2026-10-21", closeDates)).toBe(null);
  });

  it("the picker shows the opens-on row and no Create for it", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs
      .readFileSync(
        path.join(
          __dirname,
          "../../screens/account-picker-screen/account-picker-screen.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      src.includes("constshowCreateRow=!closedMatch&&!futureMatch&&"),
    ).toBe(true);
    expect(
      src.includes("constshowCreateFooter=!closedMatch&&!futureMatch&&"),
    ).toBe(true);
    expect(src.includes('testID="account-picker-opens-row"')).toBe(true);
  });
});

// w21/643: a back-dated entry's picker came up blank as "No matching accounts"
// when every account opens later.
describe("firstOpeningAfter", () => {
  const dates = closeDatesOf([
    { account: "Assets:Cash", openedAt: "2024-01-01" },
    { account: "Assets:Bank", openedAt: "2024-03-01" },
    { account: "Assets:Old", openedAt: "2020-01-01", closedAt: "2021-01-01" },
  ]);

  it("names the first opening when nothing is open on the entry's date", () => {
    expect(
      firstOpeningAfter(["Assets:Cash", "Assets:Bank"], "2023-12-31", dates),
    ).toBe("2024-01-01");
    expect(
      firstOpeningAfter(
        ["Assets:Bank", "Assets:Old", "Assets:Cash"],
        "2023-12-31",
        dates,
      ),
    ).toBe("2024-01-01");
  });

  it("is null when an account is open, or nothing opens later", () => {
    expect(
      firstOpeningAfter(["Assets:Cash", "Assets:Bank"], "2024-01-01", dates),
    ).toBe(null);
    expect(firstOpeningAfter(["Assets:Old"], "2023-12-31", dates)).toBe(null);
    expect(firstOpeningAfter([], "2023-12-31", dates)).toBe(null);
    expect(
      firstOpeningAfter(["Assets:Cash"], "2023-12-31", closeDatesOf(undefined)),
    ).toBe(null);
  });
});

// w21/624: Update on a closed account's card wrote a directive that never applied.
describe("budgetHasEnded", () => {
  it("is true once the account's close date has come", () => {
    expect(budgetHasEnded("2026-06-15", "2026-10-22")).toBe(true);
    expect(budgetHasEnded("2026-10-22", "2026-10-22")).toBe(true);
  });

  it("is false for an open account or a close date still ahead", () => {
    expect(budgetHasEnded(undefined, "2026-10-22")).toBe(false);
    expect(budgetHasEnded("2026-12-31", "2026-10-22")).toBe(false);
  });

  it("is what hides Update on the card", () => {
    const card = require("fs")
      .readFileSync(
        require("path").join(
          __dirname,
          "..",
          "..",
          "screens",
          "budget-screen",
          "components",
          "budget-group-card.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(card.includes("{onUpdate&&!budgetHasEnded(endsOn,today)&&(")).toBe(
      true,
    );
  });
});

// w21/836: an exact name is the same account in either spelling.
describe("closed and not-yet-open names across Arabic-script spellings", () => {
  const { closedAccountNamed: named } = require("../account-close-dates");
  const closed = new Map([["Assets:Qa:بانك-ملي", "2026-01-31"]]);

  test("closedAccountNamed finds the Arabic spelling from a Persian name", () => {
    expect(named("Assets:Qa:بانک-ملی", "2026-06-01", closed)?.account).toBe(
      "Assets:Qa:بانك-ملي",
    );
  });
});
