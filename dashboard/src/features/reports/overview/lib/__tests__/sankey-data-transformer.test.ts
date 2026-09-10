import { describe, it, expect } from "vitest";
import {
  transformToSankeyData,
  SANKEY_CASH_NODE,
  SANKEY_HUB_NODE,
  type SankeyData,
  type SankeyLink,
} from "../sankey-data-transformer";
import {
  buildCashFlowStatement,
  type AccountMetaMap,
  type IntervalAccountChanges,
} from "@/features/reports/cash-flow/lib/model";
import { sumBalanceRecords } from "@/features/reports/export/model";

const PRIMARY = "USD";

/**
 * Build a real statement rather than hand-writing one: the identity the
 * Sankey relies on (netChange === sum of row amounts) is produced by
 * buildCashFlowStatement, so the fixtures must go through it.
 */
function statementFrom(
  intervals: IntervalAccountChanges[],
  accountMeta?: AccountMetaMap,
) {
  return buildCashFlowStatement({
    intervals,
    closingCashAccounts: [],
    primaryCurrency: PRIMARY,
    accountMeta,
  });
}

/** Exact decimal sum of the emitted link values on one side of the hub. */
function sumSide(links: SankeyLink[], side: "into" | "outOf"): string {
  const matching = links.filter((link) =>
    side === "into"
      ? link.target === SANKEY_HUB_NODE
      : link.source === SANKEY_HUB_NODE,
  );
  return (
    sumBalanceRecords(
      matching.map((link) => ({ [PRIMARY]: String(link.value) })),
    )[PRIMARY] ?? "0"
  );
}

function expectBalanced(data: SankeyData): void {
  expect(sumSide(data.links, "into")).toBe(sumSide(data.links, "outOf"));
}

function linkBetween(
  data: SankeyData,
  source: string,
  target: string,
): SankeyLink | undefined {
  return data.links.find(
    (link) => link.source === source && link.target === target,
  );
}

describe("transformToSankeyData", () => {
  it("draws the cash node on the outflow side when the period ran a surplus", () => {
    const statement = statementFrom([
      {
        date: "2026-01-01",
        accountChanges: {
          "Income:Salary": { USD: "-5000.00" },
          "Expenses:Rent": { USD: "2000.00" },
        },
      },
    ]);

    const data = transformToSankeyData({ statement, primaryCurrency: PRIMARY });

    expect(linkBetween(data, "Income:Salary", SANKEY_HUB_NODE)?.value).toBe(
      5000,
    );
    expect(linkBetween(data, SANKEY_HUB_NODE, "Expenses:Rent")?.value).toBe(
      2000,
    );
    expect(linkBetween(data, SANKEY_HUB_NODE, SANKEY_CASH_NODE)?.value).toBe(
      3000,
    );
    expect(
      linkBetween(data, SANKEY_CASH_NODE, SANKEY_HUB_NODE),
    ).toBeUndefined();
    expectBalanced(data);
  });

  it("draws the cash node on the inflow side when a deficit is funded by cash and a growing liability", () => {
    const statement = statementFrom([
      {
        date: "2026-01-01",
        accountChanges: {
          "Income:Salary": { USD: "-2000.00" },
          "Expenses:Rent": { USD: "4000.00" },
          // The card balance grows more negative: a financing inflow.
          "Liabilities:CreditCard": { USD: "-1000.00" },
        },
      },
    ]);

    const data = transformToSankeyData({ statement, primaryCurrency: PRIMARY });

    expect(
      linkBetween(data, "Liabilities:CreditCard", SANKEY_HUB_NODE)?.value,
    ).toBe(1000);
    expect(linkBetween(data, SANKEY_CASH_NODE, SANKEY_HUB_NODE)?.value).toBe(
      1000,
    );
    expect(
      linkBetween(data, SANKEY_HUB_NODE, SANKEY_CASH_NODE),
    ).toBeUndefined();
    expectBalanced(data);
  });

  it("draws a refund (negative expense) as an inflow instead of dropping it", () => {
    const statement = statementFrom([
      {
        date: "2026-01-01",
        accountChanges: {
          "Income:Salary": { USD: "-1000.00" },
          "Expenses:Groceries": { USD: "-50.00" },
        },
      },
    ]);

    const data = transformToSankeyData({ statement, primaryCurrency: PRIMARY });

    expect(
      linkBetween(data, "Expenses:Groceries", SANKEY_HUB_NODE)?.value,
    ).toBe(50);
    expect(
      linkBetween(data, SANKEY_HUB_NODE, "Expenses:Groceries"),
    ).toBeUndefined();
    expectBalanced(data);
  });

  it("links only the presentation currency and lists every other unit as unshown", () => {
    const statement = statementFrom([
      {
        date: "2026-01-01",
        accountChanges: {
          "Income:Salary": { USD: "-5000.00", TRY: "-20000.00" },
          "Expenses:Rent": { USD: "2000.00" },
          "Assets:Crypto:USDT": { USDT: "100.00" },
        },
      },
    ]);

    const data = transformToSankeyData({ statement, primaryCurrency: PRIMARY });

    // The USDT-only row contributes no link at all.
    expect(
      data.links.some(
        (link) =>
          link.source === "Assets:Crypto" || link.target === "Assets:Crypto",
      ),
    ).toBe(false);
    expect(data.unshownUnits).toEqual(["TRY", "USDT"]);
    expectBalanced(data);
  });

  it("aggregates rows at the requested depth, after cash accounts are excluded", () => {
    const accountMeta: AccountMetaMap = new Map([
      ["Assets:Investments:Sweep", { "cash-flow-role": "cash" }],
    ]);
    const statement = statementFrom(
      [
        {
          date: "2026-01-01",
          accountChanges: {
            "Income:Salary": { USD: "-5000.00" },
            "Assets:Investments:Brokerage": { USD: "1000.00" },
            "Assets:Investments:Bonds": { USD: "500.00" },
            // Declared cash: never a row, so never part of the aggregate.
            "Assets:Investments:Sweep": { USD: "900.00" },
          },
        },
      ],
      accountMeta,
    );

    const data = transformToSankeyData({ statement, primaryCurrency: PRIMARY });

    expect(
      linkBetween(data, SANKEY_HUB_NODE, "Assets:Investments")?.value,
    ).toBe(1500);
    expect(
      data.nodes.some((node) => node.name === "Assets:Investments:Sweep"),
    ).toBe(false);
    expectBalanced(data);
  });

  it("shows an Equity opening balance as a financing inflow", () => {
    const statement = statementFrom([
      {
        date: "2026-01-01",
        accountChanges: {
          "Equity:Opening-Balances": { USD: "-10000.00" },
          "Expenses:Rent": { USD: "2000.00" },
        },
      },
    ]);

    const data = transformToSankeyData({ statement, primaryCurrency: PRIMARY });

    expect(
      linkBetween(data, "Equity:Opening-Balances", SANKEY_HUB_NODE)?.value,
    ).toBe(10000);
    expect(
      data.nodes.find((node) => node.name === "Equity:Opening-Balances")?.kind,
    ).toBe("account");
    expectBalanced(data);
  });

  it("emits no nodes for a statement with no movement", () => {
    const data = transformToSankeyData({
      statement: statementFrom([]),
      primaryCurrency: PRIMARY,
    });

    expect(data.links).toEqual([]);
    expect(data.nodes).toEqual([]);
    expect(data.unshownUnits).toEqual([]);
  });
});
