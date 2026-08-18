import { groupAccountsByRoot } from "../../../common/ledger-meta-utils";
import {
  ALL_ROOTS,
  findAccountLocation,
  RECENT_LIMIT,
  visibleAccountSections,
} from "../picker-sections";
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
