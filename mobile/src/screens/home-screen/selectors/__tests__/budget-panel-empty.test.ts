import fs from "fs";
import path from "path";
import { budgetPanelEmptyKey } from "../budget-panel-empty";

// w21/868: a reader of a ledger with no budgets was told to "Set a spending
// target for any account", which they cannot do.
describe("budgetPanelEmptyKey", () => {
  it("asks a guest to sign in, a writer to set a target, a reader nothing", () => {
    expect(budgetPanelEmptyKey(true, false)).toBe("budgetPanelEmptyGuest");
    expect(budgetPanelEmptyKey(false, true)).toBe("budgetPanelEmpty");
    expect(budgetPanelEmptyKey(false, false)).toBe("budgetPanelEmptyReader");
  });
});

describe("the empty-state copy elsewhere", () => {
  const read = (...parts: string[]) =>
    fs
      .readFileSync(path.join(__dirname, "..", "..", "..", ...parts), "utf8")
      .replace(/\s+/g, "");

  it("switches the Budget screen's description for a reader", () => {
    expect(
      read("budget-screen", "budget-screen.tsx").includes(
        '{t(canWrite?"budgetNoBudgetsFoundDescription":"budgetNoBudgetsFoundReader",)}',
      ),
    ).toBe(true);
  });

  it("switches Files' empty hint for a reader", () => {
    expect(
      read("ledger-file-browser-screen", "index.tsx").includes(
        't(canWrite?"ledgerEmptyHint":"ledgerEmptyHintReader")',
      ),
    ).toBe(true);
  });

  it("hands Home's panel the viewer's write access", () => {
    expect(
      read("home-screen", "home-screen.tsx").includes(
        "<BudgetCardcanWrite={canWrite}ledgerId={ledgerId}",
      ),
    ).toBe(true);
  });
});
