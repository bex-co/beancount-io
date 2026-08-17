import { groupAccountsByRoot } from "../../../common/ledger-meta-utils";
import {
  ALL_ROOTS,
  findAccountLocation,
  visibleAccountSections,
} from "../picker-sections";

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
