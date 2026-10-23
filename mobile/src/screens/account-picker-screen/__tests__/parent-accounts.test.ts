import fs from "fs";
import path from "path";
import { groupAccountsByRoot } from "../../../common/ledger-meta-utils";
import { visibleAccountSections, withParentAccounts } from "../picker-sections";

// The Transactions filter could not choose a category such as Expenses:Food:
// the picker lists only opened accounts (w21/036).
const OPENED = [
  "Assets:Cash",
  "Expenses:Food:Coffee",
  "Expenses:Food:Groceries",
  "Expenses:Food:Restaurants",
  "Expenses:Transport",
];

describe("withParentAccounts", () => {
  it("adds each parent once, just before its first child", () => {
    expect(withParentAccounts(OPENED)).toEqual([
      "Assets:Cash",
      "Expenses:Food",
      "Expenses:Food:Coffee",
      "Expenses:Food:Groceries",
      "Expenses:Food:Restaurants",
      "Expenses:Transport",
    ]);
  });

  it("adds every level of a deep account, and nothing for a shallow one", () => {
    expect(withParentAccounts(["Assets:US:Bank:Checking"])).toEqual([
      "Assets:US",
      "Assets:US:Bank",
      "Assets:US:Bank:Checking",
    ]);
    expect(withParentAccounts(["Assets:Cash"])).toEqual(["Assets:Cash"]);
  });

  it("lets a search for the category find the category first", () => {
    const accounts = withParentAccounts(OPENED);
    const [results] = visibleAccountSections(
      groupAccountsByRoot(accounts),
      accounts,
      "Expenses:Food",
      null,
    );
    expect(results!.data[0]).toBe("Expenses:Food");
  });

  it("offers parents to the filter and budget pickers only", () => {
    const screen = fs
      .readFileSync(
        path.join(__dirname, "..", "account-picker-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    // Posting pickers get the opened accounts still open on the entry's date
    // (w21/045); only the filter and budget pickers add parents (w21/396), in
    // `pickerAccounts`.
    expect(
      screen.includes(
        "pickerAccounts(type,opened,entryDate??getFormatDate(newDate()),closeDates,)",
      ),
    ).toBe(true);
  });
});

// w21/396: a parent category such as Expenses:Food could not be budgeted without
// first writing an `open` for it.
describe("the accounts a budget picker offers", () => {
  const { pickerAccounts } = require("../picker-sections");
  const { closeDatesOf } = require("../../../common/account-close-dates");
  const opened = [
    "Expenses:Food:Groceries",
    "Expenses:Food:Restaurants",
    "Expenses:Food:Coffee",
    "Expenses:Rent",
    "Expenses:Old",
  ];
  const closeDates = closeDatesOf([
    { account: "Expenses:Old", closedAt: "2026-01-31" },
  ]);

  it("includes the parent category, just before its first child", () => {
    const list = pickerAccounts("budget", opened, "2026-10-21", closeDates);
    expect(list).toEqual([
      // The root, ahead of everything under it (w21/876).
      "Expenses",
      "Expenses:Food",
      "Expenses:Food:Groceries",
      "Expenses:Food:Restaurants",
      "Expenses:Food:Coffee",
      "Expenses:Rent",
    ]);
  });

  it("still leaves out an account closed by today, and never offers a parent to a posting", () => {
    expect(
      pickerAccounts("budget", opened, "2026-10-21", closeDates).includes(
        "Expenses:Old",
      ),
    ).toBe(false);
    const posting = pickerAccounts(
      "expenses",
      opened,
      "2026-10-21",
      closeDates,
    );
    expect(posting.includes("Expenses:Food")).toBe(false);
    expect(posting.includes("Expenses:Old")).toBe(false);
  });

  it("keeps the filter's list as it was, closed accounts included", () => {
    const list = pickerAccounts("filter", opened, "2026-10-21", closeDates);
    expect(list.includes("Expenses:Food")).toBe(true);
    expect(list.includes("Expenses:Old")).toBe(true);
  });
});
