/**
 * The unit and aggregation contract, against realistic account trees.
 *
 * The defects these cover were all invisible to flattened fixtures: a parent
 * with both a balance and children, a cash leaf two levels under an investing
 * ancestor, a unit that is not USD. Every tree here has real intermediate
 * nodes for that reason.
 */
import { describe, expect, it } from "vitest";
import {
  aggregateHierarchyBalance,
  transformToSankeyData,
} from "../sankey-data-transformer";
import { buildDistributionData } from "../overview-utils";
import type { AccountMetaMap } from "@/features/reports/cash-flow/lib/model";

type Node = {
  account: string;
  balance?: Record<string, unknown> | null;
  children?: Node[];
};

const node = (
  account: string,
  balance: Record<string, unknown> | null,
  children: Node[] = [],
): Node => ({ account, balance, children });

/** The reported tax tree: two parents with postings, one empty child, one IRAUSD child. */
const taxes = node("Expenses:Taxes", null, [
  node("Expenses:Taxes:Y2015", null, [
    node("Expenses:Taxes:Y2015:US", null, [
      node("Expenses:Taxes:Y2015:US:Federal", { USD: 295.23 }, [
        node("Expenses:Taxes:Y2015:US:Federal:PreTax401k", {}),
      ]),
    ]),
  ]),
  node("Expenses:Taxes:Y2016", null, [
    node("Expenses:Taxes:Y2016:US", null, [
      node("Expenses:Taxes:Y2016:US:Federal", { USD: 27635.92 }, [
        node("Expenses:Taxes:Y2016:US:Federal:PreTax401k", { IRAUSD: 18000 }),
      ]),
    ]),
  ]),
]);

describe("aggregation across a real tree", () => {
  it("keeps both parents' postings and does not add IRAUSD to USD", () => {
    const totals = aggregateHierarchyBalance(taxes);
    // 295.23 + 27,635.92 — the two direct balances the old base case dropped.
    expect(totals.get("USD")).toBeCloseTo(27931.15, 2);
    expect(totals.get("IRAUSD")).toBe(18000);
    // The reported figure was 295.23 + 27,635.92 subtracted and 18,000 added.
    expect(totals.get("USD")).not.toBeCloseTo(42116.2, 2);
  });

  it("keeps an ancestor's own postings at every supported depth", () => {
    for (const depth of [1, 2, 3] as const) {
      const { links, unit } = transformToSankeyData({
        expensesHierarchyData: taxes as never,
        depth,
      });
      expect(unit).toBe("USD");
      const total = links
        .filter((link) => link.source === "Cash Flow")
        .reduce((sum, link) => sum + link.value, 0);
      expect(total).toBeCloseTo(27931.15, 2);
    }
  });
});

/** Assets:US with cash two levels down, plus a mixed-unit leaf. */
const assets = node("Assets:US", null, [
  node("Assets:US:BofA", null, [
    node("Assets:US:BofA:Checking", { USD: 6377.23 }),
  ]),
  node("Assets:US:ETrade", null, [
    node("Assets:US:ETrade:Cash", { USD: 386.22 }),
    node("Assets:US:ETrade:ITOT", { USD: 6154.51 }),
  ]),
  node("Assets:US:Hoogle", null, [
    node("Assets:US:Hoogle:Vacation", { VACHR: 25 }),
  ]),
]);

describe("role resolution below the grouping depth", () => {
  it("leaves nested Cash and Checking out of an investing ancestor", () => {
    // 6,377.23 + 386.22 are cash; only ITOT is investing.
    expect(aggregateHierarchyBalance(assets).get("USD")).toBe(6154.51);
  });

  it("still keeps a cash-named account that declares an activity role", () => {
    const meta: AccountMetaMap = new Map([
      ["Assets:US:ETrade:Cash", { "cash-flow-role": "investing" }],
    ]);
    expect(
      aggregateHierarchyBalance(assets, false, meta).get("USD"),
    ).toBeCloseTo(6540.73, 2);
  });

  it("excludes an account a declaration marks as cash", () => {
    const meta: AccountMetaMap = new Map([
      ["Assets:US:ETrade:ITOT", { "cash-flow-role": "cash" }],
    ]);
    expect(aggregateHierarchyBalance(assets, false, meta).size).toBe(1);
  });

  it("holds the vacation hours apart from the dollars", () => {
    expect(aggregateHierarchyBalance(assets).get("VACHR")).toBe(25);
  });
});

describe("the diagram speaks one unit", () => {
  const income = node("Income:Revenue", { MUSD: -7054 });
  const expenses = node("Expenses:CostOfRevenue", { MUSD: 1624 });

  it("names a non-USD unit rather than relabelling it", () => {
    const { unit, units, links } = transformToSankeyData({
      incomeHierarchyData: income as never,
      expensesHierarchyData: expenses as never,
    });
    expect(unit).toBe("MUSD");
    expect(units).toEqual(["MUSD"]);
    expect(links.find((l) => l.target === "Cash Flow")?.value).toBe(7054);
  });

  it("computes Savings inside the displayed unit only", () => {
    const { links, unit } = transformToSankeyData({
      incomeHierarchyData: node("Income:Salary", { USD: -1000 }) as never,
      expensesHierarchyData: node("Expenses:Food", { USD: 400 }) as never,
      assetsHierarchyData: node("Assets:Brokerage", {
        VACHR: 999,
      }) as never,
    });
    expect(unit).toBe("USD");
    // 1000 - 400, with the 999 vacation hours contributing nothing.
    expect(links.find((l) => l.target === "Savings")?.value).toBe(600);
  });

  it("reports the units it is leaving out", () => {
    const { unit, units } = transformToSankeyData({
      expensesHierarchyData: taxes as never,
      assetsHierarchyData: assets as never,
    });
    expect(unit).toBe("USD");
    expect(units).toEqual(["IRAUSD", "USD", "VACHR"]);
  });

  it("produces nothing rather than a zero-unit diagram when empty", () => {
    const empty = transformToSankeyData({});
    expect(empty.unit).toBeNull();
    expect(empty.links).toEqual([]);
  });
});

describe("distribution slices stay in one unit", () => {
  it("keeps vacation hours out of the dollar slices and the denominator", () => {
    const { items, unit, units } = buildDistributionData(assets);
    expect(unit).toBe("USD");
    expect(units).toEqual(["USD", "VACHR"]);
    // Every leaf, including the cash ones: distribution is composition, not
    // cash-flow activity, so it does not apply role exclusions.
    const total = items.reduce((sum, item) => sum + item.value, 0);
    expect(total).toBeCloseTo(6377.23 + 386.22 + 6154.51, 2);
    expect(items.some((item) => item.value === 25)).toBe(false);
  });

  it("keeps a single leaf's other units out of its own slice", () => {
    const mixed = node("Assets:Mixed", null, [
      node("Assets:Mixed:Both", { USD: 386.22, VACHR: 25 }),
    ]);
    const { items } = buildDistributionData(mixed);
    expect(items).toHaveLength(1);
    expect(items[0].value).toBe(386.22);
  });

  it("says nothing to disclose for a single-unit ledger", () => {
    const { unit, units } = buildDistributionData(
      node("Liabilities:Slate", { USD: 1768.88 }),
    );
    expect(unit).toBe("USD");
    expect(units).toEqual(["USD"]);
  });
});
