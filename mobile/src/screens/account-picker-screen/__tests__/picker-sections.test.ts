import { groupAccountsByRoot } from "../../../common/ledger-meta-utils";
import {
  ALL_ROOTS,
  pickerAccounts,
  findAccountLocation,
  RECENT_LIMIT,
  showCreateAccountRow,
  showCreateBelowResults,
  visibleAccountSections,
} from "../picker-sections";
import { filterAccounts } from "../../../common/account-search";
import type { AccountUsage } from "../../../common/account-frecency";

/** The screen groups once and passes the result in; mirror that here. */
const sectionsFor = (
  accounts: string[],
  query: string,
  activeRoot: string | null,
) =>
  visibleAccountSections(
    groupAccountsByRoot(accounts),
    accounts,
    query,
    activeRoot,
  );

const NOW = 1_700_000_000_000;

describe("visibleAccountSections", () => {
  const accounts = [
    "Assets:Bank:Checking",
    "Assets:Cash",
    "Expenses:Food",
    "Expenses:Fun:Outdoors",
    "Income:Salary",
  ];

  describe("browsing", () => {
    test("should return every root section for the All chip", () => {
      const result = sectionsFor(accounts, "", ALL_ROOTS);

      expect(result.map((section) => section.title)).toEqual([
        "Assets",
        "Expenses",
        "Income",
      ]);
    });

    test("should narrow to the active root chip", () => {
      const result = sectionsFor(accounts, "", "Expenses");

      expect(result.length).toBe(1);
      expect(result[0].data).toEqual([
        "Expenses:Food",
        "Expenses:Fun:Outdoors",
      ]);
    });

    test("should blank the title of a lone section so no header renders", () => {
      expect(sectionsFor(accounts, "", "Expenses")[0].title).toBe("");
    });

    test("should keep titles when more than one section is shown", () => {
      const result = sectionsFor(accounts, "", ALL_ROOTS);

      expect(result.length > 1).toBe(true);
      expect(result.every(({ title }) => title.length > 0)).toBe(true);
    });

    test("should return no sections for a root with no accounts", () => {
      expect(sectionsFor(accounts, "", "Equity")).toEqual([]);
    });

    test("should treat a whitespace-only query as browsing", () => {
      const result = sectionsFor(accounts, "   ", ALL_ROOTS);

      expect(result.length).toBe(3);
    });
  });

  describe("searching", () => {
    test("should collapse to one unlabeled section of ranked results", () => {
      const result = sectionsFor(accounts, "exfo", ALL_ROOTS);

      expect(result.length).toBe(1);
      expect(result[0].title).toBe("");
      expect(result[0].data[0]).toBe("Expenses:Food");
    });

    test("should search across every root, ignoring the active chip", () => {
      const result = sectionsFor(accounts, "salary", "Assets");

      expect(result[0].data).toEqual(["Income:Salary"]);
    });

    test("should return no sections when nothing matches", () => {
      // Not one empty section: SectionList counts a section as two virtual
      // items even with no data, so `ListEmptyComponent` — the no-results
      // text and the create-account row — only renders for a truly empty
      // sections array.
      expect(sectionsFor(accounts, "zzzz", ALL_ROOTS)).toEqual([]);
    });

    test("should rank equally-good matches by the ledger's usage", () => {
      const tied = ["Expenses:Aaa:Outdoors", "Expenses:Bbb:Outdoors"];
      const usage: AccountUsage = {
        "Expenses:Bbb:Outdoors": { count: 3, lastUsedAt: NOW },
      };
      const result = visibleAccountSections(
        groupAccountsByRoot(tied),
        tied,
        "outdoors",
        ALL_ROOTS,
        { ranking: { usage, now: NOW } },
      );

      expect(result[0].data[0]).toBe("Expenses:Bbb:Outdoors");
    });

    test("should mark the results section as searched", () => {
      expect(sectionsFor(accounts, "exfo", ALL_ROOTS)[0].source).toBe("search");
    });
  });

  describe("recents", () => {
    const used = (...picked: string[]): AccountUsage =>
      Object.fromEntries(
        picked.map((account, index) => [
          account,
          // Later in the list = picked more recently, so the pinned order is
          // the reverse of the argument order.
          { count: 1, lastUsedAt: NOW - (picked.length - index) * 1000 },
        ]),
      );

    const withUsage = (
      query: string,
      activeRoot: string | null,
      usage: AccountUsage,
    ) =>
      visibleAccountSections(
        groupAccountsByRoot(accounts),
        accounts,
        query,
        activeRoot,
        { ranking: { usage, now: NOW }, recentTitle: "Recent" },
      );

    test("should pin the recents above the browse list", () => {
      const result = withUsage(
        "",
        ALL_ROOTS,
        used("Assets:Cash", "Expenses:Food"),
      );

      expect(result[0].title).toBe("Recent");
      expect(result[0].source).toBe("recents");
      expect(result[0].data).toEqual(["Expenses:Food", "Assets:Cash"]);
      expect(result.slice(1).map(({ title }) => title)).toEqual([
        "Assets",
        "Expenses",
        "Income",
      ]);
      expect(result.slice(1).every(({ source }) => source === "browse")).toBe(
        true,
      );
    });

    test("should pin at most RECENT_LIMIT accounts", () => {
      const many = [
        "Assets:Bank:Checking",
        "Assets:Cash",
        "Expenses:Food",
        "Expenses:Fun:Outdoors",
        "Income:Salary",
      ];
      expect(many.length > RECENT_LIMIT - 1).toBe(true);

      const result = withUsage("", ALL_ROOTS, used(...many));

      expect(result[0].data.length).toBe(RECENT_LIMIT);
    });

    test("should not pin an account this picker cannot offer", () => {
      // Renamed or closed elsewhere: still in the usage map, gone from the
      // ledger. It must not hold one of the five slots.
      const result = withUsage(
        "",
        ALL_ROOTS,
        used("Expenses:Deleted", "Expenses:Food"),
      );

      expect(result[0].data).toEqual(["Expenses:Food"]);
    });

    test("should keep the browse titles so the pinned block reads apart", () => {
      // Without a pinned block a lone section drops its header; under one, an
      // unlabeled block below "Recent" would look like more of it.
      const result = withUsage("", "Expenses", used("Expenses:Food"));

      expect(result.length).toBe(2);
      expect(result[1].title).toBe("Expenses");
    });

    test("should not pin anything while a query is active", () => {
      const result = withUsage("food", ALL_ROOTS, used("Expenses:Food"));

      expect(result.length).toBe(1);
      expect(result[0].source).toBe("search");
      expect(result[0].title).toBe("");
    });

    test("should render no section when there is no usage yet", () => {
      const result = withUsage("", ALL_ROOTS, {});

      expect(result.map(({ title }) => title)).toEqual([
        "Assets",
        "Expenses",
        "Income",
      ]);
      expect(result.some(({ source }) => source === "recents")).toBe(false);
    });

    test("should not pin without a header to label the block", () => {
      const result = visibleAccountSections(
        groupAccountsByRoot(accounts),
        accounts,
        "",
        ALL_ROOTS,
        { ranking: { usage: used("Expenses:Food"), now: NOW } },
      );

      expect(result.some(({ source }) => source === "recents")).toBe(false);
    });

    // A root chip narrows the pinned block too: Expenses must not lead with
    // Assets:Cash (w21/021).
    test("should pin only recents under the selected root", () => {
      const result = withUsage(
        "",
        "Expenses",
        used("Assets:Cash", "Expenses:Food"),
      );

      expect(result.map(({ title }) => title)).toEqual(["Recent", "Expenses"]);
      expect(result[0].data).toEqual(["Expenses:Food"]);
    });

    test("should drop the block when no recent is under the root", () => {
      const result = withUsage("", "Expenses", used("Assets:Cash"));

      expect(result.some(({ source }) => source === "recents")).toBe(false);
      // The lone section loses its header again.
      expect(result.map(({ title }) => title)).toEqual([""]);
    });

    test("should keep mixed recents under All", () => {
      const result = withUsage(
        "",
        ALL_ROOTS,
        used("Assets:Cash", "Expenses:Food"),
      );

      expect(result[0].data.length).toBe(2);
    });

    test("should leave the pinned accounts in the browse list too", () => {
      const result = withUsage("", ALL_ROOTS, used("Expenses:Food"));
      const expenses = result.filter(({ title }) => title === "Expenses");

      expect(expenses.length).toBe(1);
      expect(expenses[0].data.indexOf("Expenses:Food") > -1).toBe(true);
    });
  });
});

