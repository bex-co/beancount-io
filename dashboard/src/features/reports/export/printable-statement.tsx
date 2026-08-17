import { useTranslations } from "@/common/hooks/use-translations";
import { createPortal } from "react-dom";
import { formatStatementAmount } from "./amount";
import {
  getCustomStatementUnits,
  getStatementUnits,
  isLikelyPlaceholderStatementIdentity,
  type StatementAmount,
  type StatementExportDocument,
  type StatementRow,
} from "./model";
import {
  getBalanceSheetSummaryItems,
  getBalanceSheetSupportingSections,
  getProfitAndLossSummaryItems,
  getProfitAndLossSupportingSections,
  getStatementPresentationCurrency,
  hasBalanceSheetReconciliationDifference,
  isNegativeStatementAmount,
  type BalanceSheetSummaryKey,
  type ProfitAndLossSummaryKey,
} from "./presentation";
import "./statement-print.css";

function rowAmounts(row: StatementRow) {
  return row.amounts.length > 0 ? row.amounts : [null];
}

export function PrintableStatement({
  document,
}: {
  document: StatementExportDocument;
}) {
  const { t, i18n } = useTranslations();
  const generatedAt = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(document.context.generatedAt));
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00.000Z`));
  const { reportingPeriod } = document.context;
  const periodSummary = (() => {
    if (document.kind === "balance_sheet") {
      return reportingPeriod.asOfDate
        ? `${t("reports.export.asOf")} ${formatDate(reportingPeriod.asOfDate)}`
        : t("reports.export.dateUnavailable");
    }
    if (reportingPeriod.startDate && reportingPeriod.endDate) {
      return `${t("reports.export.period")} ${formatDate(reportingPeriod.startDate)} – ${formatDate(reportingPeriod.endDate)}`;
    }
    return reportingPeriod.endDate
      ? `${t("reports.export.allActivity")} ${formatDate(reportingPeriod.endDate)}`
      : t("reports.export.dateUnavailable");
  })();
  const units = getStatementUnits(document);
  const customUnits = getCustomStatementUnits(document);
  const presentationCurrency = getStatementPresentationCurrency(document);
  const isLedgerUnitManagementSchedule = presentationCurrency === null;
  const balanceSheetDoesNotReconcile =
    hasBalanceSheetReconciliationDifference(document);
  const isInternalDraft =
    document.kind === "balance_sheet" &&
    (balanceSheetDoesNotReconcile || reportingPeriod.asOfDate === null);
  const balanceSheetSummary = getBalanceSheetSummaryItems(document);
  const balanceSheetSupportingSections =
    getBalanceSheetSupportingSections(document);
  const profitAndLossSummary = getProfitAndLossSummaryItems(document);
  const supportingSections = getProfitAndLossSupportingSections(document);
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
      ? !reportingPeriod.isExplicit && reportingPeriod.asOfDate
        ? t("reports.export.inferredAsOfDateNotice", {
            asOfDate: formatDate(reportingPeriod.asOfDate),
          })
        : !reportingPeriod.asOfDate
          ? t("reports.export.asOfDateUnavailableNotice")
          : null
      : !reportingPeriod.isExplicit &&
          reportingPeriod.startDate &&
          reportingPeriod.endDate
        ? t("reports.export.inferredPeriodNotice", {
            startDate: formatDate(reportingPeriod.startDate),
            endDate: formatDate(reportingPeriod.endDate),
          })
        : !reportingPeriod.isExplicit
          ? t("reports.export.periodNotExplicitNotice")
          : null,
    hasSubtotalAndDetailRows ? t("reports.export.subtotalRowsNotice") : null,
    document.context.filters.account || document.context.filters.filter
      ? t("reports.export.partialReportNotice")
      : null,
    document.kind === "balance_sheet"
      ? t("reports.export.balanceSheetClassificationNotice")
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
  const conversionLabel =
    document.context.conversion === "at_cost"
      ? t("component.conversionSelect.atCost")
      : document.context.conversion === "at_value"
        ? t("component.conversionSelect.atMarketValue")
        : document.context.conversion === "units"
          ? t("component.conversionSelect.units")
          : `${t("component.conversionSelect.convertedTo")} ${document.context.conversion}`;
  const summaryLabel = (
    key: ProfitAndLossSummaryKey,
    amount: StatementAmount,
  ) => {
    if (key === "total_revenue") return t("reports.export.totalRevenue");
    if (key === "total_expenses") return t("reports.export.totalExpenses");
    return isNegativeStatementAmount(amount.displayAmount)
      ? t("reports.export.netLoss")
      : t("reports.export.netIncome");
  };
  const balanceSheetSummaryLabel = (key: BalanceSheetSummaryKey) => {
    if (key === "total_assets") return t("reports.export.totalAssets");
    if (key === "total_liabilities") {
      return t("reports.export.totalLiabilities");
    }
    if (key === "total_equity") return t("reports.export.totalEquity");
    if (key === "total_liabilities_and_equity") {
      return t("reports.export.totalLiabilitiesAndEquity");
    }
    return t("reports.export.reconciliationDifference");
  };
  const balanceSheetDetailLabel = (
    sectionKey: StatementExportDocument["sections"][number]["key"],
    row: StatementRow,
  ) => {
    if (row.rowKind !== "total") return row.label;
    if (sectionKey === "assets") return t("reports.export.totalAssets");
    if (sectionKey === "liabilities") {
      return t("reports.export.totalLiabilities");
    }
    if (sectionKey === "equity") return t("reports.export.totalEquity");
    return row.label;
  };
  const statusKey = isLedgerUnitManagementSchedule
    ? "reports.export.unauditedMultiUnitManagementReport"
    : isInternalDraft
      ? "reports.export.unauditedInternalDraft"
      : "reports.export.unauditedManagementReport";

  if (typeof window === "undefined") return null;

  return createPortal(
    <article
      className="statement-print-root"
      dir={i18n.dir()}
      data-testid="printable-statement"
    >
      <header className="statement-print-header">
        <p className="statement-print-ledger">
          {document.context.reportingEntity}
        </p>
        <h1>{document.title}</h1>
        <p className="statement-print-period">{periodSummary}</p>
        <p className="statement-print-status">{t(statusKey)}</p>
      </header>

      <section
        className="statement-print-context"
        aria-labelledby="statement-context-heading"
      >
        <h2 id="statement-context-heading">{t("reports.export.context")}</h2>
        <dl>
          <div>
            <dt>{t("reports.export.conversion")}</dt>
            <dd>{conversionLabel}</dd>
          </div>
          <div>
            <dt>
              {presentationCurrency
                ? t("reports.export.presentationCurrency")
                : t("reports.export.ledgerUnits")}
            </dt>
            <dd>{presentationCurrency ?? (units.join(", ") || "—")}</dd>
          </div>
          {document.context.filters.account && (
            <div>
              <dt>{t("reports.export.accountFilter")}</dt>
              <dd>{document.context.filters.account}</dd>
            </div>
          )}
          {document.context.filters.filter && (
            <div>
              <dt>{t("reports.export.advancedFilter")}</dt>
              <dd>{document.context.filters.filter}</dd>
            </div>
          )}
          <div>
            <dt>{t("reports.export.sourceLedger")}</dt>
            <dd>{document.context.ledgerName}</dd>
          </div>
        </dl>
      </section>

      {notices.length > 0 && (
        <aside className="statement-print-notices">
          <h2>{t("reports.export.importantNotices")}</h2>
          <ul>
            {notices.map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
          </ul>
        </aside>
      )}

      {document.kind === "profit_and_loss" ? (
        <>
          {profitAndLossSummary.length > 0 && (
            <section className="statement-print-section statement-print-summary">
              <h2>{t("reports.export.statementSummary")}</h2>
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t("reports.export.lineItem")}</th>
                    <th scope="col">{t("reports.export.unit")}</th>
                    <th scope="col">{t("reports.export.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {profitAndLossSummary.flatMap((item) =>
                    item.row.amounts.map((amount, amountIndex) => (
                      <tr
                        className={`statement-print-row statement-print-summary-row statement-print-summary-row-${item.key}`}
                        key={`${item.key}-${amount.unit}-${amountIndex}`}
                      >
                        <th scope="row">{summaryLabel(item.key, amount)}</th>
                        <td>{amount.unit}</td>
                        <td className="statement-print-amount">
                          {formatStatementAmount(
                            amount.displayAmount,
                            i18n.language,
                          )}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </section>
          )}

          {supportingSections.length > 0 && (
            <section className="statement-print-supporting-detail">
              <h2>{t("reports.export.supportingAccountDetail")}</h2>
              {supportingSections.map((section) => (
                <section className="statement-print-section" key={section.key}>
                  <h3>{section.label}</h3>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">{t("common.accountColumn")}</th>
                        <th scope="col">{t("reports.export.unit")}</th>
                        <th scope="col">{t("reports.export.amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.flatMap((row) =>
                        rowAmounts(row).map((amount, amountIndex) => (
                          <tr
                            className={`statement-print-row statement-print-row-${row.rowKind}`}
                            key={`${row.accountPath}-${amount?.unit ?? "empty"}-${amountIndex}`}
                          >
                            <th
                              scope="row"
                              style={{
                                paddingInlineStart: `${0.5 + row.depth * 1.25}rem`,
                              }}
                            >
                              {row.label}
                            </th>
                            <td>{amount?.unit ?? "—"}</td>
                            <td className="statement-print-amount">
                              {amount
                                ? formatStatementAmount(
                                    amount.displayAmount,
                                    i18n.language,
                                  )
                                : "—"}
                            </td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </section>
              ))}
            </section>
          )}
        </>
      ) : (
        <>
          {balanceSheetSummary.length > 0 && (
            <section className="statement-print-section statement-print-summary">
              <h2>{t("reports.export.statementSummary")}</h2>
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t("reports.export.lineItem")}</th>
                    <th scope="col">{t("reports.export.unit")}</th>
                    <th scope="col">{t("reports.export.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceSheetSummary.flatMap((item) =>
                    item.amounts.map((amount, amountIndex) => (
                      <tr
                        className={`statement-print-row statement-print-summary-row statement-print-summary-row-${item.key}`}
                        key={`${item.key}-${amount.unit}-${amountIndex}`}
                      >
                        <th scope="row">
                          {balanceSheetSummaryLabel(item.key)}
                        </th>
                        <td>{amount.unit}</td>
                        <td className="statement-print-amount">
                          {formatStatementAmount(
                            amount.displayAmount,
                            i18n.language,
                          )}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </section>
          )}

          {balanceSheetSupportingSections.length > 0 && (
            <section className="statement-print-supporting-detail">
              <h2>{t("reports.export.supportingAccountDetail")}</h2>
              {balanceSheetSupportingSections.map((section) => (
                <section className="statement-print-section" key={section.key}>
                  <h3>{section.label}</h3>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">{t("common.accountColumn")}</th>
                        <th scope="col">{t("reports.export.unit")}</th>
                        <th scope="col">{t("reports.export.amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.flatMap((row) =>
                        rowAmounts(row).map((amount, amountIndex) => (
                          <tr
                            className={`statement-print-row statement-print-row-${row.rowKind}`}
                            key={`${row.accountPath}-${amount?.unit ?? "empty"}-${amountIndex}`}
                          >
                            <th
                              scope="row"
                              style={{
                                paddingInlineStart: `${0.5 + row.depth * 1.25}rem`,
                              }}
                            >
                              {balanceSheetDetailLabel(section.key, row)}
                            </th>
                            <td>{amount?.unit ?? "—"}</td>
                            <td className="statement-print-amount">
                              {amount
                                ? formatStatementAmount(
                                    amount.displayAmount,
                                    i18n.language,
                                  )
                                : "—"}
                            </td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </section>
              ))}
            </section>
          )}
        </>
      )}

      <footer className="statement-print-footer">
        <p>{t("reports.export.noAssurance")}</p>
        <p>{t("reports.export.generatedBy", { generatedAt })}</p>
      </footer>
    </article>,
    window.document.body,
  );
}
