import { downloadText } from "@/common/lib/export/text";
import { formatStatementAmount } from "./amount";
import { buildStatementFilename } from "./csv";
import {
  getCustomStatementUnits,
  getStatementUnits,
  isLikelyPlaceholderStatementIdentity,
  type StatementExportDocument,
  type StatementAmount,
  type StatementRow,
} from "./model";
import {
  getBalanceSheetSummaryItems,
  getBalanceSheetSupportingSections,
  getCashFlowSummaryItems,
  getCashFlowSupportingSections,
  getProfitAndLossSummaryItems,
  getProfitAndLossSupportingSections,
  cashFlowSummaryLabelKey,
  getStatementPresentationCurrency,
  hasBalanceSheetReconciliationDifference,
  isNegativeStatementAmount,
  type BalanceSheetSummaryKey,
  type CashFlowSummaryKey,
  type ProfitAndLossSummaryKey,
} from "./presentation";

export type StatementTranslator = (
  key: string,
  params?: Record<string, string>,
) => string;

interface MarkdownOptions {
  locale: string;
  t: StatementTranslator;
}

function escapeMarkdown(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\\/g, "\\\\")
    .replace(/([`*_[\]|])/g, "\\$1")
    .replace(/\r?\n/g, "<br>");
}

export { formatStatementAmount as formatMarkdownAmount } from "./amount";

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function conversionLabel(
  document: StatementExportDocument,
  t: StatementTranslator,
) {
  const { conversion } = document.context;
  if (conversion === "at_cost") return t("component.conversionSelect.atCost");
  if (conversion === "at_value") {
    return t("component.conversionSelect.atMarketValue");
  }
  if (conversion === "units") return t("component.conversionSelect.units");
  return `${t("component.conversionSelect.convertedTo")} ${conversion}`;
}

function periodSummary(
  document: StatementExportDocument,
  { locale, t }: MarkdownOptions,
): string {
  const period = document.context.reportingPeriod;
  if (document.kind === "balance_sheet") {
    return period.asOfDate
      ? `${t("reports.export.asOf")} ${formatDate(period.asOfDate, locale)}`
      : t("reports.export.dateUnavailable");
  }
  if (period.startDate && period.endDate) {
    return `${t("reports.export.period")} ${formatDate(period.startDate, locale)} – ${formatDate(period.endDate, locale)}`;
  }
  return period.endDate
    ? `${t("reports.export.allActivity")} ${formatDate(period.endDate, locale)}`
    : t("reports.export.dateUnavailable");
}

function rowLines(
  row: StatementRow,
  locale: string,
  displayLabel: string = row.accountPath,
): string[] {
  const account = escapeMarkdown(displayLabel);
  const emphasize = row.rowKind !== "account";
  return row.amounts.map((amount) => {
    const unit = escapeMarkdown(amount.unit);
    const value = escapeMarkdown(
      formatStatementAmount(amount.displayAmount, locale),
    );
    return emphasize
      ? `| **${account}** | **${unit}** | **${value}** |`
      : `| ${account} | ${unit} | ${value} |`;
  });
}

function balanceSheetSummaryLabel(
  key: BalanceSheetSummaryKey,
  t: StatementTranslator,
) {
  if (key === "total_assets") return t("reports.export.totalAssets");
  if (key === "total_liabilities") {
    return t("reports.export.totalLiabilities");
  }
  if (key === "total_equity") return t("reports.export.totalEquity");
  if (key === "total_liabilities_and_equity") {
    return t("reports.export.totalLiabilitiesAndEquity");
  }
  return t("reports.export.reconciliationDifference");
}

function balanceSheetDetailLabel(
  sectionKey: StatementExportDocument["sections"][number]["key"],
  row: StatementRow,
  t: StatementTranslator,
) {
  if (row.rowKind !== "total") return row.accountPath;
  if (sectionKey === "assets") return t("reports.export.totalAssets");
  if (sectionKey === "liabilities") {
    return t("reports.export.totalLiabilities");
  }
  if (sectionKey === "equity") return t("reports.export.totalEquity");
  return row.accountPath;
}

function balanceSheetSummaryLines(
  document: StatementExportDocument,
  { locale, t }: MarkdownOptions,
): string[] {
  return getBalanceSheetSummaryItems(document).flatMap((item) =>
    item.amounts.map((amount) => {
      const label = escapeMarkdown(balanceSheetSummaryLabel(item.key, t));
      const unit = escapeMarkdown(amount.unit);
      const value = escapeMarkdown(
        formatStatementAmount(amount.displayAmount, locale),
      );
      return `| **${label}** | **${unit}** | **${value}** |`;
    }),
  );
}

function summaryLabel(
  key: ProfitAndLossSummaryKey,
  amount: StatementAmount,
  t: StatementTranslator,
) {
  if (key === "total_revenue") return t("reports.export.totalRevenue");
  if (key === "total_expenses") return t("reports.export.totalExpenses");
  return isNegativeStatementAmount(amount.displayAmount)
    ? t("reports.export.netLoss")
    : t("reports.export.netIncome");
}

function summaryLines(
  document: StatementExportDocument,
  { locale, t }: MarkdownOptions,
): string[] {
  return getProfitAndLossSummaryItems(document).flatMap((item) =>
    item.row.amounts.map((amount) => {
      const label = escapeMarkdown(summaryLabel(item.key, amount, t));
      const unit = escapeMarkdown(amount.unit);
      const value = escapeMarkdown(
        formatStatementAmount(amount.displayAmount, locale),
      );
      return `| **${label}** | **${unit}** | **${value}** |`;
    }),
  );
}

function cashFlowSummaryLabel(key: CashFlowSummaryKey, t: StatementTranslator) {
  return t(cashFlowSummaryLabelKey(key));
}

function cashFlowSummaryLines(
  document: StatementExportDocument,
  { locale, t }: MarkdownOptions,
): string[] {
  return getCashFlowSummaryItems(document).flatMap((item) =>
    item.row.amounts.map((amount) => {
      const label = escapeMarkdown(cashFlowSummaryLabel(item.key, t));
      const unit = escapeMarkdown(amount.unit);
      const value = escapeMarkdown(
        formatStatementAmount(amount.displayAmount, locale),
      );
      return `| **${label}** | **${unit}** | **${value}** |`;
    }),
  );
}

export function statementToMarkdown(
  document: StatementExportDocument,
  options: MarkdownOptions,
): string {
  const { locale, t } = options;
  const period = document.context.reportingPeriod;
  const units = getStatementUnits(document);
  const customUnits = getCustomStatementUnits(document);
  const presentationCurrency = getStatementPresentationCurrency(document);
  const isLedgerUnitManagementSchedule = presentationCurrency === null;
  const balanceSheetDoesNotReconcile =
    hasBalanceSheetReconciliationDifference(document);
  const isInternalDraft =
    document.kind === "balance_sheet" &&
    (balanceSheetDoesNotReconcile || period.asOfDate === null);
  const hasSubtotalAndDetailRows = document.sections.some(
    (section) =>
      section.rows.some((row) => row.rowKind !== "account") &&
      section.rows.some((row) => row.rowKind === "account"),
  );
  const notices = [
    document.context.reportingEntitySource === "ledger_name"
      ? t("reports.export.reportingEntityFallbackNotice")
      : null,
    isLikelyPlaceholderStatementIdentity(document)
      ? t("reports.export.placeholderDataNotice")
      : null,
    document.kind === "balance_sheet"
      ? !period.isExplicit && period.asOfDate
        ? t("reports.export.inferredAsOfDateNotice", {
            asOfDate: formatDate(period.asOfDate, locale),
          })
        : !period.asOfDate
          ? t("reports.export.asOfDateUnavailableNotice")
          : null
      : !period.isExplicit && period.startDate && period.endDate
        ? t("reports.export.inferredPeriodNotice", {
            startDate: formatDate(period.startDate, locale),
            endDate: formatDate(period.endDate, locale),
          })
        : !period.isExplicit
          ? t("reports.export.periodNotExplicitNotice")
          : null,
    hasSubtotalAndDetailRows ? t("reports.export.subtotalRowsNotice") : null,
    document.context.filters.account || document.context.filters.filter
      ? t("reports.export.partialReportNotice")
      : null,
    document.kind === "balance_sheet"
      ? t("reports.export.balanceSheetClassificationNotice")
      : null,
    document.kind === "cash_flow" &&
    (document.cashFlowInference?.activityRows ?? true)
      ? t("reports.export.cashFlowClassificationNotice")
      : null,
    document.kind === "cash_flow" &&
    (document.cashFlowInference?.cashEquivalents ?? true)
      ? t("reports.export.cashFlowCashEquivalentsNotice")
      : null,
    balanceSheetDoesNotReconcile
      ? t("reports.export.balanceSheetDoesNotReconcileNotice")
      : null,
    isLedgerUnitManagementSchedule
      ? t("reports.export.multiUnitScheduleNotice")
      : null,
    customUnits.length > 0
      ? `${t("reports.export.customUnitsNotice")} ${customUnits.join(", ")}. ${t("reports.export.customUnitsDefinitionNotice")}`
      : null,
  ].filter((notice): notice is string => notice !== null);
  const generatedAt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(document.context.generatedAt));
  const statusKey = isLedgerUnitManagementSchedule
    ? "reports.export.unauditedMultiUnitManagementReport"
    : isInternalDraft
      ? "reports.export.unauditedInternalDraft"
      : "reports.export.unauditedManagementReport";
  const lines = [
    `# ${escapeMarkdown(document.context.reportingEntity)}`,
    "",
    `## ${escapeMarkdown(document.title)}`,
    "",
    `**${escapeMarkdown(periodSummary(document, options))}**`,
    "",
    `***${escapeMarkdown(t(statusKey))}***`,
    "",
    "---",
    "",
    `## ${escapeMarkdown(t("reports.export.context"))}`,
    "",
    `- **${escapeMarkdown(t("reports.export.reportingEntity"))}:** ${escapeMarkdown(document.context.reportingEntity)}`,
    `- **${escapeMarkdown(t("reports.export.sourceLedger"))}:** ${escapeMarkdown(document.context.ledgerName)}`,
    `- **${escapeMarkdown(t("reports.export.conversion"))}:** ${escapeMarkdown(conversionLabel(document, t))}`,
    `- **${escapeMarkdown(presentationCurrency ? t("reports.export.presentationCurrency") : t("reports.export.ledgerUnits"))}:** ${escapeMarkdown(presentationCurrency ?? (units.join(", ") || "—"))}`,
  ];

  if (document.context.filters.account) {
    lines.push(
      `- **${escapeMarkdown(t("reports.export.accountFilter"))}:** ${escapeMarkdown(document.context.filters.account)}`,
    );
  }
  if (document.context.filters.filter) {
    lines.push(
      `- **${escapeMarkdown(t("reports.export.advancedFilter"))}:** ${escapeMarkdown(document.context.filters.filter)}`,
    );
  }

  if (notices.length > 0) {
    lines.push(
      "",
      `## ${escapeMarkdown(t("reports.export.importantNotices"))}`,
      "",
      ...notices.map((notice) => `- ${escapeMarkdown(notice)}`),
    );
  }

  if (document.kind === "profit_and_loss") {
    const summarizedRows = summaryLines(document, options);
    if (summarizedRows.length > 0) {
      lines.push(
        "",
        `## ${escapeMarkdown(t("reports.export.statementSummary"))}`,
        "",
        `| ${escapeMarkdown(t("reports.export.lineItem"))} | ${escapeMarkdown(t("reports.export.unit"))} | ${escapeMarkdown(t("reports.export.amount"))} |`,
        "|:--|:--|--:|",
        ...summarizedRows,
      );
    }

    const supportingSections = getProfitAndLossSupportingSections(document);
    if (supportingSections.length > 0) {
      lines.push(
        "",
        `## ${escapeMarkdown(t("reports.export.supportingAccountDetail"))}`,
      );
      supportingSections.forEach((section) => {
        const rows = section.rows.flatMap((row) => rowLines(row, locale));
        lines.push(
          "",
          `### ${escapeMarkdown(section.label)}`,
          "",
          `| ${escapeMarkdown(t("common.accountColumn"))} | ${escapeMarkdown(t("reports.export.unit"))} | ${escapeMarkdown(t("reports.export.amount"))} |`,
          "|:--|:--|--:|",
          ...rows,
        );
      });
    }
  } else if (document.kind === "cash_flow") {
    const summarizedRows = cashFlowSummaryLines(document, options);
    if (summarizedRows.length > 0) {
      lines.push(
        "",
        `## ${escapeMarkdown(t("reports.export.statementSummary"))}`,
        "",
        `| ${escapeMarkdown(t("reports.export.lineItem"))} | ${escapeMarkdown(t("reports.export.unit"))} | ${escapeMarkdown(t("reports.export.amount"))} |`,
        "|:--|:--|--:|",
        ...summarizedRows,
      );
    }

    const supportingSections = getCashFlowSupportingSections(document);
    if (supportingSections.length > 0) {
      lines.push(
        "",
        `## ${escapeMarkdown(t("reports.export.supportingAccountDetail"))}`,
      );
      supportingSections.forEach((section) => {
        const rows = section.rows.flatMap((row) => rowLines(row, locale));
        lines.push(
          "",
          `### ${escapeMarkdown(section.label)}`,
          "",
          `| ${escapeMarkdown(t("common.accountColumn"))} | ${escapeMarkdown(t("reports.export.unit"))} | ${escapeMarkdown(t("reports.export.amount"))} |`,
          "|:--|:--|--:|",
          ...rows,
        );
      });
    }
  } else {
    const summarizedRows = balanceSheetSummaryLines(document, options);
    if (summarizedRows.length > 0) {
      lines.push(
        "",
        `## ${escapeMarkdown(t("reports.export.statementSummary"))}`,
        "",
        `| ${escapeMarkdown(t("reports.export.lineItem"))} | ${escapeMarkdown(t("reports.export.unit"))} | ${escapeMarkdown(t("reports.export.amount"))} |`,
        "|:--|:--|--:|",
        ...summarizedRows,
      );
    }

    const supportingSections = getBalanceSheetSupportingSections(document);
    if (supportingSections.length > 0) {
      lines.push(
        "",
        `## ${escapeMarkdown(t("reports.export.supportingAccountDetail"))}`,
      );
      supportingSections.forEach((section) => {
        const rows = section.rows.flatMap((row) =>
          rowLines(row, locale, balanceSheetDetailLabel(section.key, row, t)),
        );
        lines.push(
          "",
          `### ${escapeMarkdown(section.label)}`,
          "",
          `| ${escapeMarkdown(t("common.accountColumn"))} | ${escapeMarkdown(t("reports.export.unit"))} | ${escapeMarkdown(t("reports.export.amount"))} |`,
          "|:--|:--|--:|",
          ...rows,
        );
      });
    }
  }

  lines.push(
    "",
    "---",
    "",
    escapeMarkdown(t("reports.export.noAssurance")),
    "",
    escapeMarkdown(t("reports.export.generatedBy", { generatedAt })),
    "",
  );
  return lines.join("\n");
}

export function exportStatementMarkdown(
  document: StatementExportDocument,
  options: MarkdownOptions,
): string {
  const markdown = statementToMarkdown(document, options);
  downloadText(
    markdown,
    buildStatementFilename(document, "md"),
    "text/markdown;charset=utf-8",
  );
  return markdown;
}
