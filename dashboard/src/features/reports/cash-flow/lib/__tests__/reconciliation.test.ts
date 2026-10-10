import { describe, expect, it } from "vitest";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { sumBalanceRecords } from "@/features/reports/export/model";
import { mergeIntervalAccountChanges } from "../merge-intervals";
import {
  buildCashFlowStatement,
  CashFlowReconciliationError,
  collectCashAccounts,
  type IntervalAccountChanges,
} from "../model";
import {
  cashTransferPayload,
  convertedSalePayload,
} from "./fixtures/converted-sale";

function buildPayload(
  payload:
    | ReturnType<typeof convertedSalePayload>
    | ReturnType<typeof cashTransferPayload>,
) {
  return buildCashFlowStatement({
    intervals: mergeIntervalAccountChanges(
      payload.incomeIntervals,
      payload.expenseIntervals,
      payload.assetIntervals,
      payload.liabilityIntervals,
      payload.equityIntervals,
    ),
    closingCashAccounts: collectCashAccounts(
      payload.getLedgerBalanceSheet.assetsHierarchyData as SerializableTreeNode,
    ),
    primaryCurrency: "USD",
  });
}

function rejection(intervals: IntervalAccountChanges[]) {
  try {
    buildCashFlowStatement({
      intervals,
      closingCashAccounts: [],
      primaryCurrency: "USD",
    });
  } catch (error) {
    expect(error).toBeInstanceOf(CashFlowReconciliationError);
    return error as CashFlowReconciliationError;
  }
  throw new Error("Expected non-conserving movements to be rejected");
}

describe("cash flow reconciliation precondition", () => {
  it("retains the public At Cost sale's independently verified cash movement and opening", () => {
    const statement = buildPayload(convertedSalePayload("at_cost"));
    expect(statement.netChange).toEqual({ USD: "905.05" });
    expect(statement.opening).toEqual({ USD: "27390.30" });
    expect(statement.closing).toEqual({ USD: "28295.35" });
    expect(statement.intervals[0].net).toEqual({ USD: "905.05" });
  });

  it.each([
    ["at_value", { USD: "60.00" }],
    ["units", { USD: "1045.00", NWRB: "-100" }],
  ] as const)(
    "rejects the actual public %s security maps despite unchanged cash",
    (conversion, differences) => {
      const payload = convertedSalePayload(conversion);
      expect(
        payload.assetIntervals[0].accountBalances["Assets:Brokerage:Cash"],
      ).toEqual({ USD: "905.05" });
      const error = rejection(
        mergeIntervalAccountChanges(
          payload.expenseIntervals,
          payload.assetIntervals,
        ),
      );
      expect(error.date).toBe("2026-05-12");
      expect(error.differences).toEqual(differences);
    },
  );

  it("rejects opposite discrepancies in separate chart intervals even when the period sum is zero", () => {
    const intervals: IntervalAccountChanges[] = [
      {
        date: "2026-05-01",
        accountChanges: { "Expenses:Fees": { USD: "60" } },
      },
      {
        date: "2026-06-01",
        accountChanges: { "Income:Refund": { USD: "-60" } },
      },
    ];
    expect(
      sumBalanceRecords(
        intervals.flatMap((point) => Object.values(point.accountChanges)),
      ),
    ).toEqual({ USD: "0" });
    expect(rejection(intervals).date).toBe("2026-05-01");
  });

  it("keeps units independent when their numbers would cancel", () => {
    const error = rejection([
      {
        date: "2026-05-01",
        accountChanges: {
          "Expenses:Fees": { USD: "100" },
          "Assets:Bank:Checking": { EUR: "-100" },
        },
      },
    ]);
    expect(error.differences).toEqual({ USD: "100", EUR: "-100" });
  });

  it("rejects a discrepancy below floating-point precision without a rounding tolerance", () => {
    const error = rejection([
      {
        date: "2026-05-01",
        accountChanges: {
          "Expenses:Fees": { USD: "0.1" },
          "Income:Salary": { USD: "-0.3" },
          "Assets:Bank:Checking": { USD: "0.20000000000000000001" },
        },
      },
    ]);
    expect(error.differences).toEqual({ USD: "0.00000000000000000001" });
  });

  it("accepts exact mixed-scale decimal conservation including zero-only units", () => {
    const statement = buildCashFlowStatement({
      intervals: [
        {
          date: "2026-05-01",
          accountChanges: {
            "Expenses:Fees": { USD: "0.1", EUR: "-0.00" },
            "Income:Salary": { USD: "-0.3" },
            "Assets:Bank:Checking": { USD: "0.20000000000000000000" },
          },
        },
      ],
      closingCashAccounts: [],
      primaryCurrency: "USD",
    });
    expect(statement.netChange).toEqual({ USD: "0.2", EUR: "0.00" });
  });

  it("rejects a filtered sale whose cash counterpart is absent", () => {
    const payload = convertedSalePayload("at_cost");
    delete (
      payload.assetIntervals[0].accountBalances as Record<string, unknown>
    )["Assets:Brokerage:Cash"];
    expect(() => buildPayload(payload)).toThrow(CashFlowReconciliationError);
  });

  it("keeps the public cash-only transfer valid without activity or invented cash movement", () => {
    const statement = buildPayload(cashTransferPayload());
    expect(statement.rows).toEqual([]);
    expect(statement.netChange).toEqual({});
    expect(statement.closing).toEqual({ USD: "60000" });
    expect(statement.opening).toEqual({ USD: "60000" });
    expect(statement.intervals[0].net).toEqual({});
  });
});
