import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildCashFlowDocument, sumBalanceRecords } from "../model";
import { statementToCSV } from "../csv";
import { statementToMarkdown } from "../markdown";
import { PrintableStatement } from "../printable-statement";
import {
  getCashFlowSummaryItems,
  getCashFlowSupportingSections,
} from "../presentation";
import {
  buildCashFlowStatement,
  collectCashAccounts,
  type CashFlowStatement,
} from "../../cash-flow/lib/model";
import type { SerializableTreeNode } from "@/graphql/definitions";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.generatedAt ? `${key}: ${params.generatedAt}` : key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

const statement: CashFlowStatement = {
  rows: [
    {
      accountPath: "Income:Salary",
      label: "Salary",
      activity: "operating",
      roleSource: "heuristic",
      amounts: { USD: "5000.00" },
    },
    {
      accountPath: "Expenses:Rent",
      label: "Rent",
      activity: "operating",
      roleSource: "heuristic",
      amounts: { USD: "-1500.00" },
    },
    {
      accountPath: "Assets:Invest:Brokerage",
      label: "Brokerage",
      activity: "investing",
      roleSource: "heuristic",
      amounts: { USD: "-1000.00" },
    },
    {
      accountPath: "Liabilities:Mortgage",
      label: "Mortgage",
      activity: "financing",
      roleSource: "heuristic",
      amounts: { USD: "-200.00" },
    },
  ],
  totals: {
    operating: { USD: "3500.00" },
    investing: { USD: "-1000.00" },
    financing: { USD: "-200.00" },
  },
  netChange: { USD: "2300.00" },
  opening: { USD: "1000.00" },
  closing: { USD: "3300.00" },
  intervals: [],
  invalidRoleValues: [],
  hasHeuristicCashAccounts: true,
};

const baseContext = {
  reportingEntity: "Acme, Inc.",
  reportingEntitySource: "ledger_title" as const,
  ledgerName: "Acme Books",
  primaryCurrency: "USD",
  conversion: "at_cost" as const,
  interval: "monthly" as const,
  filters: { time: "2026-01-01 - 2026-06-30", account: "", filter: "" },
  reportDates: ["2026-01-31", "2026-06-30"],
  generatedAt: "2026-08-15T12:00:00.000Z",
};

const labels = {
  operating: "Operating Activities",
  investing: "Investing Activities",
  financing: "Financing Activities",
  net_change: "Net change in cash & equivalents",
  openingCash: "Cash & equivalents at period start",
  closingCash: "Cash & equivalents at period end",
};

const document = buildCashFlowDocument({
  title: "Cash Flow",
  statement,
  labels,
  ...baseContext,
});

describe("buildCashFlowDocument", () => {
  it("builds the four sections in statement order", () => {
    expect(document.kind).toBe("cash_flow");
    expect(document.sections.map((section) => section.key)).toEqual([
      "operating",
      "investing",
      "financing",
      "net_change",
    ]);
  });

  it("lists account rows followed by the activity total", () => {
    const operating = document.sections[0];
    expect(operating.rows.map((row) => row.accountPath)).toEqual([
      "Income:Salary",
      "Expenses:Rent",
      "Operating Activities",
    ]);
    expect(operating.rows.map((row) => row.rowKind)).toEqual([
      "account",
      "account",
      "total",
    ]);
    expect(operating.rows[2].amounts).toEqual([
      { unit: "USD", rawAmount: "3500.00", displayAmount: "3500.00" },
    ]);
  });

  it("keeps statement signs identical between raw and display amounts", () => {
    const investing = document.sections[1];
    expect(investing.rows[0].amounts).toEqual([
      { unit: "USD", rawAmount: "-1000.00", displayAmount: "-1000.00" },
    ]);
  });

  it("carries the opening, net change, and closing bottom line", () => {
    const bottomLine = document.sections[3];
    expect(bottomLine.rows.map((row) => row.rowKind)).toEqual([
      "account",
      "subtotal",
      "total",
    ]);
    expect(bottomLine.rows.map((row) => row.amounts[0].displayAmount)).toEqual([
      "1000.00",
      "2300.00",
      "3300.00",
    ]);
  });
});

