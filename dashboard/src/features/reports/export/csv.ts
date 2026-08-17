import { downloadCSV, rowsToCSV } from "@/common/lib/export/csv";
import type { StatementExportDocument } from "./model";

export const STATEMENT_CSV_HEADERS = [
  "statement",
  "reporting_entity",
  "reporting_entity_source",
  "source_ledger",
  "section",
  "account_path",
  "account_label",
  "depth",
  "row_kind",
  "period_start",
  "period_end",
  "as_of_date",
  "period_is_explicit",
  "time_selection",
  "account_filter",
  "advanced_filter",
  "interval",
  "conversion",
  "primary_currency",
  "unit",
  "raw_amount",
  "display_amount",
  "generated_at",
] as const;

export function statementToCSV(document: StatementExportDocument): string {
  const rows: unknown[][] = [Array.from(STATEMENT_CSV_HEADERS)];

  document.sections.forEach((section) => {
    section.rows.forEach((row) => {
      const amounts = row.amounts.length > 0 ? row.amounts : [null];
      amounts.forEach((amount) => {
        rows.push([
          document.kind,
          document.context.reportingEntity,
          document.context.reportingEntitySource,
          document.context.ledgerName,
          section.key,
          row.accountPath,
          row.label,
          row.depth,
          row.rowKind,
          document.context.reportingPeriod.startDate,
          document.context.reportingPeriod.endDate,
          document.context.reportingPeriod.asOfDate,
          document.context.reportingPeriod.isExplicit,
          document.context.filters.time,
          document.context.filters.account,
          document.context.filters.filter,
          document.context.interval,
          document.context.conversion,
          document.context.primaryCurrency,
          amount?.unit ?? "",
          amount?.rawAmount ?? "",
          amount?.displayAmount ?? "",
          document.context.generatedAt,
        ]);
      });
    });
  });

  return rowsToCSV(rows);
}

export function sanitizeFilenamePart(value: string): string {
  const withoutControlCharacters = [...value.normalize("NFKC")]
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 32 || codePoint === 127 ? "-" : character;
    })
    .join("");
  const sanitized = withoutControlCharacters
    .replace(/[\\/:*?"<>|,]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 64);

  return /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(sanitized)
    ? `${sanitized}-file`
    : sanitized;
}

export function buildStatementFilename(
  document: StatementExportDocument,
  extension: "csv" | "md" = "csv",
): string {
  const entity =
    sanitizeFilenamePart(document.context.reportingEntity) ||
    "reporting-entity";
  const period = document.context.reportingPeriod;
  const time = sanitizeFilenamePart(
    period.asOfDate ??
      (period.startDate && period.endDate
        ? `${period.startDate}-to-${period.endDate}`
        : period.endDate
          ? `through-${period.endDate}`
          : "period-unresolved"),
  );
  const conversion =
    sanitizeFilenamePart(document.context.conversion) || "units";
  const generatedAt = new Date(document.context.generatedAt);
  const date = Number.isNaN(generatedAt.getTime())
    ? document.context.generatedAt.slice(0, 10) || "date-unavailable"
    : [
        generatedAt.getFullYear(),
        String(generatedAt.getMonth() + 1).padStart(2, "0"),
        String(generatedAt.getDate()).padStart(2, "0"),
      ].join("-");
  return `${entity}-${document.kind}-${time}-${conversion}-${date}.${extension}`;
}

export function exportStatementCSV(document: StatementExportDocument): string {
  const csv = statementToCSV(document);
  downloadCSV(csv, buildStatementFilename(document));
  return csv;
}
