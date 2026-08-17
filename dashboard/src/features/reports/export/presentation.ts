import {
  getCustomStatementUnits,
  getStatementUnits,
  invertDecimal,
  sumBalanceRecords,
  type StatementExportDocument,
  type StatementRow,
  type StatementSection,
} from "./model";

export type BalanceSheetSummaryKey =
  | "total_assets"
  | "total_liabilities"
  | "total_equity"
  | "total_liabilities_and_equity"
  | "reconciliation_difference";

export interface StatementPresentationAmount {
  unit: string;
  displayAmount: string;
}

export interface BalanceSheetSummaryItem {
  key: BalanceSheetSummaryKey;
  amounts: StatementPresentationAmount[];
}

export type ProfitAndLossSummaryKey =
  | "total_revenue"
  | "total_expenses"
  | "net_result";

export interface ProfitAndLossSummaryItem {
  key: ProfitAndLossSummaryKey;
  row: StatementRow;
}

function totalRow(section: StatementSection | undefined) {
  return section?.rows.find((row) => row.rowKind === "total");
}

function displayAmountsByUnit(row: StatementRow | undefined) {
  return Object.fromEntries(
    (row?.amounts ?? []).map((amount) => [amount.unit, amount.displayAmount]),
  );
}

function invertBalance(balance: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(balance).map(([unit, value]) => [
      unit,
      invertDecimal(value),
    ]),
  );
}

function orderedUnits(document: StatementExportDocument) {
  return getStatementUnits(document).sort((left, right) => {
    if (left === right) return 0;
    if (left === document.context.primaryCurrency) return -1;
    if (right === document.context.primaryCurrency) return 1;
    return left.localeCompare(right);
  });
}

function presentationAmounts(
  balance: Record<string, string>,
  units: readonly string[],
): StatementPresentationAmount[] {
  return units.map((unit) => ({
    unit,
    displayAmount: balance[unit] ?? "0",
  }));
}

/** Build the accounting-equation control from the three hierarchy roots. */
export function getBalanceSheetSummaryItems(
  document: StatementExportDocument,
): BalanceSheetSummaryItem[] {
  if (document.kind !== "balance_sheet") return [];

  const sections = new Map(
    document.sections.map((section) => [section.key, section]),
  );
  const assets = displayAmountsByUnit(totalRow(sections.get("assets")));
  const liabilities = displayAmountsByUnit(
    totalRow(sections.get("liabilities")),
  );
  const equity = displayAmountsByUnit(totalRow(sections.get("equity")));
  const liabilitiesAndEquity = sumBalanceRecords([liabilities, equity]);
  const reconciliationDifference = sumBalanceRecords([
    assets,
    invertBalance(liabilitiesAndEquity),
  ]);
  const units = orderedUnits(document);

  if (units.length === 0) return [];

  return [
    { key: "total_assets", amounts: presentationAmounts(assets, units) },
    {
      key: "total_liabilities",
      amounts: presentationAmounts(liabilities, units),
    },
    { key: "total_equity", amounts: presentationAmounts(equity, units) },
    {
      key: "total_liabilities_and_equity",
      amounts: presentationAmounts(liabilitiesAndEquity, units),
    },
    {
      key: "reconciliation_difference",
      amounts: presentationAmounts(reconciliationDifference, units),
    },
  ];
}

/** Keep each root total, but move it below the complete account hierarchy. */
export function getBalanceSheetSupportingSections(
  document: StatementExportDocument,
): StatementSection[] {
  if (document.kind !== "balance_sheet") return [];

  return document.sections
    .filter(
      (section) =>
        section.key === "assets" ||
        section.key === "liabilities" ||
        section.key === "equity",
    )
    .map((section) => ({
      ...section,
      rows: [
        ...section.rows.filter((row) => row.rowKind !== "total"),
        ...section.rows.filter((row) => row.rowKind === "total"),
      ],
    }))
    .filter((section) => section.rows.length > 0);
}

export function isZeroStatementAmount(value: string): boolean {
  return /^[+-]?0+(?:\.0+)?$/.test(value.trim());
}

export function hasBalanceSheetReconciliationDifference(
  document: StatementExportDocument,
): boolean {
  const reconciliation = getBalanceSheetSummaryItems(document).find(
    (item) => item.key === "reconciliation_difference",
  );
  return (
    reconciliation?.amounts.some(
      (amount) => !isZeroStatementAmount(amount.displayAmount),
    ) ?? false
  );
}

/** Build the conventional single-step statement from hierarchy root totals. */
export function getProfitAndLossSummaryItems(
  document: StatementExportDocument,
): ProfitAndLossSummaryItem[] {
  if (document.kind !== "profit_and_loss") return [];

  const sections = new Map(
    document.sections.map((section) => [section.key, section]),
  );
  const incomeTotal = totalRow(sections.get("income"));
  const expensesTotal = totalRow(sections.get("expenses"));
  const netResult = totalRow(sections.get("net_profit"));
  const items: Array<ProfitAndLossSummaryItem | null> = [
    incomeTotal ? { key: "total_revenue" as const, row: incomeTotal } : null,
    expensesTotal
      ? { key: "total_expenses" as const, row: expensesTotal }
      : null,
    netResult ? { key: "net_result" as const, row: netResult } : null,
  ];

  return items.filter(
    (item): item is ProfitAndLossSummaryItem => item !== null,
  );
}

/** Keep the complete account hierarchy as supporting detail, without root totals. */
export function getProfitAndLossSupportingSections(
  document: StatementExportDocument,
): StatementSection[] {
  if (document.kind !== "profit_and_loss") return [];

  return document.sections
    .filter((section) => section.key === "income" || section.key === "expenses")
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => row.rowKind !== "total"),
    }))
    .filter((section) => section.rows.length > 0);
}

/** A formal presentation currency is available only when every line uses it. */
export function getStatementPresentationCurrency(
  document: StatementExportDocument,
): string | null {
  const units = getStatementUnits(document);
  if (units.length !== 1 || getCustomStatementUnits(document).length > 0) {
    return null;
  }

  const [unit] = units;
  return unit === document.context.primaryCurrency ||
    unit === document.context.conversion
    ? unit
    : null;
}

export function isNegativeStatementAmount(value: string): boolean {
  const trimmed = value.trim();
  return /^-/.test(trimmed) && !/^-0+(?:\.0+)?$/.test(trimmed);
}
