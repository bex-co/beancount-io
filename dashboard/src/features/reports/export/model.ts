import type { ChartInterval, ConversionOption } from "@/common/types/chart";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import type { SerializableTreeNode } from "@/graphql/definitions";
import {
  resolveReportingPeriod,
  type FiscalYearEnd,
  type StatementReportingPeriod,
} from "./reporting-period";

export type StatementKind = "balance_sheet" | "profit_and_loss";
export type StatementRowKind = "total" | "subtotal" | "account";
export type ReportingEntitySource = "ledger_title" | "ledger_name";

export interface StatementAmount {
  unit: string;
  /** Exact ledger sign from the report response; never a JS float. */
  rawAmount: string;
  /** Statement-facing sign after applying the section's normal balance. */
  displayAmount: string;
}

export interface StatementRow {
  accountPath: string;
  label: string;
  depth: number;
  rowKind: StatementRowKind;
  amounts: StatementAmount[];
}

export interface StatementSection {
  key:
    | "assets"
    | "liabilities"
    | "equity"
    | "income"
    | "expenses"
    | "net_profit";
  label: string;
  rows: StatementRow[];
}

export interface StatementExportContext {
  reportingEntity: string;
  reportingEntitySource: ReportingEntitySource;
  ledgerName: string;
  primaryCurrency: string;
  conversion: ConversionOption;
  interval: ChartInterval;
  filters: LedgerSearchParams;
  reportingPeriod: StatementReportingPeriod;
  generatedAt: string;
}

export interface StatementExportDocument {
  kind: StatementKind;
  title: string;
  context: StatementExportContext;
  sections: StatementSection[];
}

interface StatementContextInput extends Omit<
  StatementExportContext,
  "generatedAt" | "reportingPeriod"
> {
  reportDates: readonly string[];
  fiscalYearEnd?: FiscalYearEnd;
  generatedAt?: string;
}

interface BalanceSheetDocumentInput extends StatementContextInput {
  title: string;
  assets: SerializableTreeNode;
  liabilities: SerializableTreeNode;
  equity: SerializableTreeNode;
  labels: Pick<
    Record<StatementSection["key"], string>,
    "assets" | "liabilities" | "equity"
  >;
}

interface ProfitAndLossDocumentInput extends StatementContextInput {
  title: string;
  income: SerializableTreeNode;
  expenses: SerializableTreeNode;
  netProfitBalances: ReadonlyArray<Record<string, unknown>>;
  labels: Pick<
    Record<StatementSection["key"], string>,
    "income" | "expenses" | "net_profit"
  >;
}

interface FlattenHierarchyOptions {
  primaryCurrency: string;
  inverted?: boolean;
}

function compareCurrency(
  a: string,
  b: string,
  primaryCurrency: string,
): number {
  if (a === primaryCurrency && b !== primaryCurrency) return -1;
  if (b === primaryCurrency && a !== primaryCurrency) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function decimalString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return null;
}

/** Change the display sign without converting the decimal to a JS number. */
export function invertDecimal(value: string): string {
  const trimmed = value.trim();
  if (/^[+-]?0+(?:\.0+)?$/.test(trimmed)) {
    return trimmed.replace(/^[+-]/, "");
  }
  if (trimmed.startsWith("-")) return trimmed.slice(1);
  if (trimmed.startsWith("+")) return `-${trimmed.slice(1)}`;
  return `-${trimmed}`;
}

function amountsFromBalance(
  balance: Record<string, unknown>,
  options: FlattenHierarchyOptions,
): StatementAmount[] {
  return Object.entries(balance)
    .map(([unit, value]) => {
      const rawAmount = decimalString(value)?.trim();
      return rawAmount === null || rawAmount === undefined
        ? null
        : { unit, rawAmount };
    })
    .filter(
      (amount): amount is { unit: string; rawAmount: string } =>
        amount !== null,
    )
    .sort((a, b) => compareCurrency(a.unit, b.unit, options.primaryCurrency))
    .map((amount) => ({
      ...amount,
      displayAmount: options.inverted
        ? invertDecimal(amount.rawAmount)
        : amount.rawAmount,
    }));
}

/**
 * Flatten a report hierarchy in its server-provided preorder. Parent rollups
 * use balanceChildren, matching the on-screen hierarchy. Collapse patterns
 * affect disclosure only, so descendants remain part of the exported report.
 */
export function flattenStatementHierarchy(
  root: SerializableTreeNode,
  options: FlattenHierarchyOptions,
): StatementRow[] {
  const rows: StatementRow[] = [];

  const visit = (node: SerializableTreeNode, depth: number): void => {
    const children = node.children as unknown as SerializableTreeNode[];
    rows.push({
      accountPath: node.account,
      label: node.account.split(":").pop() || node.account,
      depth,
      rowKind:
        depth === 0 ? "total" : children.length > 0 ? "subtotal" : "account",
      amounts: amountsFromBalance(node.balanceChildren, options),
    });

    children.forEach((child) => visit(child, depth + 1));
  };

  visit(root, 0);
  return rows;
}

interface ParsedDecimal {
  units: bigint;
  scale: number;
}

