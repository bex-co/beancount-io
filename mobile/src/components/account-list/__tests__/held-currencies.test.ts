import type { TrialBalanceQuery } from "@/generated-graphql/graphql";
import { accountOnlyCurrency, heldCurrenciesOf } from "../held-currencies";

// w21/981: a budget on a yen Expenses account stayed on USD, because the
// accounts read fills balances for Assets and Liabilities only.
const node = (
  account: string,
  balance: Record<string, string>,
  children: unknown[] = [],
) => ({ account, balance, balanceChildren: balance, children, hasTxns: true });

const trial = {
  getLedgerTrialBalance: {
    assetsHierarchyData: node("Assets", {}, [
      node("Assets:Brokerage", { AAPL: "10" }),
      node("Assets:Wise", { USD: "5", EUR: "3" }),
    ]),
    liabilitiesHierarchyData: node("Liabilities", {}),
    equityHierarchyData: node("Equity", {}),
    incomeHierarchyData: node("Income", {}, [
      node("Income:Salary", { USD: "-1000" }),
    ]),
    expensesHierarchyData: node("Expenses", {}, [
      node("Expenses:Travel", {}, [
        node("Expenses:Travel:Japan", { JPY: "120000" }),
      ]),
      node("Expenses:Food", { USD: "0", EUR: "40" }),
      node("Expenses:Empty", {}),
    ]),
  },
} as unknown as TrialBalanceQuery;

describe("accountOnlyCurrency from the trial balance in units", () => {
  const held = heldCurrenciesOf(trial);

  it("names the one currency an Expenses or Income account holds", () => {
    expect(accountOnlyCurrency("Expenses:Travel:Japan", held)).toBe("JPY");
    expect(accountOnlyCurrency(" Income:Salary ", held)).toBe("USD");
    // A currency netted to zero is not held.
    expect(accountOnlyCurrency("Expenses:Food", held)).toBe("EUR");
  });

  it("names none for several currencies, none, a parent with no own postings, or an unknown account", () => {
    expect(accountOnlyCurrency("Assets:Wise", held)).toBe(undefined);
    expect(accountOnlyCurrency("Expenses:Empty", held)).toBe(undefined);
    expect(accountOnlyCurrency("Expenses:Travel", held)).toBe(undefined);
    expect(accountOnlyCurrency("Expenses:Nowhere", held)).toBe(undefined);
    expect(accountOnlyCurrency("Expenses:Travel:Japan", new Map())).toBe(
      undefined,
    );
  });

  it("does not pre-select a stock ticker", () => {
    expect(accountOnlyCurrency("Assets:Brokerage", held)).toBe(undefined);
  });

  it("is what the form starts the budget's currency from", () => {
    const source = require("fs")
      .readFileSync(
        require("path").join(
          __dirname,
          "..",
          "..",
          "..",
          "screens",
          "add-budget-screen",
          "add-budget-screen.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      source.includes("pickedCurrency||accountOnlyCurrency(account,held)||"),
    ).toBe(true);
    expect(source.includes('useTrialBalance(ledgerId,undefined,"units")')).toBe(
      true,
    );
  });
});
