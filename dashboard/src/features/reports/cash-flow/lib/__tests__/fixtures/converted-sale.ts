import type { ConversionOption } from "@/common/types/chart";

function hierarchyNode(
  account: string,
  balance: Record<string, string>,
  children: ReturnType<typeof cashLeaf>[] = [],
) {
  return { ...cashLeaf(account, balance), children };
}

function cashLeaf(account: string, balance: Record<string, string>) {
  return {
    __typename: "SerializableTreeNode" as const,
    account,
    balance,
    balanceChildren: balance,
    children: [],
    cost: null,
    costChildren: null,
    hasTxns: true,
  };
}

/** Public stock example, May 12 loss sale: independently read cash + security maps. */
export function convertedSalePayload(conversion: ConversionOption) {
  const securityChange =
    conversion === "units"
      ? { NWRB: "-100" }
      : { USD: conversion === "at_value" ? "-985" : "-1045" };
  return {
    incomeIntervals: [],
    expenseIntervals: [
      {
        date: "2026-05-12",
        balance: { USD: "139.95" },
        accountBalances: {
          "Expenses:Brokerage:Commissions": { USD: "4.95" },
          "Expenses:CapitalLoss:LongTerm": { USD: "135" },
        },
      },
    ],
    assetIntervals: [
      {
        date: "2026-05-12",
        balance:
          conversion === "units"
            ? { USD: "905.05", NWRB: "-100" }
            : { USD: conversion === "at_value" ? "-79.95" : "-139.95" },
        accountBalances: {
          "Assets:Brokerage:NWRB": securityChange,
          "Assets:Brokerage:Cash": { USD: "905.05" },
        },
      },
    ],
    liabilityIntervals: [],
    equityIntervals: [],
    getLedgerBalanceSheet: {
      assetsHierarchyData: hierarchyNode("Assets", { USD: "28295.35" }, [
        cashLeaf("Assets:Brokerage:Cash", { USD: "18295.35" }),
        cashLeaf("Assets:Bank:Checking", { USD: "10000" }),
      ]),
    },
    getLedgerAccountDirectives: [],
  };
}

/** Public January 8 checking -> brokerage transfer, valid under every basis. */
export function cashTransferPayload() {
  return {
    incomeIntervals: [],
    expenseIntervals: [],
    assetIntervals: [
      {
        date: "2024-01-08",
        balance: { USD: "0" },
        accountBalances: {
          "Assets:Bank:Checking": { USD: "-50000" },
          "Assets:Brokerage:Cash": { USD: "50000" },
        },
      },
    ],
    liabilityIntervals: [],
    equityIntervals: [],
    getLedgerBalanceSheet: {
      assetsHierarchyData: hierarchyNode("Assets", { USD: "60000" }, [
        cashLeaf("Assets:Bank:Checking", { USD: "10000" }),
        cashLeaf("Assets:Brokerage:Cash", { USD: "50000" }),
      ]),
    },
    getLedgerAccountDirectives: [],
  };
}
