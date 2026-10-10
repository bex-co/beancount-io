import { cleanup, render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { en } from "@/i18n/locales";
import { cashTransferPayload } from "../../cash-flow/lib/__tests__/fixtures/converted-sale";
import { mergeIntervalAccountChanges } from "../../cash-flow/lib/merge-intervals";
import {
  buildCashFlowStatement,
  collectCashAccounts,
  type CashFlowStatement,
} from "../../cash-flow/lib/model";
import { STATEMENT_CSV_HEADERS, statementToCSV } from "../csv";
import { statementToMarkdown } from "../markdown";
import {
  buildCashFlowDocument,
  getStatementUnits,
  hasStatementExportData,
  type StatementExportDocument,
} from "../model";
import { PrintableStatement } from "../printable-statement";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

const operating = "Net Cash from Operating Activities";
const investing = "Net Cash from Investing Activities";
const financing = "Net Cash from Financing Activities";
const opening = "Cash & Equivalents at Period Start";
const netChange = "Net Change in Cash & Equivalents";
const closing = "Cash & Equivalents at Period End";
const summaryLabels = [
  operating,
  investing,
  financing,
  opening,
  netChange,
  closing,
];
type SummaryRow = [label: string, unit: string, value: string];
type Renderer = "Markdown" | "print";
const renderers: Renderer[] = ["Markdown", "print"];
let i18n = createInstance();

beforeEach(async () => {
  i18n = createInstance();
  await i18n.init({
    lng: "en",
    fallbackLng: "en",
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  });
});
afterEach(cleanup);

function buildDocument(statement: CashFlowStatement, primaryCurrency = "USD") {
  return buildCashFlowDocument({
    title: "Cash Flow",
    statement,
    labels: {
      operating: "Operating Activities",
      investing: "Investing Activities",
      financing: "Financing Activities",
      net_change: netChange,
      openingCash: opening,
      closingCash: closing,
    },
    reportingEntity: "Portfolio Ledger",
    reportingEntitySource: "ledger_title",
    ledgerName: "portfolio",
    primaryCurrency,
    conversion: "units",
    interval: "daily",
    filters: {
      time: "2024-01-08",
      account: "",
      filter: "",
    },
    reportDates: ["2024-01-08"],
    generatedAt: "2026-08-15T12:00:00.000Z",
  });
}

function transferStatement() {
  const payload = cashTransferPayload();
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

function summaryRows(
  document: StatementExportDocument,
  renderer: Renderer,
): SummaryRow[] {
  if (renderer === "Markdown") {
    return statementToMarkdown(document, {
      locale: "en",
      t: (key, params) => i18n.t(key, params),
    })
      .split("\n")
      .filter((line) => line.startsWith("| **"))
      .map((line) => {
        const cells =
          /^\| \*\*(.*?)\*\* \| \*\*(.*?)\*\* \| \*\*(.*?)\*\* \|$/.exec(line);
        if (!cells) throw new Error(`Unexpected summary row: ${line}`);
        return cells
          .slice(1)
          .map((cell) => cell.replaceAll("&amp;", "&")) as SummaryRow;
      });
  }
  render(
    <I18nextProvider i18n={i18n}>
      <PrintableStatement document={document} />
    </I18nextProvider>,
  );
  const summary = screen.getByRole("heading", {
    name: "Statement summary",
  }).parentElement!;
  const table = within(summary).getByRole("table");
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map(
      (row) =>
        [
          within(row).getByRole("rowheader").textContent ?? "",
          ...within(row)
            .getAllByRole("cell")
            .map((cell) => cell.textContent ?? ""),
        ] as SummaryRow,
    );
}

function expectUnchanged(
  document: StatementExportDocument,
  renderer: Renderer,
  expected: SummaryRow[],
) {
  const original = structuredClone(document);
  const csv = statementToCSV(document);
  expect(summaryRows(document, renderer)).toEqual(expected);
  expect(document).toEqual(original);
  expect(statementToCSV(document)).toBe(csv);
}

describe("sparse Cash Flow summary amounts in actual renderers", () => {
  it.each(renderers)(
    "keeps all six public cash-transfer summary lines in %s",
    (renderer) => {
      const statement = transferStatement();
      expect(statement.rows).toEqual([]);
      expect(statement.totals).toEqual({
        operating: {},
        investing: {},
        financing: {},
      });
      expect(statement.netChange).toEqual({});
      expect(statement.opening).toEqual({ USD: "60000" });
      expect(statement.closing).toEqual({ USD: "60000" });
      const document = buildDocument(statement);
      expect(hasStatementExportData(document)).toBe(true);
      expectUnchanged(document, renderer, [
        [operating, "USD", "0.00"],
        [investing, "USD", "0.00"],
        [financing, "USD", "0.00"],
        [opening, "USD", "60,000.00"],
        [netChange, "USD", "0.00"],
        [closing, "USD", "60,000.00"],
      ]);
    },
  );

  it.each(renderers)(
    "keeps a sparse closing line in its observed unit in %s",
    (renderer) => {
      const statement = buildCashFlowStatement({
        intervals: [
          {
            date: "2024-01-08",
            accountChanges: {
              "Income:Salary": { USD: "-10.00001" },
              "Assets:Bank:Checking": { USD: "10.00001" },
            },
          },
        ],
        closingCashAccounts: [],
        primaryCurrency: "EUR",
      });
      expect(statement.closing).toEqual({});
      const document = buildDocument(statement, "EUR");
      expect(getStatementUnits(document)).toEqual(["USD"]);
      expectUnchanged(document, renderer, [
        [operating, "USD", "10.00001"],
        [investing, "USD", "0.00"],
        [financing, "USD", "0.00"],
        [opening, "USD", "(10.00001)"],
        [netChange, "USD", "10.00001"],
        [closing, "USD", "0.00"],
      ]);
    },
  );

  it.each(renderers)(
    "keeps truthful placeholders with no observed units in %s",
    (renderer) => {
      const document = buildDocument(
        buildCashFlowStatement({
          intervals: [],
          closingCashAccounts: [],
          primaryCurrency: "USD",
        }),
      );
      expect(getStatementUnits(document)).toEqual([]);
      expectUnchanged(
        document,
        renderer,
        summaryLabels.map((label) => [label, "—", "—"]),
      );
      // Presentation placeholders do not supply data to the export readiness gate.
      expect(hasStatementExportData(document)).toBe(false);
    },
  );

  it.each(renderers)(
    "preserves exact populated signs and unit scope beside sparse totals in %s",
    (renderer) => {
      const document = buildDocument(
        buildCashFlowStatement({
          intervals: [
            {
              date: "2024-01-08",
              accountChanges: {
                "Expenses:Fees": { USD: "9007199254740993.123456789" },
                "Income:Salary": { USD: "-0.000000001" },
                "Assets:Bank:Checking": {
                  USD: "-9007199254740993.123456788",
                  VACHR: "-0.00000000000000000001",
                },
                "Assets:Brokerage:Cash": { VACHR: "0.00000000000000000001" },
              },
            },
          ],
          closingCashAccounts: [
            {
              account: "Assets:Bank:Checking",
              balance: { USD: "1.000000001", VACHR: "3.00000000000000000001" },
              roleSource: "heuristic",
            },
          ],
          primaryCurrency: "USD",
        }),
      );
      document.context.filters.account = "Assets:Bank";
      document.context.filters.filter = "tag:scope";
      expectUnchanged(document, renderer, [
        [operating, "USD", "(9,007,199,254,740,993.123456788)"],
        [investing, "USD", "0.00"],
        [investing, "VACHR", "0.00"],
        [financing, "USD", "0.00"],
        [financing, "VACHR", "0.00"],
        [opening, "USD", "9,007,199,254,740,994.123456789"],
        [opening, "VACHR", "3.00000000000000000001"],
        [netChange, "USD", "(9,007,199,254,740,993.123456788)"],
        [closing, "USD", "1.000000001"],
        [closing, "VACHR", "3.00000000000000000001"],
      ]);
      const markdown = statementToMarkdown(document, {
        locale: "en",
        t: (key, params) => i18n.t(key, params),
      });
      expect(markdown).toContain(en["reports.export.multiUnitScheduleNotice"]);
      expect(markdown).toContain(en["reports.export.partialReportNotice"]);
      expect(markdown).toContain("Assets:Bank");
      expect(markdown).toContain("tag:scope");
      expect(markdown).toContain("January 8, 2024");
      expect(markdown).toContain("Expenses:Fees");
      expect(markdown).toContain("(9,007,199,254,740,993.123456789)");
      if (renderer === "print") {
        expect(
          screen.getByText(en["reports.export.multiUnitScheduleNotice"]),
        ).toBeInTheDocument();
        expect(
          screen.getByText(en["reports.export.partialReportNotice"]),
        ).toBeInTheDocument();
        expect(screen.getByText("Assets:Bank")).toBeInTheDocument();
        expect(screen.getByText("tag:scope")).toBeInTheDocument();
        expect(screen.getByText("Fees")).toBeInTheDocument();
        expect(
          screen.getByText("(9,007,199,254,740,993.123456789)"),
        ).toBeInTheDocument();
      }
    },
  );

  it("keeps the raw transfer CSV's six rows with blank sparse amounts", () => {
    const document = buildDocument(transferStatement());
    const positions = [
      "section",
      "row_kind",
      "unit",
      "raw_amount",
      "display_amount",
    ] as const;
    const rows = statementToCSV(document)
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => {
        const cells = line.split(",");
        return positions.map(
          (name) => cells[STATEMENT_CSV_HEADERS.indexOf(name)],
        );
      });
    expect(rows).toEqual([
      ["operating", "total", "", "", ""],
      ["investing", "total", "", "", ""],
      ["financing", "total", "", "", ""],
      ["net_change", "account", "USD", "60000", "60000"],
      ["net_change", "subtotal", "", "", ""],
      ["net_change", "total", "USD", "60000", "60000"],
    ]);
  });
});