describe("cash flow presentation", () => {
  it("summarizes activity totals plus the cash reconciliation", () => {
    const items = getCashFlowSummaryItems(document);
    expect(items.map((item) => item.key)).toEqual([
      "net_cash_operating",
      "net_cash_investing",
      "net_cash_financing",
      "opening_cash",
      "net_change",
      "closing_cash",
    ]);
    expect(items[5].row.amounts[0].displayAmount).toBe("3300.00");
  });

  it("keeps account detail without activity totals as supporting sections", () => {
    const sections = getCashFlowSupportingSections(document);
    expect(sections.map((section) => section.key)).toEqual([
      "operating",
      "investing",
      "financing",
    ]);
    expect(
      sections.every((section) =>
        section.rows.every((row) => row.rowKind === "account"),
      ),
    ).toBe(true);
  });

  it("returns nothing for other statement kinds", () => {
    const other = { ...document, kind: "profit_and_loss" as const };
    expect(getCashFlowSummaryItems(other)).toEqual([]);
    expect(getCashFlowSupportingSections(other)).toEqual([]);
  });
});

describe("cash flow CSV export", () => {
  it("emits rows tagged with the cash_flow kind and section keys", () => {
    const csv = statementToCSV(document);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toContain("statement");
    expect(csv).toContain("cash_flow");
    expect(csv).toContain("operating");
    expect(csv).toContain("net_change");
    const salaryLine = lines.find((line) => line.includes("Income:Salary"));
    expect(salaryLine).toBeDefined();
    // raw_amount and display_amount are identical for cash flow rows.
    expect(salaryLine).toContain("5000.00");
  });
});

describe("cash flow Markdown export", () => {
  const t = (key: string) => key;
  const markdown = statementToMarkdown(document, { locale: "en", t });

  it("renders the summary and supporting account detail", () => {
    expect(markdown).toContain("## reports.export.statementSummary");
    expect(markdown).toContain("## reports.export.supportingAccountDetail");
    expect(markdown).toContain("### Operating Activities");
    expect(markdown).toContain("Income:Salary");
  });

  it("discloses the heuristic classification and inferred cash set", () => {
    expect(markdown).toContain("reports.export.cashFlowClassificationNotice");
    expect(markdown).toContain("reports.export.cashFlowCashEquivalentsNotice");
  });

  it("omits the inferred-classification notices when every row is declared", () => {
    const declared = buildCashFlowDocument({
      title: "Cash Flow",
      statement: {
        ...statement,
        rows: statement.rows.map((row) => ({
          ...row,
          roleSource: "declared" as const,
        })),
        hasHeuristicCashAccounts: false,
      },
      labels,
      ...baseContext,
    });
    const declaredMarkdown = statementToMarkdown(declared, {
      locale: "en",
      t: (key: string) => key,
    });

    expect(declaredMarkdown).not.toContain(
      "reports.export.cashFlowClassificationNotice",
    );
    expect(declaredMarkdown).not.toContain(
      "reports.export.cashFlowCashEquivalentsNotice",
    );
    // Every other disclosure is unconditional and stays.
    expect(declaredMarkdown).toContain(
      "reports.export.unauditedManagementReport",
    );
    expect(declaredMarkdown).toContain("reports.export.subtotalRowsNotice");
    expect(declaredMarkdown).toContain("reports.export.noAssurance");
  });

  it("keeps the classification notice when any row is heuristic-resolved", () => {
    const mixed = buildCashFlowDocument({
      title: "Cash Flow",
      statement: {
        ...statement,
        rows: statement.rows.map((row, index) =>
          index === 0 ? { ...row, roleSource: "declared" as const } : row,
        ),
        hasHeuristicCashAccounts: false,
      },
      labels,
      ...baseContext,
    });
    const mixedMarkdown = statementToMarkdown(mixed, {
      locale: "en",
      t: (key: string) => key,
    });

    // Declared rows carry no disclosure, but heuristic ones still do…
    expect(mixedMarkdown).toContain(
      "reports.export.cashFlowClassificationNotice",
    );
    // …while the fully-declared cash set drops its own notice.
    expect(mixedMarkdown).not.toContain(
      "reports.export.cashFlowCashEquivalentsNotice",
    );
  });

  it("keeps the cash-set notice when a CCE member is heuristic-resolved", () => {
    const heuristicCash = buildCashFlowDocument({
      title: "Cash Flow",
      statement: {
        ...statement,
        rows: statement.rows.map((row) => ({
          ...row,
          roleSource: "declared" as const,
        })),
        hasHeuristicCashAccounts: true,
      },
      labels,
      ...baseContext,
    });
    const heuristicCashMarkdown = statementToMarkdown(heuristicCash, {
      locale: "en",
      t: (key: string) => key,
    });

    expect(heuristicCashMarkdown).not.toContain(
      "reports.export.cashFlowClassificationNotice",
    );
    expect(heuristicCashMarkdown).toContain(
      "reports.export.cashFlowCashEquivalentsNotice",
    );
  });

  it("labels a single-currency cash flow as a management report", () => {
    expect(markdown).toContain("reports.export.unauditedManagementReport");
    expect(markdown).not.toContain("reports.export.multiUnitScheduleNotice");
  });

  it("labels a multi-unit cash flow as a management schedule", () => {
    const multiUnit = buildCashFlowDocument({
      title: "Cash Flow",
      statement: {
        ...statement,
        totals: {
          operating: { USD: "3500.00", EUR: "200.00" },
          investing: { USD: "-1000.00" },
          financing: { USD: "-200.00" },
        },
        netChange: { USD: "2300.00", EUR: "200.00" },
        opening: { USD: "1000.00", EUR: "50.00" },
        closing: { USD: "3300.00", EUR: "250.00" },
      },
      labels,
      ...baseContext,
    });
    const multiUnitMarkdown = statementToMarkdown(multiUnit, {
      locale: "en",
      t: (key: string) => key,
    });

    expect(multiUnitMarkdown).toContain(
      "reports.export.unauditedMultiUnitManagementReport",
    );
    expect(multiUnitMarkdown).toContain(
      "reports.export.multiUnitScheduleNotice",
    );
  });
});

