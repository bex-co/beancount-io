import fs from "fs";
import path from "path";
import type { AccountNode } from "../../../../components/account-list/select-account-list";
import {
  CASH_FLOW_ID,
  OTHER_EXPENSES_ACCOUNT,
  OTHER_INCOME_ACCOUNT,
  SAVINGS_ID,
  SHORTFALL_ID,
  cashFlowChartSummary,
  categorizeAccount,
  extractAccountAtDepth,
  isExcludedAccount,
  pickNumericAmount,
  sankeyColorForRole,
  sankeyRoleForId,
  sankeySavings,
  sankeyShortfall,
  transformToSankeyData,
  fitSankeyLabel,
  sankeyLabelLines,
  sankeyLabelWidth,
  truncateSankeyLabel,
} from "../sankey-data";
import { bg } from "../../../../translations/bg";
import { ca } from "../../../../translations/ca";
import { de } from "../../../../translations/de";
import { en } from "../../../../translations/en";
import { es } from "../../../../translations/es";
import { fa } from "../../../../translations/fa";
import { fr } from "../../../../translations/fr";
import { nl } from "../../../../translations/nl";
import { pt } from "../../../../translations/pt";
import { ru } from "../../../../translations/ru";
import { sk } from "../../../../translations/sk";
import { uk } from "../../../../translations/uk";
import { zh } from "../../../../translations/zh";

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
  refundsLabel: "Refunds",
  clawbacksLabel: "Clawbacks",
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
    expect(sankeyColorForRole(sankeyRoleForId(SHORTFALL_ID), theme)).toBe(
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
    // A refunded category flows in as Refunds, clawed-back income out as
    // Clawbacks: no negative ribbon, and every dollar balances (w21/112).
    expect(result.links.map((l) => l.source + "→" + l.target)).toEqual([
      "Income:Salary→cash-flow",
      "cash-flow→Expenses:Food",
      "__refunds__→cash-flow",
      "cash-flow→__clawbacks__",
      "cash-flow→savings",
    ]);
    // Statement totals still include the negatives so they match the cards.
    expect(result.totalIncome).toBe(950);
    expect(result.totalExpenses).toBe(380);
    // Savings is Net Profit (950 − 380), as the bar chart above reports it.
    expect(result.links.find((l) => l.target === SAVINGS_ID)?.value).toBe(570);
  });

  it("matches Net Profit with a refund, and the deficit with a clawback", () => {
    // The note's fixture: salary 900, food 300, a 100 transport refund.
    const refund = transformToSankeyData({
      income: [node("Income:Salary", 900)],
      expenses: [node("Expenses:Food", 300), node("Expenses:Transport", -100)],
      ...labels,
    });
    expect(refund.links.find((l) => l.target === SAVINGS_ID)?.value).toBe(700);
    const clawback = transformToSankeyData({
      income: [node("Income:Salary", -50)],
      expenses: [node("Expenses:Food", 300)],
      ...labels,
    });
    expect(clawback.links.find((l) => l.source === SHORTFALL_ID)?.value).toBe(
      350,
    );
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

  // A loss-making range drew a hub taller than everything feeding it: the
  // shortfall was paid from existing balances and the chart showed nothing
  // for it (w0/034, open_ledger/crypto-example May–Oct 2026).
  it("funds a deficit from savings so the hub's inflow equals its outflow", () => {
    const result = transformToSankeyData({
      income: [node("Income:Salary", 100)],
      expenses: [node("Expenses:Rent", 400)],
      ...labels,
    });
    const ids = result.nodes.map((n) => n.id);
    expect(ids.includes(SAVINGS_ID)).toBe(false);
    const shortfall = result.nodes.find((n) => n.id === SHORTFALL_ID);
    expect(shortfall).toEqual({
      id: SHORTFALL_ID,
      label: "Savings",
      role: "savings",
    });
    const into = result.links.filter((l) => l.target === CASH_FLOW_ID);
    const out = result.links.filter((l) => l.source === CASH_FLOW_ID);
    const sum = (links: { value: number }[]) =>
      links.reduce((total, l) => total + l.value, 0);
    expect(sum(into)).toBe(400);
    expect(sum(out)).toBe(400);
    expect(result.links.find((l) => l.source === SHORTFALL_ID)?.value).toBe(
      300,
    );
  });

  it("draws neither Savings nor a shortfall when income meets expenses", () => {
    const result = transformToSankeyData({
      income: [node("Income:Salary", 400)],
      expenses: [node("Expenses:Rent", 400)],
      ...labels,
    });
    const ids = result.nodes.map((n) => n.id);
    expect(ids.includes(SAVINGS_ID)).toBe(false);
    expect(ids.includes(SHORTFALL_ID)).toBe(false);
  });

  it("names the side of an income and an expense group that share a name", () => {
    // Income:Crypto and Expenses:Crypto both read "Crypto" (w0/034).
    const result = transformToSankeyData({
      income: [node("Income:Crypto", 6517), node("Income:Salary", 900)],
      expenses: [node("Expenses:Crypto", 11427), node("Expenses:Rent", 50)],
      ...labels,
      incomeNodeLabel: (name) => `${name} (income)`,
      expensesNodeLabel: (name) => `${name} (expenses)`,
    });
    const label = (id: string) => result.nodes.find((n) => n.id === id)?.label;
    expect(label("Income:Crypto")).toBe("Crypto (income)");
    expect(label("Expenses:Crypto")).toBe("Crypto (expenses)");
    expect(label("Income:Salary")).toBe("Salary");
    expect(label("Expenses:Rent")).toBe("Rent");
  });

  it("keeps the folded Other rows generic on both sides", () => {
    const many = (root: string) =>
      ["A", "B", "C", "D", "E", "F", "G"].map((name, i) =>
        node(`${root}:${name}${root}`, 100 - i),
      );
    const result = transformToSankeyData({
      income: many("Income"),
      expenses: many("Expenses"),
      ...labels,
      incomeNodeLabel: (name) => `${name} (income)`,
      expensesNodeLabel: (name) => `${name} (expenses)`,
    });
    const label = (id: string) => result.nodes.find((n) => n.id === id)?.label;
    expect(label(OTHER_INCOME_ACCOUNT)).toBe("Other");
    expect(label(OTHER_EXPENSES_ACCOUNT)).toBe("Other");
    expect(label("Income:AIncome")).toBe("AIncome");
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

describe("cashFlowChartSummary", () => {
  // Interpolates the real English copy, so a renamed key or dropped token fails.
  const t = (key: string, params?: Record<string, unknown>) =>
    String((en as unknown as Record<string, string>)[key]).replace(
      /{{(\w+)}}/g,
      (_match, name: string) => String(params?.[name]),
    );
  const flow = (incomeValue: number, expenseValue: number) =>
    transformToSankeyData({
      income: [node("Income:Salary", incomeValue)],
      expenses: [node("Expenses:Rent", expenseValue)],
      ...labels,
    });

  it("formats the totals with the currency and names savings when drawn", () => {
    expect(sankeySavings(flow(5000, 3000))).toBe(2000);
    expect(cashFlowChartSummary(flow(5000, 3000), "USD", t)).toBe(
      "Cash flow from income to expenses. Income $5K, expenses $3K, savings $2K.",
    );
  });

  it("names what a deficit draws from savings", () => {
    expect(sankeySavings(flow(3000, 5000))).toBe(null);
    expect(sankeyShortfall(flow(3000, 5000))).toBe(2000);
    expect(cashFlowChartSummary(flow(3000, 5000), "USD", t)).toBe(
      "Cash flow from income to expenses. Income $3K, expenses $5K, from savings $2K.",
    );
  });

  it("leaves savings out when income exactly meets expenses", () => {
    expect(sankeySavings(flow(5000, 5000))).toBe(null);
    expect(sankeyShortfall(flow(5000, 5000))).toBe(null);
    expect(cashFlowChartSummary(flow(5000, 5000), "USD", t)).toBe(
      "Cash flow from income to expenses. Income $5K, expenses $5K.",
    );
  });

  it("labels a currency without a symbol by its code", () => {
    expect(cashFlowChartSummary(flow(5000, 3000), "MUSD", t)).toBe(
      "Cash flow from income to expenses. Income 5K MUSD, expenses 3K MUSD, savings 2K MUSD.",
    );
  });

  it("is what the chart announces, with the Reports currency passed in", () => {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const read = (...parts: string[]) =>
      fs.readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8");
    expect(
      read("components", "cash-flow-sankey.tsx").includes(
        "accessibilityLabel={cashFlowChartSummary(data, currency, t, locale)}",
      ),
    ).toBe(true);
    expect(
      read("reports-screen.tsx")
        .replace(/\s+/gu, "")
        .includes("expenses={expense.tree}currency={currency}"),
    ).toBe(true);
  });
});

// w21/540: a label cut to one line lost its "(income)" / "(expenses)" suffix, so
// two groups of the same name read alike.
describe("sankeyLabelLines", () => {
  it("gives the name and its suffix a line each", () => {
    expect(sankeyLabelLines("QaInterest (income)")).toEqual([
      "QaInterest",
      "(income)",
    ]);
    expect(sankeyLabelLines("Investments (expenses)")).toEqual([
      "Investmen…",
      "(expenses)",
    ]);
  });

  it("tells the two sides of one name apart", () => {
    expect(sankeyLabelLines("Insurance (income)")).not.toEqual(
      sankeyLabelLines("Insurance (expenses)"),
    );
  });

  it("keeps a plain label on one line, cut as before", () => {
    expect(sankeyLabelLines("Salary")).toEqual(["Salary"]);
    expect(sankeyLabelLines("Transportation")).toEqual(["Transport…"]);
  });

  it("cuts a long localized suffix too", () => {
    expect(sankeyLabelLines("Zinsen (Einnahmen und mehr)")[1]).toBe(
      "(Einnahme…",
    );
  });
});

// w21/541: a flat half cent dropped a BTC ledger's 0.004 Food node and left
// Savings wrong.
describe("transformToSankeyData in a commodity the app has no symbol for", () => {
  const btc = (currency?: string) =>
    transformToSankeyData({
      ...labels,
      income: [node("Income:Salary", 0.05)],
      expenses: [node("Expenses:Rent", 0.02), node("Expenses:Food", 0.004)],
      currency,
    });

  it("keeps a 0.004 node and gives Savings the rest", () => {
    const data = btc("BTC");
    expect(data.nodes.some((n) => n.id === "Expenses:Food")).toBe(true);
    expect(Math.round((sankeySavings(data) ?? 0) * 1e9) / 1e9).toBe(0.026);
  });

  it("draws a month of 0.004 in and 0.003 out", () => {
    const data = transformToSankeyData({
      ...labels,
      income: [node("Income:Salary", 0.004)],
      expenses: [node("Expenses:Food", 0.003)],
      currency: "BTC",
    });
    expect(data.links.length > 0).toBe(true);
  });

  it("still treats half a cent as nothing in a known currency", () => {
    const data = transformToSankeyData({
      ...labels,
      income: [node("Income:Salary", 0.05)],
      expenses: [node("Expenses:Food", 0.004)],
      currency: "USD",
    });
    expect(data.nodes.some((n) => n.id === "Expenses:Food")).toBe(false);
  });

  it("still drops float residue in a commodity", () => {
    const data = transformToSankeyData({
      ...labels,
      income: [node("Income:Salary", 1)],
      expenses: [node("Expenses:Food", 1 + 5.55e-17)],
      currency: "BTC",
    });
    expect(sankeySavings(data)).toBe(null);
  });
});

// w21/610: income only under Income:US:* drew one "US" node while the cards
// listed Hoogle and ETrade, and a refund netted inside the merged expense node.
describe("a side whose accounts share a sub-account", () => {
  const opts = { ...labels };

  it("draws the accounts under it, not the shared sub-account", () => {
    const data = transformToSankeyData({
      ...opts,
      income: [node("Income:US:Hoogle", 9000), node("Income:US:ETrade", 400)],
      expenses: [node("Expenses:P:Rent", 2000), node("Expenses:P:Food", 300)],
    });
    const labelsOf = data.nodes.map((n) => n.label);
    expect(labelsOf.includes("Hoogle")).toBe(true);
    expect(labelsOf.includes("ETrade")).toBe(true);
    expect(labelsOf.includes("Rent")).toBe(true);
    expect(labelsOf.includes("US")).toBe(false);
    expect(labelsOf.includes("P")).toBe(false);
  });

  it("keeps the flat depth for accounts directly under the root", () => {
    const data = transformToSankeyData({
      ...opts,
      income: [node("Income:Salary:Gross", 100), node("Income:Gift", 20)],
      expenses: [node("Expenses:Food:Dining", 50)],
    });
    const labelsOf = data.nodes.map((n) => n.label);
    expect(labelsOf.includes("Salary")).toBe(true);
    expect(labelsOf.includes("Gross")).toBe(false);
  });

  it("keeps the flat depth for a single top-level account", () => {
    const data = transformToSankeyData({
      ...opts,
      income: [node("Income:Salary:Gross", 100)],
      expenses: [node("Expenses:Food", 50)],
    });
    const labelsOf = data.nodes.map((n) => n.label);
    expect(labelsOf.includes("Salary")).toBe(true);
  });
});

// w21/747: w0/034 compared only income names with expense names, so a
// category named like a node the chart adds stood beside it under one label.
describe("a category named like a node the chart adds", () => {
  const sides = {
    ...labels,
    incomeNodeLabel: (name: string) => `${name} (income)`,
    expensesNodeLabel: (name: string) => `${name} (expenses)`,
  };
  const labelsOf = (result: ReturnType<typeof transformToSankeyData>) =>
    result.nodes.map((n) => n.label);

  it("names the side of an Expenses:Savings beside the surplus", () => {
    const result = transformToSankeyData({
      income: [node("Income:Qa:Salary", 3000)],
      expenses: [
        node("Expenses:Qa:Savings", 500),
        node("Expenses:Qa:Rent", 300),
      ],
      ...sides,
    });
    // One income account is drawn at the flat depth, as its parent.
    expect(labelsOf(result)).toEqual([
      "Cash flow",
      "Qa",
      "Savings (expenses)",
      "Rent",
      "Savings",
    ]);
  });

  it("does the same beside the folded Other and the Refunds ribbon", () => {
    const folded = transformToSankeyData({
      income: [node("Income:Salary", 5000)],
      expenses: [
        node("Expenses:Other", 900),
        ...["A", "B", "C", "D", "E", "F", "G"].map((name, i) =>
          node(`Expenses:${name}`, 100 - i),
        ),
      ],
      ...sides,
    });
    const other = labelsOf(folded);
    expect(other.includes("Other (expenses)")).toBe(true);
    expect(other.filter((label) => label === "Other").length).toBe(1);

    const refunded = transformToSankeyData({
      income: [node("Income:Refunds", 50), node("Income:Salary", 1000)],
      expenses: [node("Expenses:Rent", 400), node("Expenses:Travel", -30)],
      ...sides,
    });
    const refunds = labelsOf(refunded);
    expect(refunds.includes("Refunds (income)")).toBe(true);
    expect(refunds.filter((label) => label === "Refunds").length).toBe(1);
  });

  it("leaves a chart whose names collide with nothing as it was", () => {
    const result = transformToSankeyData({
      income: [node("Income:Salary", 3000)],
      expenses: [node("Expenses:Rent", 300)],
      ...sides,
    });
    expect(labelsOf(result)).toEqual([
      "Cash flow",
      "Salary",
      "Rent",
      "Savings",
    ]);
  });
});

// w21/748: zh writes "{{name}}（收入）", full-width and with no space, so the
// label went unsplit and both nodes read "Qa2026102…".
describe("sankeyLabelLines in every language", () => {
  const locales = { bg, ca, de, en, es, fa, fr, nl, pt, ru, sk, uk, zh };

  it("gives each side its own suffix line under the shared name", () => {
    for (const [locale, words] of Object.entries(locales)) {
      const lines = (template: string) =>
        sankeyLabelLines(template.replace("{{name}}", "Qa20261020Interest"));
      const income = lines(words.sankeyIncomeNodeLabel);
      const expenses = lines(words.sankeyExpensesNodeLabel);
      expect([locale, income.length, expenses.length]).toEqual([locale, 2, 2]);
      expect([locale, income[0]]).toEqual([locale, "Qa2026102…"]);
      expect([locale, income[1] === expenses[1]]).toEqual([locale, false]);
    }
  });

  it("splits zh's full-width suffix as it reads", () => {
    expect(sankeyLabelLines("Qa20261020Interest（收入）")).toEqual([
      "Qa2026102…",
      "（收入）",
    ]);
    expect(sankeyLabelLines("Qa20261020Interest（支出）")).toEqual([
      "Qa2026102…",
      "（支出）",
    ]);
  });
});

// w21/749: ten characters were allowed whatever their width, so the income
// column's right-aligned "Qa20261020" ran past the card's left edge.
describe("fitSankeyLabel", () => {
  // CoreText's widths at 12 pt (the chart's `fontSizes.xs`), in points.
  const drawn: [string, number][] = [
    ["Qa20261020", 73.5],
    ["Qa202610…", 67.9],
    ["Groceries", 54.7],
    ["WWWWWWWWWW", 116.1],
    ["Savings", 44.1],
    ["(expenses)", 62.6],
    ["(Einnahme…", 69.3],
    ["(Einnahmen)", 71.3],
    ["(inkomsten)", 67.2],
    ["(приходи)", 58.9],
    ["Investments", 68.5],
    ["Жилье", 39.6],
    ["工资收入", 47.7],
    ["（收入）", 36.0],
  ];

  it("never reads a label narrower than the system font draws it", () => {
    for (const [text, width] of drawn) {
      expect([text, sankeyLabelWidth(text, 12) >= width]).toEqual([text, true]);
    }
  });

  it("cuts a label the column cannot hold, and leaves one it can", () => {
    // The label column (78) less its gap to the node (4). Each cut is the
    // longest CoreText draws within it: "Qa2026102…" is 75.4 pt.
    expect(fitSankeyLabel("Qa20261020", 74, 12)).toBe("Qa202610…");
    expect(fitSankeyLabel("Transportation", 74, 12)).toBe("Transporta…");
    expect(fitSankeyLabel("WWWWWWWWWW", 74, 12)).toBe("WWWWW…");
    expect(fitSankeyLabel("Savings", 74, 12)).toBe("Savings");
    expect(fitSankeyLabel("Groceries", 74, 12)).toBe("Groceries");
  });

  // w21/768: bounded per script, "(expenses)" (62.6 pt) read wider than its
  // column and lost its last letters; ten characters cut "(Einnahmen)".
  it("keeps every language's side suffix whole", () => {
    const locales = { bg, ca, de, en, es, fa, fr, nl, pt, ru, sk, uk, zh };
    for (const [locale, words] of Object.entries(locales)) {
      for (const template of [
        words.sankeyIncomeNodeLabel,
        words.sankeyExpensesNodeLabel,
      ]) {
        const [, suffix] = sankeyLabelLines(
          template.replace("{{name}}", "Savings"),
          Infinity,
        );
        expect([locale, fitSankeyLabel(suffix!, 74, 12)]).toEqual([
          locale,
          suffix,
        ]);
      }
    }
  });

  it("is what the chart draws each label line through", () => {
    const chart = fs
      .readFileSync(
        path.join(__dirname, "..", "..", "components", "cash-flow-sankey.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      chart.includes("fitSankeyLabel(text,LABEL_COL-LABEL_GAP,fontSizes.xs)"),
    ).toBe(true);
  });
});
