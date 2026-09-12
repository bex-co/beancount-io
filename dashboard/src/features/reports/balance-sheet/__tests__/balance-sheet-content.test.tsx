import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  GetLedgerBalanceSheetQuery,
  SerializableTreeNode,
} from "@/graphql/definitions";
import { BalanceSheetContent } from "../balance-sheet-content";

vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: React.ReactNode }) => children,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerOwner: "alice",
    ledgerName: "book",
    ledgerData: { options: {} },
  }),
}));

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (value: number) => String(value),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.account ? `${key}:${params.account}` : key,
  }),
}));

// Stateful stand-in for the cookie-backed charts-visibility state so the toggle
// actually re-renders the page the way it does in the browser.
vi.mock("@/common/hooks/use-cookie-storage-state", async () => {
  const { useState } = await import("react");
  return {
    useCookieStorageState: (_key: string, initial: unknown) =>
      useState(initial) as unknown,
  };
});

vi.mock("../line-chart", () => ({ LineChart: () => null }));
vi.mock("../hierarchy-visualization-card", () => ({
  HierarchyVisualizationCard: () => null,
}));
vi.mock("../../export/statement-export-menu", () => ({
  StatementExportMenu: () => null,
}));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));
vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
}));
vi.mock("@/common/components/interval-select", () => ({
  IntervalSelect: () => <button type="button">interval-select</button>,
}));
vi.mock("@/common/components/conversion-select", () => ({
  ConversionSelect: () => null,
}));
vi.mock("@/common/components/responsive-tab-trigger-list", () => ({
  ResponsiveTabTriggerList: () => null,
}));

function node(
  account: string,
  children: SerializableTreeNode[] = [],
): SerializableTreeNode {
  return {
    __typename: "SerializableTreeNode",
    account,
    balance: { USD: "1.00" },
    balanceChildren: { USD: "1.00" },
    children: children as unknown as Array<Record<string, unknown>>,
    cost: null,
    costChildren: null,
    hasTxns: true,
  };
}

const balanceSheetData = {
  assetsHierarchyData: node("Assets", [node("Assets:Cash")]),
  liabilitiesHierarchyData: node("Liabilities"),
  equityHierarchyData: node("Equity"),
  netWorthData: [],
  assetsData: [],
  liabilitiesData: [],
  equityData: [],
} as unknown as GetLedgerBalanceSheetQuery["getLedgerBalanceSheet"];

function renderContent() {
  render(
    <BalanceSheetContent
      balanceSheetData={balanceSheetData}
      primaryCurrency="USD"
      reportingEntityName="Acme, Inc."
      reportingEntitySource="ledger_title"
      ledgerDisplayName="Demo Books"
      ledgerOwner="alice"
      ledgerNameParam="book"
      conversion="at_cost"
      onConversionChange={vi.fn()}
      timeInterval="monthly"
      onTimeIntervalChange={vi.fn()}
      invertIncomeLiabilitiesEquity={false}
      // At least one active filter, so every unmemoized `filterAccountHierarchy`
      // call would rebuild the tree (it returns its input untouched when no
      // filter applies, which hid the identity churn).
      showZeroBalance={false}
      showZeroTransactions
      showClosedAccounts
      closedAccountNames={new Set<string>()}
      collapsePatterns={[]}
      filters={{ time: "2026-01-01 - 2026-06-30", account: "", filter: "" }}
      fiscalYearEnd={{ month: 12, day: 31 }}
    />,
  );
}

describe("BalanceSheetContent", () => {
  it("keeps collapsed account branches collapsed when charts are toggled", async () => {
    const user = userEvent.setup();
    renderContent();

    // Assets:Cash is a child row of the Assets tree in the accounts list.
    expect(screen.getByText("Cash")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "common.toggleAccountChildren:Assets",
      }),
    );
    expect(screen.queryByText("Cash")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "common.hideCharts" }));

    // Regression: the hierarchies were rebuilt on every render, so toggling the
    // charts gave HierarchyList new tree identities and reopened the branch.
    expect(screen.queryByText("Cash")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "common.showCharts" }));
    expect(screen.queryByText("Cash")).not.toBeInTheDocument();
  });

  it("removes the collapsed chart section's controls from the tab order", async () => {
    const user = userEvent.setup();
    renderContent();

    const toggle = screen.getByRole("button", { name: "common.hideCharts" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const sectionId = toggle.getAttribute("aria-controls")!;
    expect(document.getElementById(sectionId)).not.toBeNull();

    expect(
      screen.getByRole("button", { name: "interval-select" }),
    ).toBeInTheDocument();

    await user.click(toggle);
    // jsdom never runs the 300ms grid-row animation; end it explicitly.
    fireEvent.transitionEnd(document.getElementById(sectionId)!.parentElement!);

    expect(
      screen.getByRole("button", { name: "common.showCharts" }),
    ).toHaveAttribute("aria-expanded", "false");
    // Collapsed chart controls leave the accessibility tree and the tab order.
    expect(
      screen.queryByRole("button", { name: "interval-select" }),
    ).not.toBeInTheDocument();

    screen.getByRole("button", { name: "common.showCharts" }).focus();
    await user.tab();
    expect(
      document.getElementById(sectionId)!.contains(document.activeElement),
    ).toBe(false);
  });
});