describe("findAccountLocation", () => {
  const sections = [
    { title: "Assets", data: ["Assets:Bank:Checking", "Assets:Cash"] },
    { title: "Expenses", data: ["Expenses:Food"] },
  ];

  test("should locate an account in the first section", () => {
    expect(findAccountLocation(sections, "Assets:Cash")).toEqual({
      sectionIndex: 0,
      itemIndex: 1,
    });
  });

  test("should locate an account in a later section", () => {
    expect(findAccountLocation(sections, "Expenses:Food")).toEqual({
      sectionIndex: 1,
      itemIndex: 0,
    });
  });

  test("should return null for an account that is not shown", () => {
    expect(findAccountLocation(sections, "Income:Salary")).toBe(null);
  });

  test("should return null when no account is selected", () => {
    expect(findAccountLocation(sections, undefined)).toBe(null);
  });

  test("should return null for empty sections", () => {
    expect(findAccountLocation([], "Assets:Cash")).toBe(null);
  });
});

describe("showCreateAccountRow", () => {
  const writer = { canWrite: true, loading: false };
  const reader = { canWrite: false, loading: false };

  test("should offer creation to a writer whose search matched nothing", () => {
    expect(showCreateAccountRow("Coffee", 0, writer)).toBe(true);
  });

  test("should not offer creation while browsing, even to a writer", () => {
    expect(showCreateAccountRow("", 0, writer)).toBe(false);
    expect(showCreateAccountRow("   ", 0, writer)).toBe(false);
  });

  test("should not offer creation when the search matched accounts", () => {
    expect(showCreateAccountRow("Coffee", 1, writer)).toBe(false);
  });

  test("should never offer creation to a read-only collaborator", () => {
    expect(showCreateAccountRow("Coffee", 0, reader)).toBe(false);
  });

  test("should treat unresolved permissions as read-only", () => {
    // `useLedgerAccess` reports canWrite false until the ledger's permissions
    // have been read back, so the row cannot flash enabled during the load.
    expect(
      showCreateAccountRow("Coffee", 0, { canWrite: false, loading: true }),
    ).toBe(false);
  });

  // w21/643: a new ledger's picker had nothing to browse and no way to open
  // an account, since Create waited for a query.
  test("should offer creation to a writer whose ledger has no accounts", () => {
    expect(showCreateAccountRow("", 0, writer, "posting", false)).toBe(true);
    expect(showCreateAccountRow("", 0, writer, "posting", true)).toBe(false);
    expect(showCreateAccountRow("", 0, reader, "posting", false)).toBe(false);
    expect(showCreateAccountRow("", 0, writer, "filter", false)).toBe(false);
  });

  test("should treat a failed permission query as read-only", () => {
    expect(
      showCreateAccountRow("Coffee", 0, {
        canWrite: true,
        loading: false,
        error: new Error("offline"),
      }),
    ).toBe(false);
  });
});

