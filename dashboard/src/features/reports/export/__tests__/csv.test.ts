import { describe, expect, it } from "vitest";
import { buildStatementFilename, statementToCSV } from "../csv";
import type { StatementExportDocument } from "../model";

function documentFixture(): StatementExportDocument {
  return {
    kind: "balance_sheet",
    title: "Balance Sheet",
    context: {
      reportingEntity: "Acme, Inc.",
      reportingEntitySource: "ledger_title",
      ledgerName: '../My: Ledger? "2026"',
      primaryCurrency: "USD",
      conversion: "units",
      interval: "monthly",
      filters: {
        time: "2026-01-01 - 2026-12-31",
        account: "Assets, Cash",
        filter: '=HYPERLINK("bad")\r\ntag:épargne',
      },
      reportingPeriod: {
        startDate: null,
        endDate: null,
        asOfDate: "2026-12-31",
        isExplicit: true,
        selection: "2026-01-01 - 2026-12-31",
      },
      generatedAt: "2026-08-15T12:34:56.000Z",
    },
    sections: [
      {
        key: "assets",
        label: "Assets",
        rows: [
          {
            accountPath: "Assets:現金",
            label: "現金",
            depth: 1,
            rowKind: "account",
            amounts: [
              {
                unit: "USD",
                rawAmount: "-42.50",
                displayAmount: "-42.50",
              },
              { unit: "EUR", rawAmount: "+15", displayAmount: "15" },
            ],
          },
          {
            accountPath: "Assets:Empty",
            label: "Empty",
            depth: 1,
            rowKind: "account",
            amounts: [],
          },
        ],
      },
    ],
  };
}

describe("statement CSV", () => {
  it("uses a stable schema and preserves signed numeric amounts", () => {
    const csv = statementToCSV(documentFixture());

    expect(csv.split("\n")[0]).toBe(
      "statement,reporting_entity,reporting_entity_source,source_ledger,section,account_path,account_label,depth,row_kind,period_start,period_end,as_of_date,period_is_explicit,time_selection,account_filter,advanced_filter,interval,conversion,primary_currency,unit,raw_amount,display_amount,generated_at",
    );
    expect(csv).toContain("USD,-42.50,-42.50,");
    expect(csv).toContain("EUR,+15,15,");
    expect(csv).toContain("Assets:現金");
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("Assets:Empty");
  });

  it("builds deterministic, filesystem-safe filenames", () => {
    expect(buildStatementFilename(documentFixture())).toBe(
      "Acme-Inc-balance_sheet-2026-12-31-units-2026-08-15.csv",
    );
  });

  it("guards Windows reserved device names", () => {
    const reserved = documentFixture();
    reserved.context.ledgerName = "CON";
    reserved.context.reportingEntity = "CON";
    reserved.context.filters.time = "";
    reserved.context.reportingPeriod = {
      startDate: null,
      endDate: null,
      asOfDate: null,
      isExplicit: false,
      selection: "",
    };
    expect(buildStatementFilename(reserved)).toBe(
      "CON-file-balance_sheet-period-unresolved-units-2026-08-15.csv",
    );
  });

  it("uses the viewer's local date for the filename", () => {
    const document = documentFixture();
    document.context.generatedAt = "2026-08-17T00:30:00.000Z";
    const generatedAt = new Date(document.context.generatedAt);
    const localDate = [
      generatedAt.getFullYear(),
      String(generatedAt.getMonth() + 1).padStart(2, "0"),
      String(generatedAt.getDate()).padStart(2, "0"),
    ].join("-");

    expect(buildStatementFilename(document, "md")).toMatch(
      new RegExp(`-${localDate}\\.md$`),
    );
  });
});