function parseDecimal(value: string): ParsedDecimal {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) throw new Error("Report contained a non-decimal amount");

  const fraction = match[3] ?? "";
  const digits = `${match[2]}${fraction}`;
  const sign = match[1] === "-" ? -1n : 1n;
  return { units: sign * BigInt(digits), scale: fraction.length };
}

function formatDecimal({ units, scale }: ParsedDecimal): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units)
    .toString()
    .padStart(scale + 1, "0");
  const unsigned =
    scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  return negative && units !== 0n ? `-${unsigned}` : unsigned;
}

function addDecimals(left: ParsedDecimal, right: ParsedDecimal): ParsedDecimal {
  const scale = Math.max(left.scale, right.scale);
  return {
    scale,
    units:
      left.units * 10n ** BigInt(scale - left.scale) +
      right.units * 10n ** BigInt(scale - right.scale),
  };
}

/** Aggregate period balances with exact decimal arithmetic. */
export function sumBalanceRecords(
  balances: ReadonlyArray<Record<string, unknown>>,
): Record<string, string> {
  const totals = new Map<string, ParsedDecimal>();

  balances.forEach((balance) => {
    Object.entries(balance).forEach(([currency, value]) => {
      const amount = decimalString(value);
      if (amount === null) return;
      const current = totals.get(currency) ?? { units: 0n, scale: 0 };
      totals.set(currency, addDecimals(current, parseDecimal(amount)));
    });
  });

  return Object.fromEntries(
    [...totals.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([currency, total]) => [currency, formatDecimal(total)]),
  );
}

function buildContext(
  kind: StatementKind,
  input: StatementContextInput,
): StatementExportContext {
  return {
    reportingEntity: input.reportingEntity,
    reportingEntitySource: input.reportingEntitySource,
    ledgerName: input.ledgerName,
    primaryCurrency: input.primaryCurrency,
    conversion: input.conversion,
    interval: input.interval,
    filters: { ...input.filters },
    reportingPeriod: resolveReportingPeriod({
      kind,
      timeFilter: input.filters.time,
      reportDates: input.reportDates,
      fiscalYearEnd: input.fiscalYearEnd,
      interval: input.interval,
    }),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}

export function buildBalanceSheetDocument(
  input: BalanceSheetDocumentInput,
): StatementExportDocument {
  const normal = { primaryCurrency: input.primaryCurrency };
  const inverted = { ...normal, inverted: true };

  return {
    kind: "balance_sheet",
    title: input.title,
    context: buildContext("balance_sheet", input),
    sections: [
      {
        key: "assets",
        label: input.labels.assets,
        rows: flattenStatementHierarchy(input.assets, normal),
      },
      {
        key: "liabilities",
        label: input.labels.liabilities,
        rows: flattenStatementHierarchy(input.liabilities, inverted),
      },
      {
        key: "equity",
        label: input.labels.equity,
        rows: flattenStatementHierarchy(input.equity, inverted),
      },
    ],
  };
}

export function buildProfitAndLossDocument(
  input: ProfitAndLossDocumentInput,
): StatementExportDocument {
  const normal = { primaryCurrency: input.primaryCurrency };
  const inverted = { ...normal, inverted: true };
  const netProfit = sumBalanceRecords(input.netProfitBalances);

  return {
    kind: "profit_and_loss",
    title: input.title,
    context: buildContext("profit_and_loss", input),
    sections: [
      {
        key: "income",
        label: input.labels.income,
        rows: flattenStatementHierarchy(input.income, inverted),
      },
      {
        key: "expenses",
        label: input.labels.expenses,
        rows: flattenStatementHierarchy(input.expenses, normal),
      },
      {
        key: "net_profit",
        label: input.labels.net_profit,
        rows: [
          {
            accountPath: input.labels.net_profit,
            label: input.labels.net_profit,
            depth: 0,
            rowKind: "total",
            amounts: amountsFromBalance(netProfit, inverted),
          },
        ],
      },
    ],
  };
}

export function refreshStatementGenerationTime(
  document: StatementExportDocument,
  generatedAt: string = new Date().toISOString(),
): StatementExportDocument {
  return {
    ...document,
    context: { ...document.context, generatedAt },
  };
}

export function hasStatementExportData(
  document: StatementExportDocument,
): boolean {
  return document.sections.some((section) =>
    section.rows.some((row) => row.amounts.length > 0),
  );
}

export function getStatementUnits(document: StatementExportDocument): string[] {
  return [
    ...new Set(
      document.sections.flatMap((section) =>
        section.rows.flatMap((row) => row.amounts.map((amount) => amount.unit)),
      ),
    ),
  ].sort();
}

/** Codes outside the common three-letter currency shape need explicit review. */
export function getCustomStatementUnits(
  document: StatementExportDocument,
): string[] {
  return getStatementUnits(document).filter((unit) => !/^[A-Z]{3}$/.test(unit));
}

const PLACEHOLDER_IDENTITY =
  /\b(?:demo|example|hooli|sample)\b|\bmy[-_ ]?books?\b/i;

/** Flag obvious fixture identities without guessing a replacement identity. */
export function isLikelyPlaceholderStatementIdentity(
  document: StatementExportDocument,
): boolean {
  return [document.context.reportingEntity, document.context.ledgerName].some(
    (value) => PLACEHOLDER_IDENTITY.test(value),
  );
}