// w21/258: the scattered-letter matcher finds something for almost any word, so
// a genuinely new category had no Create row.
describe("showCreateBelowResults", () => {
  const writer: {
    canWrite: boolean;
    loading: boolean;
    error?: unknown;
  } = { canWrite: true, loading: false };
  const chart = [
    "Assets:Bank:Checking",
    "Assets:Cash",
    "Expenses:Food:Groceries",
    "Expenses:Housing:Rent",
    "Expenses:Transport:Tram",
    "Expenses:Travel:Hotels",
    "Income:US:Babble:Salary",
    "Liabilities:CreditCard:Visa",
  ];
  const below = (query: string, access = writer) =>
    showCreateBelowResults(query, filterAccounts(query, chart), access);

  it("offers Create under loose matches for a name the ledger lacks", () => {
    // "pets" scatters across Expenses:Transport:Tram and Expenses:Travel:Hotels.
    expect(filterAccounts("pets", chart).length > 0).toBe(true);
    expect(below("pets")).toBe(true);
    expect(below("uber")).toBe(true);
    expect(below("phone")).toBe(true);
  });

  it("does not, when an account really contains the query", () => {
    expect(below("food")).toBe(false);
    expect(below("rent")).toBe(false);
    expect(below("credit card")).toBe(false);
    expect(below("FOOD:groc")).toBe(false);
  });

  // w21/452: a full new name is a piece of a longer account's name.
  it("offers Create for a whole new name inside a longer account", () => {
    expect(below("Expenses:Food")).toBe(true);
    expect(below("Assets:Bank:Check")).toBe(true);
    expect(below("expenses: housing")).toBe(true);
    // A name the ledger has exactly is a real hit, in any case or spelling.
    expect(below("Expenses:Food:Groceries")).toBe(false);
    expect(below("expenses:food:GROCERIES")).toBe(false);
    expect(below("Assets:Cash")).toBe(false);
    // Starting below a root, it is still a search for a piece of a name.
    expect(below("FOOD:groc")).toBe(false);
    expect(below("food:groceries")).toBe(false);
  });

  // w21/928: a word inside another word's segment is not an account of that name.
  it("offers Create for a word that only sits inside other accounts' names", () => {
    const names = [
      "Expenses:Healthcare",
      "Expenses:Childcare",
      "Expenses:Home:Carpet",
      "Liabilities:CreditCard:Visa",
    ];
    for (const query of ["car", "pet"]) {
      expect(
        showCreateBelowResults(query, filterAccounts(query, names), writer),
      ).toBe(true);
    }
    expect(below("car")).toBe(true);
    // A whole segment is still a hit, however it is spaced or cased.
    expect(below("visa")).toBe(false);
    expect(below("Credit Card")).toBe(false);
    expect(below("food groceries")).toBe(false);
  });

  it("is left to the empty state when there are no results", () => {
    expect(showCreateBelowResults("zzzz", [], writer)).toBe(false);
  });

  it("is not offered to someone who may not create accounts", () => {
    expect(below("pets", { ...writer, canWrite: false })).toBe(false);
    expect(below("pets", { ...writer, error: new Error("denied") })).toBe(
      false,
    );
  });

  it("reads composed and decomposed spellings alike", () => {
    expect(
      showCreateBelowResults("caf\u00e9", ["Expenses:Cafe\u0301"], writer),
    ).toBe(false);
  });

  it("is what the picker renders under the results", () => {
    const source = require("fs")
      .readFileSync(
        require("path").join(__dirname, "..", "account-picker-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      source.includes("ListFooterComponent={showCreateFooter?createRow:null}"),
    ).toBe(true);
  });
});

// w21/528: the Transactions filter's picker offered Create, and Done on the
// Open Account screen it led to wrote an `open` from a read-only control.
describe("the filter picker never offers Create", () => {
  const access = { canWrite: true };

  it("not in the empty state", () => {
    expect(showCreateAccountRow("QaTravel", 0, access, "filter")).toBe(false);
    expect(showCreateAccountRow("QaTravel", 0, access, "posting")).toBe(true);
    expect(showCreateAccountRow("QaTravel", 0, access)).toBe(true);
  });

  it("not under search results", () => {
    const results = ["Expenses:Transport:Tram"];
    expect(showCreateBelowResults("pets", results, access, "filter")).toBe(
      false,
    );
    expect(showCreateBelowResults("pets", results, access, "budget")).toBe(
      true,
    );
  });
});

// w21/836: "No matching accounts" and a Create row for a look-alike duplicate.
describe("the picker across Arabic-script spellings", () => {
  const accounts = ["Assets:Qa20261020:بانك-ملي", "Expenses:Qa20261020:Coffee"];
  const writer = { canWrite: true, loading: false };

  test("finds the Arabic-spelled account from Persian typing", () => {
    const sections = sectionsFor(accounts, "ملی", null);
    expect(sections.length).toBe(1);
    expect(sections[0].data).toEqual(["Assets:Qa20261020:بانك-ملي"]);
    expect(showCreateAccountRow("ملی", sections.length, writer)).toBe(false);
  });

  test("offers no Create below results that already hold the name", () => {
    expect(
      showCreateBelowResults("ملی", ["Assets:Qa20261020:بانك-ملي"], writer),
    ).toBe(false);
  });
});

// w21/876: searching "Expenses" in Add Budget listed only child accounts.
describe("pickerAccounts for a budget", () => {
  const open = ["Expenses:Food", "Expenses:Food:Groceries", "Income:Salary"];
  const none = new Map() as never;

  it("offers the roots ahead of the accounts under them", () => {
    const list = pickerAccounts("budget", open, "2026-10-20", none);
    expect(list.slice(0, 2)).toEqual(["Expenses", "Income"]);
    expect(list.includes("Expenses:Food")).toBe(true);
    expect(filterAccounts("Expenses", list)[0]).toBe("Expenses");
  });

  it("leaves a root the ledger opened itself as one row", () => {
    const list = pickerAccounts(
      "budget",
      ["Expenses", "Expenses:Food"],
      "2026-10-20",
      none,
    );
    expect(list.filter((account) => account === "Expenses").length).toBe(1);
  });

  it("offers a posting no root", () => {
    expect(pickerAccounts("from", open, "2026-10-20", none)).toEqual(open);
    expect(
      pickerAccounts("to", open, "2026-10-20", none).includes("Expenses"),
    ).toBe(false);
  });
});
