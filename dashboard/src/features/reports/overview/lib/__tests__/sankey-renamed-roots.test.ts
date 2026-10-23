import { describe, expect, it } from "vitest";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { transformToSankeyData } from "../sankey-data-transformer";
import { getSankeyColorScheme, getSankeyNodeColor } from "../sankey-colors";
import { hierarchyRoots } from "../sankey-data-transformer";

/**
 * A ledger that renames its roots (`option "name_income" "Revenus"`) showed
 * its money movement but an empty Cash Flow Sankey: every account under an
 * unknown root was dropped before its declaration was read (w4/1020). Each
 * tree's root names its type now.
 */
type Node = {
  account: string;
  balance?: Record<string, string>;
  children?: Node[];
};
const tree = (node: Node) => node as unknown as SerializableTreeNode;

/** The note's fixture: salary 100, groceries 25, 75 left in checking. */
function ledger(names: {
  assets: string;
  income: string;
  expenses: string;
  liabilities: string;
}) {
  return {
    incomeHierarchyData: tree({
      account: names.income,
      children: [
        { account: `${names.income}:Salary`, balance: { USD: "-100.00" } },
      ],
    }),
    expensesHierarchyData: tree({
      account: names.expenses,
      children: [
        { account: `${names.expenses}:Groceries`, balance: { USD: "25.00" } },
      ],
    }),
    assetsHierarchyData: tree({
      account: names.assets,
      children: [
        {
          account: `${names.assets}:Bank`,
          children: [
            {
              account: `${names.assets}:Bank:Checking`,
              balance: { USD: "75.00" },
            },
          ],
        },
      ],
    }),
    liabilitiesHierarchyData: tree({ account: names.liabilities }),
  };
}

const flows = (data: ReturnType<typeof transformToSankeyData>) =>
  data.links.map((link) => `${link.source} → ${link.target} ${link.value}`);

const FRENCH = {
  assets: "Actifs",
  income: "Revenus",
  expenses: "Charges",
  liabilities: "Dettes",
};

describe("Cash Flow Sankey with renamed roots", () => {
  it("draws the declared flows under their own account names", () => {
    const accountMeta = new Map<string, Record<string, unknown>>([
      ["Actifs:Bank:Checking", { "cash-flow-role": "cash" }],
      ["Revenus:Salary", { "cash-flow-role": "operating" }],
      ["Charges:Groceries", { "cash-flow-role": "operating" }],
    ]);
    const data = transformToSankeyData({ ...ledger(FRENCH), accountMeta });
    expect(flows(data)).toEqual([
      "Revenus:Salary → Cash Flow 100",
      "Cash Flow → Charges:Groceries 25",
      "Cash Flow → Savings 75",
    ]);
  });

  it("applies the cash heuristics to an undeclared renamed root", () => {
    // Without declarations, Actifs:Bank:Cash is cash the way Assets:Bank:Cash
    // is, so it is no investing outflow.
    const renamed = ledger(FRENCH);
    (
      renamed.assetsHierarchyData as unknown as Node
    ).children![0]!.children![0]!.account = "Actifs:Bank:Cash";
    expect(flows(transformToSankeyData(renamed))).toEqual([
      "Revenus:Salary → Cash Flow 100",
      "Cash Flow → Charges:Groceries 25",
      "Cash Flow → Savings 75",
    ]);
  });

  it("keeps the default-root ledger as it was", () => {
    const english = ledger({
      assets: "Assets",
      income: "Income",
      expenses: "Expenses",
      liabilities: "Liabilities",
    });
    (
      english.assetsHierarchyData as unknown as Node
    ).children![0]!.children![0]!.account = "Assets:Bank:Cash";
    expect(flows(transformToSankeyData(english))).toEqual([
      "Income:Salary → Cash Flow 100",
      "Cash Flow → Expenses:Groceries 25",
      "Cash Flow → Savings 75",
    ]);
  });

  it("colors renamed nodes by their type", () => {
    const roots = hierarchyRoots({
      income: ledger(FRENCH).incomeHierarchyData,
      expenses: ledger(FRENCH).expensesHierarchyData,
    });
    const scheme = getSankeyColorScheme(false);
    expect(getSankeyNodeColor("Revenus:Salary", false, null, roots)).toBe(
      scheme.income,
    );
    expect(getSankeyNodeColor("Charges:Groceries", false, null, roots)).toBe(
      scheme.expenses,
    );
  });
});
