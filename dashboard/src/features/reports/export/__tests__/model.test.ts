import { describe, expect, it } from "vitest";
import type { SerializableTreeNode } from "@/graphql/definitions";
import {
  buildBalanceSheetDocument,
  buildProfitAndLossDocument,
  flattenStatementHierarchy,
  hasStatementExportData,
  sumBalanceRecords,
} from "../model";
import { filterAccountHierarchy } from "../../balance-sheet/utils";

function node(
  account: string,
  balanceChildren: Record<string, unknown>,
  children: SerializableTreeNode[] = [],
): SerializableTreeNode {
  return {
    __typename: "SerializableTreeNode",
    account,
    balance: balanceChildren,
    balanceChildren,
    children: children as unknown as Array<Record<string, unknown>>,
    cost: null,
    costChildren: null,
    hasTxns: true,
  };
}

const baseContext = {
  reportingEntity: "Acme, Inc.",
  reportingEntitySource: "ledger_title" as const,
  ledgerName: "Acme Books",
  primaryCurrency: "USD",
  conversion: "units" as const,
  interval: "monthly" as const,
  filters: { time: "2026", account: "Assets", filter: "tag:tax" },
  reportDates: ["2026-12-31"],
  generatedAt: "2026-08-15T12:00:00.000Z",
};

describe("statement export model", () => {
  it("flattens nested and leaf accounts in stable preorder", () => {
    const hierarchy = node("Assets", { USD: "30" }, [
      node("Assets:Cash", { USD: "10" }),
      node("Assets:Investments", { USD: "20" }, [
        node("Assets:Investments:Broker", { USD: "20" }),
      ]),
    ]);

    expect(
      flattenStatementHierarchy(hierarchy, { primaryCurrency: "USD" }).map(
        ({ accountPath, label, depth, rowKind }) => ({
          accountPath,
          label,
          depth,
          rowKind,
        }),
      ),
    ).toEqual([
      {
        accountPath: "Assets",
        label: "Assets",
        depth: 0,
        rowKind: "total",
      },
      {
        accountPath: "Assets:Cash",
        label: "Cash",
        depth: 1,
        rowKind: "account",
      },
      {
        accountPath: "Assets:Investments",
        label: "Investments",
        depth: 1,
        rowKind: "subtotal",
      },
      {
        accountPath: "Assets:Investments:Broker",
        label: "Broker",
        depth: 2,
        rowKind: "account",
      },
    ]);
  });

  it("retains zero, missing-primary, and multi-currency balances", () => {
    const hierarchy = node("Assets", { EUR: "0.00", BTC: "1.25" });
    const [row] = flattenStatementHierarchy(hierarchy, {
      primaryCurrency: "USD",
    });

    expect(row.amounts).toEqual([
      { unit: "BTC", rawAmount: "1.25", displayAmount: "1.25" },
      { unit: "EUR", rawAmount: "0.00", displayAmount: "0.00" },
    ]);
  });

  it("exports the same closed-account visibility already applied on screen", () => {
    const hierarchy = node("Assets", { USD: "10" }, [
      node("Assets:Open", { USD: "10" }),
      node("Assets:Closed", {}),
    ]);
    const filtered = filterAccountHierarchy(hierarchy, {
      showZeroBalance: true,
      showZeroTransactions: true,
      showClosedAccounts: false,
      closedAccountNames: new Set(["Assets:Closed"]),
    });

    expect(
      flattenStatementHierarchy(filtered, { primaryCurrency: "USD" }).map(
        (row) => row.accountPath,
      ),
    ).toEqual(["Assets", "Assets:Open"]);
  });

  it("inverts exact decimal strings without floating-point conversion", () => {
    const [row] = flattenStatementHierarchy(
      node("Liabilities", { USD: "-9007199254740993.20", EUR: "0.00" }),
      { primaryCurrency: "USD", inverted: true },
    );

    expect(row.amounts).toEqual([
      {
        unit: "USD",
        rawAmount: "-9007199254740993.20",
        displayAmount: "9007199254740993.20",
      },
      { unit: "EUR", rawAmount: "0.00", displayAmount: "0.00" },
    ]);
  });

  it("builds the balance-sheet sections with statement display signs", () => {
    const document = buildBalanceSheetDocument({
      ...baseContext,
      title: "Balance Sheet",
      assets: node("Assets", { USD: "100" }),
      liabilities: node("Liabilities", { USD: "-40" }),
      equity: node("Equity", { USD: "-60" }),
      labels: {
        assets: "Assets",
        liabilities: "Liabilities",
        equity: "Equity",
      },
    });

    expect(document.kind).toBe("balance_sheet");
    expect(document.sections.map((section) => section.key)).toEqual([
      "assets",
      "liabilities",
      "equity",
    ]);
    expect(document.sections[1].rows[0].amounts[0]).toEqual({
      unit: "USD",
      rawAmount: "-40",
      displayAmount: "40",
    });
    expect(document.context.reportingPeriod).toMatchObject({
      startDate: null,
      endDate: null,
      asOfDate: "2026-12-31",
      isExplicit: true,
    });
  });

  it("sums period balances with exact decimals for profit and loss", () => {
    expect(
      sumBalanceRecords([
        { USD: "9007199254740993.20", EUR: "1.005" },
        { USD: "0.10", EUR: "-0.005" },
      ]),
    ).toEqual({ EUR: "1.000", USD: "9007199254740993.30" });

    const document = buildProfitAndLossDocument({
      ...baseContext,
      title: "Profit and Loss",
      income: node("Income", { USD: "-10" }),
      expenses: node("Expenses", { USD: "4" }),
      netProfitBalances: [{ USD: "-10" }, { USD: "4" }],
      labels: {
        income: "Income",
        expenses: "Expenses",
        net_profit: "Net Profit",
      },
    });

    expect(document.sections[2].rows[0].amounts).toEqual([
      { unit: "USD", rawAmount: "-6", displayAmount: "6" },
    ]);
    expect(hasStatementExportData(document)).toBe(true);
  });
});
