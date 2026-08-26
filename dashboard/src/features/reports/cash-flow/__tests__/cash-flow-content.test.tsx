import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CashFlowContent } from "../cash-flow-content";
import type { CashAccountSnapshot, CashFlowStatement } from "../lib/model";

vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: React.ReactNode }) => children,
  Link: ({
    to,
    params,
    children,
    ...props
  }: React.ComponentProps<"a"> & {
    to: string;
    params?: Record<string, string>;
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerOwner: "demo", ledgerName: "books" }),
}));

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (value: number) => String(value),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/common/hooks/use-cookie-storage-state", () => ({
  useCookieStorageState: (_key: string, initial: unknown) => [initial, vi.fn()],
}));

// Heavy or irrelevant children: the test targets the statement lists.
vi.mock("../cash-flow-charts", () => ({
  NetCashFlowChart: () => null,
  ActivityBreakdownChart: () => null,
}));
vi.mock("../export/statement-export-menu", () => ({
  StatementExportMenu: () => null,
}));
vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
}));
vi.mock("@/common/components/conversion-select", () => ({
  ConversionSelect: () => null,
}));
vi.mock("@/common/components/interval-select", () => ({
  IntervalSelect: () => null,
}));
vi.mock("@/common/components/responsive-tab-trigger-list", () => ({
  ResponsiveTabTriggerList: () => null,
}));

const statement: CashFlowStatement = {
  rows: [
    {
      accountPath: "Income:Salary",
      label: "Salary",
      activity: "operating",
      roleSource: "declared",
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
  ],
  totals: {
    operating: { USD: "3500.00" },
    investing: { USD: "-1000.00" },
    financing: {},
  },
  netChange: { USD: "2500.00" },
  opening: { USD: "1000.00" },
  closing: { USD: "3500.00" },
  intervals: [],
  invalidRoleValues: [],
  hasHeuristicCashAccounts: true,
};

const closingCashAccounts: CashAccountSnapshot[] = [
  {
    account: "Assets:Bank:Checking",
    balance: { USD: "3500.00" },
    roleSource: "heuristic",
  },
];

function renderContent() {
  return render(
    <CashFlowContent
      statement={statement}
      closingCashAccounts={closingCashAccounts}
      cashAccountRows={[]}
      primaryCurrency="USD"
      reportingEntityName="Acme, Inc."
      reportingEntitySource="ledger_title"
      ledgerDisplayName="Acme Books"
      ledgerOwner="demo"
      ledgerNameParam="books"
      showClosedAccounts={false}
      conversion="at_cost"
      onConversionChange={() => {}}
      timeInterval="monthly"
      onTimeIntervalChange={() => {}}
      filters={{ time: "", account: "", filter: "" }}
      fiscalYearEnd={{ month: 12, day: 31 }}
      collapsePatterns={[]}
    />,
  );
}

describe("CashFlowContent declared/inferred indicators", () => {
  it("marks declared rows and leaves heuristic rows unmarked", () => {
    renderContent();

    // Exactly one declared row (Salary) carries the marker.
    const badges = screen.getAllByText("page.cashFlow.declaredRoleBadge");
    expect(badges).toHaveLength(1);

    // The marker sits in the declared row, next to its account link.
    const salaryLink = screen.getByRole("link", { name: "Income:Salary" });
    expect(salaryLink.parentElement).toContainElement(badges[0]);

    // Heuristic rows render no marker.
    const rentLink = screen.getByRole("link", { name: "Expenses:Rent" });
    expect(
      rentLink.parentElement?.querySelector(
        '[title="page.cashFlow.declaredRoleTooltip"]',
      ),
    ).toBeNull();
  });
});

describe("CashFlowContent statement tables", () => {
  const summaryLabels = [
    "reports.export.netCashOperating",
    "reports.export.netCashInvesting",
    "reports.export.netCashFinancing",
    "reports.export.netChangeInCash",
    "reports.export.openingCash",
    "reports.export.closingCash",
  ];

  it("links only real accounts — no synthetic section or bottom-line nodes", () => {
    renderContent();

    const accountHrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href") ?? "")
      .filter((href) => href.includes("/account/"))
      .sort();
    // Assets:Invest is the real parent account rolled up from its leaf row.
    expect(accountHrefs).toEqual([
      "/ledger/demo/books/account/Assets:Bank:Checking",
      "/ledger/demo/books/account/Assets:Invest",
      "/ledger/demo/books/account/Assets:Invest:Brokerage",
      "/ledger/demo/books/account/Expenses:Rent",
      "/ledger/demo/books/account/Income:Salary",
    ]);

    // Section titles and the bottom-line trio never become account links.
    summaryLabels.forEach((label) => {
      expect(
        screen.queryByRole("link", { name: label }),
      ).not.toBeInTheDocument();
    });
  });

  it("renders section totals and the bottom line as plain rows below the accounts", () => {
    const { container } = renderContent();
    const text = container.textContent ?? "";

    // "Net cash from … activities" sits below its detail rows.
    expect(text.indexOf("reports.export.netCashOperating")).toBeGreaterThan(
      Math.max(text.indexOf("Income:Salary"), text.indexOf("Expenses:Rent")),
    );
    expect(text.indexOf("reports.export.netCashInvesting")).toBeGreaterThan(
      text.indexOf("Assets:Invest:Brokerage"),
    );

    // Bottom line: cash accounts (closing balances) → period end (their total)
    // → period start → net change.
    const checkingAt = text.indexOf("Assets:Bank:Checking");
    const closingAt = text.indexOf("reports.export.closingCash");
    const openingAt = text.indexOf("reports.export.openingCash");
    const netChangeAt = text.indexOf("reports.export.netChangeInCash");
    expect(checkingAt).toBeGreaterThan(-1);
    expect(closingAt).toBeGreaterThan(checkingAt);
    expect(openingAt).toBeGreaterThan(closingAt);
    expect(netChangeAt).toBeGreaterThan(openingAt);
  });
});
