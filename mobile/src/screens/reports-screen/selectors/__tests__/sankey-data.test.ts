import type { AccountNode } from "../../../../components/account-list/select-account-list";
import {
  CASH_FLOW_ID,
  OTHER_EXPENSES_ACCOUNT,
  OTHER_INCOME_ACCOUNT,
  SAVINGS_ID,
  categorizeAccount,
  extractAccountAtDepth,
  isExcludedAccount,
  pickNumericAmount,
  sankeyColorForRole,
  sankeyRoleForId,
  transformToSankeyData,
  truncateSankeyLabel,
} from "../sankey-data";

function node(
  account: string,
  value: number,
  children: AccountNode[] = [],
): AccountNode {
  const parts = account.split(":");
  return {
    account,
    name: parts[parts.length - 1],
    value,
    children,
  };
}

const labels = {
  otherLabel: "Other",
  cashFlowLabel: "Cash flow",
  savingsLabel: "Savings",
};

describe("categorizeAccount", () => {
  it("categorizes Income as source and Expenses as operating", () => {
    expect(categorizeAccount("Income:Salary")).toBe("source");
    expect(categorizeAccount("Expenses:Food:Restaurant")).toBe("operating");
  });

  it("excludes Equity and empty names", () => {
    expect(categorizeAccount("Equity:Opening-Balances")).toBe("exclude");
    expect(categorizeAccount("")).toBe("exclude");
  });
});

describe("isExcludedAccount", () => {
  it("excludes cash-equivalent assets", () => {
    expect(isExcludedAccount("Assets:US:BofA:Checking")).toBe(true);
    expect(isExcludedAccount("Assets:Cash")).toBe(true);
  });

  it("keeps investment accounts", () => {
    expect(isExcludedAccount("Assets:Investments:Stocks")).toBe(false);
  });
});

describe("extractAccountAtDepth", () => {
  it("cuts to the requested depth and clamps when the path is shorter", () => {
    expect(extractAccountAtDepth("Income:Salary:Gross", 2)).toBe(
      "Income:Salary",
    );
    expect(extractAccountAtDepth("Income", 2)).toBe("Income");
  });
});

describe("pickNumericAmount", () => {
  it("prefers USD, then the first currency, and inverts when asked", () => {
    expect(pickNumericAmount({ USD: -5000, EUR: 1 }, true)).toBe(5000);
    expect(pickNumericAmount({ EUR: "1500" })).toBe(1500);
    expect(pickNumericAmount(null)).toBe(0);
    expect(pickNumericAmount({ USD: "nope" })).toBe(0);
  });
});

describe("truncateSankeyLabel", () => {
  it("returns the label unchanged when it fits", () => {
    expect(truncateSankeyLabel("Salary", 10)).toBe("Salary");
  });

  it("ellipsis-truncates at maxChars and treats 1 as a bare ellipsis", () => {
    expect(truncateSankeyLabel("Transportation", 10)).toBe("Transport…");
    expect(truncateSankeyLabel("Transportation", 1)).toBe("…");
    expect(truncateSankeyLabel("Transportation", 0)).toBe("");
  });
});

describe("sankeyRoleForId / sankeyColorForRole", () => {
  const theme = {
    success: "token-success",
    error: "token-error",
    primary: "token-primary",
    information: "token-information",
  };

  it("maps special ids and account prefixes onto theme tokens", () => {
    expect(sankeyColorForRole(sankeyRoleForId(CASH_FLOW_ID), theme)).toBe(
      "token-primary",
    );
    expect(sankeyColorForRole(sankeyRoleForId("Income:Salary"), theme)).toBe(
      "token-success",
    );
    expect(sankeyColorForRole(sankeyRoleForId("Expenses:Food"), theme)).toBe(
      "token-error",
    );
    expect(sankeyColorForRole(sankeyRoleForId(SAVINGS_ID), theme)).toBe(
      "token-information",
    );
    expect(
      sankeyColorForRole(sankeyRoleForId(OTHER_INCOME_ACCOUNT), theme),
    ).toBe("token-success");
    expect(
      sankeyColorForRole(sankeyRoleForId(OTHER_EXPENSES_ACCOUNT), theme),
    ).toBe("token-error");
  });
});