describe("cash flow bottom-line reconciliation", () => {
  function treeNode(
    account: string,
    balance: Record<string, unknown>,
    children: SerializableTreeNode[] = [],
  ): SerializableTreeNode {
    return {
      __typename: "SerializableTreeNode",
      account,
      balance,
      balanceChildren: balance,
      children: children as unknown as Record<string, unknown>[],
      cost: null,
      costChildren: null,
      hasTxns: true,
    } as SerializableTreeNode;
  }

  it("opening + net change equals closing per currency in the export document", () => {
    // Full pipeline: interval totals + closing hierarchy → t001 model → export document.
    const pipeline = buildCashFlowStatement({
      intervals: [
        {
          date: "2026-01-31",
          accountChanges: {
            "Income:Salary": { USD: "-5000.00", EUR: "-100.00" },
            "Expenses:Rent": { USD: "1500.00" },
            "Assets:Bank:Checking": { USD: "3500.00", EUR: "100.00" },
          },
        },
      ],
      closingCashAccounts: collectCashAccounts(
        treeNode("Assets", { USD: "3500.00", EUR: "100.00" }, [
          treeNode("Assets:Bank:Checking", { USD: "3500.00", EUR: "100.00" }),
        ]),
      ),
      primaryCurrency: "USD",
    });
    const doc = buildCashFlowDocument({
      title: "Cash Flow",
      statement: pipeline,
      labels,
      ...baseContext,
    });

    const bottomLine = doc.sections.find(
      (section) => section.key === "net_change",
    );
    if (!bottomLine) throw new Error("net_change section missing");
    const [openingRow, netChangeRow, closingRow] = bottomLine.rows;
    const toRecord = (row: (typeof bottomLine.rows)[number]) =>
      Object.fromEntries(
        row.amounts.map((amount) => [amount.unit, amount.displayAmount]),
      );

    // The identity holds per currency in exact decimal arithmetic.
    expect(
      sumBalanceRecords([toRecord(openingRow), toRecord(netChangeRow)]),
    ).toEqual(toRecord(closingRow));
    // And the rows carry the model's figures, in order, unmodified.
    expect(toRecord(openingRow)).toEqual({ EUR: "0.00", USD: "0.00" });
    expect(toRecord(netChangeRow)).toEqual({ EUR: "100.00", USD: "3500.00" });
    expect(toRecord(closingRow)).toEqual({ EUR: "100.00", USD: "3500.00" });
  });
});

describe("cash flow printable statement", () => {
  it("prints the summary and the disclosure notices", () => {
    render(<PrintableStatement document={document} />);

    expect(
      screen.getByText("reports.export.netCashOperating"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("reports.export.cashFlowClassificationNotice"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("reports.export.cashFlowCashEquivalentsNotice"),
    ).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
  });

  it("omits the inferred-classification notices when every row is declared", () => {
    const declared = buildCashFlowDocument({
      title: "Cash Flow",
      statement: {
        ...statement,
        rows: statement.rows.map((row) => ({
          ...row,
          roleSource: "declared" as const,
        })),
        hasHeuristicCashAccounts: false,
      },
      labels,
      ...baseContext,
    });

    render(<PrintableStatement document={declared} />);

    expect(
      screen.queryByText("reports.export.cashFlowClassificationNotice"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("reports.export.cashFlowCashEquivalentsNotice"),
    ).not.toBeInTheDocument();
    // The summary and the other disclosures are unaffected.
    expect(
      screen.getByText("reports.export.netCashOperating"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("reports.export.unauditedManagementReport"),
    ).toBeInTheDocument();
  });
});