describe("transformToSankeyData", () => {
  it("returns empty nodes and links for an empty tree", () => {
    const result = transformToSankeyData({
      income: [],
      expenses: [],
      ...labels,
    });
    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpenses).toBe(0);
  });

  it("builds income → hub → expenses + savings when there is a surplus", () => {
    const result = transformToSankeyData({
      income: [node("Income:Salary", 5000), node("Income:Freelance", 1000)],
      expenses: [node("Expenses:Food", 800), node("Expenses:Housing", 2000)],
      ...labels,
    });

    expect(result.totalIncome).toBe(6000);
    expect(result.totalExpenses).toBe(2800);
    expect(result.nodes.map((n) => n.id)).toEqual([
      CASH_FLOW_ID,
      "Income:Salary",
      "Income:Freelance",
      "Expenses:Housing",
      "Expenses:Food",
      SAVINGS_ID,
    ]);

    const intoHub = result.links.filter((l) => l.target === CASH_FLOW_ID);
    expect(intoHub).toEqual([
      { source: "Income:Salary", target: CASH_FLOW_ID, value: 5000 },
      { source: "Income:Freelance", target: CASH_FLOW_ID, value: 1000 },
    ]);
    expect(result.links.find((l) => l.target === SAVINGS_ID)?.value).toBe(3200);
  });

  it("reconciles totals with the input tree and preserves them across rollup", () => {
    const expenses = [
      node("Expenses:Taxes", 4000),
      node("Expenses:Home", 2000),
      node("Expenses:Food", 800),
      node("Expenses:Health", 400),
      node("Expenses:Transport", 300),
      node("Expenses:Vacation", 200),
      node("Expenses:Financial", 100),
    ];
    const income = [node("Income:US", 9000)];
    const result = transformToSankeyData({
      income,
      expenses,
      ...labels,
      topN: 5,
    });

    expect(result.totalIncome).toBe(9000);
    expect(result.totalExpenses).toBe(7800);

    const expenseLinks = result.links.filter(
      (l) =>
        l.target.startsWith("Expenses:") || l.target === OTHER_EXPENSES_ACCOUNT,
    );
    const expenseLinkSum = expenseLinks.reduce((sum, l) => sum + l.value, 0);
    expect(expenseLinkSum).toBe(7800);

    const other = expenseLinks.find((l) => l.target === OTHER_EXPENSES_ACCOUNT);
    expect(other?.value).toBe(300); // Vacation 200 + Financial 100
    expect(expenseLinks.length).toBe(6); // 5 named + Other
  });

  it("never emits a non-positive link, including a refunded category", () => {
    const result = transformToSankeyData({
      income: [node("Income:Salary", 1000), node("Income:Refund", -50)],
      expenses: [node("Expenses:Food", 400), node("Expenses:Rebate", -20)],
      ...labels,
    });

    expect(result.links.every((l) => l.value > 0)).toBe(true);
    expect(result.links.map((l) => l.source + "→" + l.target)).toEqual([
      "Income:Salary→cash-flow",
      "cash-flow→Expenses:Food",
      "cash-flow→savings",
    ]);
    // Statement totals still include the negatives so they match the cards.
    expect(result.totalIncome).toBe(950);
    expect(result.totalExpenses).toBe(380);
    // Savings balances the *drawn* flows (1000 − 400), not the statement
    // totals — otherwise the hub would outgrow the income ribbon.
    expect(result.links.find((l) => l.target === SAVINGS_ID)?.value).toBe(600);
  });

  it("keeps drawn inflows and outflows equal when there is a surplus", () => {
    const result = transformToSankeyData({
      income: [node("Income:Salary", 1000), node("Income:Refund", -50)],
      expenses: [node("Expenses:Food", 400)],
      ...labels,
    });
    const intoHub = result.links
      .filter((l) => l.target === CASH_FLOW_ID)
      .reduce((sum, l) => sum + l.value, 0);
    const outOfHub = result.links
      .filter((l) => l.source === CASH_FLOW_ID)
      .reduce((sum, l) => sum + l.value, 0);
    expect(intoHub).toBe(outOfHub);
  });

  it("aggregates children at the requested depth", () => {
    const result = transformToSankeyData({
      income: [
        node("Income:Salary", 5000, [
          node("Income:Salary:Gross", 4000),
          node("Income:Salary:Bonus", 1000),
        ]),
      ],
      expenses: [
        node("Expenses:Food", 800, [
          node("Expenses:Food:Restaurant", 300),
          node("Expenses:Food:Groceries", 500),
        ]),
      ],
      ...labels,
      depth: 2,
    });

    const ids = result.nodes.map((n) => n.id);
    expect(ids.includes("Income:Salary")).toBe(true);
    expect(ids.includes("Expenses:Food")).toBe(true);
    expect(ids.includes("Income:Salary:Gross")).toBe(false);
  });

  it("does not add a Savings node when expenses exceed income", () => {
    const result = transformToSankeyData({
      income: [node("Income:Salary", 100)],
      expenses: [node("Expenses:Rent", 400)],
      ...labels,
    });
    expect(result.nodes.map((n) => n.id).includes(SAVINGS_ID)).toBe(false);
  });

  it("skips excluded equity accounts", () => {
    const result = transformToSankeyData({
      income: [
        node("Income:Salary", 1000),
        node("Equity:Opening-Balances", 9999),
      ],
      expenses: [node("Expenses:Food", 200)],
      ...labels,
    });
    expect(result.nodes.some((n) => n.id.startsWith("Equity:"))).toBe(false);
    expect(result.totalIncome).toBe(10999);
  });
});
