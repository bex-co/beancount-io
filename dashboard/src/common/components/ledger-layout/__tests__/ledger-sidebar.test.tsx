import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LedgerSidebar } from "../ledger-sidebar";

const mocks = vi.hoisted(() => ({
  setOpenMobile: vi.fn(),
  toggleSidebar: vi.fn(),
  sidebar: { isMobile: false, state: "expanded" },
  errorsDocument: {},
  eventsDocument: {},
  errors: [] as Array<{ message: string }>,
  events: [] as Array<{ date: string }>,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    activeOptions: _activeOptions,
    ...props
  }: React.ComponentProps<"a"> & { to: string; activeOptions?: unknown }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: (document: object) =>
    document === mocks.errorsDocument
      ? { data: { getLedgerErrors: mocks.errors } }
      : { data: { getLedgerEvents: mocks.events } },
}));

vi.mock("@/graphql/definitions.ts", () => ({
  GetLedgerErrorsDocument: mocks.errorsDocument,
  GetLedgerEventsDocument: mocks.eventsDocument,
}));

vi.mock("@/common/components/ui/sidebar.tsx", () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => (
    <aside>{children}</aside>
  ),
  SidebarContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarFooter: ({ children }: { children: React.ReactNode }) => (
    <footer>{children}</footer>
  ),
  SidebarGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarHeader: ({ children }: { children: React.ReactNode }) => (
    <header>{children}</header>
  ),
  SidebarMenu: ({ children }: { children: React.ReactNode }) => (
    <ul>{children}</ul>
  ),
  SidebarMenuAction: ({
    children,
    ...props
  }: React.ComponentProps<"button">) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  SidebarMenuBadge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  SidebarMenuButton: ({
    asChild,
    children,
    isActive: _isActive,
    tooltip: _tooltip,
    ...props
  }: React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string;
  }) =>
    asChild ? (
      children
    ) : (
      <button type="button" {...props}>
        {children}
      </button>
    ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <li>{children}</li>
  ),
  SidebarMenuSub: ({ children, ...props }: React.ComponentProps<"ul">) => (
    <ul {...props}>{children}</ul>
  ),
  SidebarMenuSubButton: ({ children }: { children: React.ReactNode }) =>
    children,
  SidebarMenuSubItem: ({ children }: { children: React.ReactNode }) => (
    <li>{children}</li>
  ),
  SidebarRail: () => null,
  useSidebar: () => ({
    ...mocks.sidebar,
    setOpenMobile: mocks.setOpenMobile,
    toggleSidebar: mocks.toggleSidebar,
  }),
}));

vi.mock("@/common/lib/utils/encode.ts", () => ({
  decodeLedgerId: () => ({ ledgerOwner: "alice", ledgerName: "book" }),
}));

vi.mock("@/common/lib/fava-options", () => ({
  getUpcomingEventsDays: () => 7,
}));

vi.mock("@/common/hooks/use-ledger.ts", () => ({
  useLedger: () => ({ ledgerData: {} }),
}));

vi.mock("../ledger-switcher", () => ({
  LedgerSwitcher: () => <div>Ledger switcher</div>,
}));

vi.mock("../../authenticated", () => ({
  Authenticated: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("../go-to-account.tsx", () => ({
  AccountCombobox: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("../add-directive-button.tsx", () => ({
  AddDirectiveButton: () => <button type="button">Add directive</button>,
}));

vi.mock("../directive-usage-indicator.tsx", () => ({
  DirectiveUsageIndicator: () => null,
}));

vi.mock("@/common/components/ledger-permission/owner", () => ({
  LedgerOwnerPermission: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe("LedgerSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.errors = [];
    mocks.events = [];
  });

  it("shows core workflows and keeps specialist destinations collapsed", async () => {
    const user = userEvent.setup();
    render(
      <LedgerSidebar ledgerId="alice/book" currentPath="/ledger/alice/book" />,
    );

    for (const label of [
      "Overview",
      "Journal",
      "Accounts",
      "Budget",
      "Files",
      "Ask Beancount.io",
      "Ledger Settings",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }

    // Group headers toggle disclosure; every group keeps a button for that.
    for (const label of ["Reports", "Import", "Advanced"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    // Only Reports has an obvious first read, so only its label navigates.
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute(
      "href",
      "/ledger/alice/book/income-statement",
    );
    for (const label of ["Import", "Advanced"]) {
      expect(screen.queryByRole("link", { name: label })).toBeNull();
    }

    expect(screen.queryByText("Income Statement")).not.toBeInTheDocument();
    expect(screen.queryByText("Query")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Status" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Need Help?")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reports" }));

    expect(screen.getByText("Income Statement")).toBeInTheDocument();
    expect(screen.getByText("Balance Sheet")).toBeInTheDocument();
    expect(screen.getByText("Trial Balance")).toBeInTheDocument();
    expect(screen.getByText("Holdings")).toBeInTheDocument();
    expect(screen.getByText("Statistics")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Balance Sheet" })).toHaveAttribute(
      "href",
      "/ledger/alice/book/balance-sheet",
    );
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/ledger/alice/book",
    );
  });

  it("automatically reveals the group containing the active route", () => {
    render(
      <LedgerSidebar
        ledgerId="alice/book"
        currentPath="/ledger/alice/book/commodities"
      />,
    );

    expect(screen.getByRole("button", { name: "Advanced" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      screen.getByRole("link", { name: "Commodities" }),
    ).toBeInTheDocument();
  });

  it("promotes an active status destination when it is the only visible item", () => {
    render(
      <LedgerSidebar
        ledgerId="alice/book"
        currentPath="/ledger/alice/book/events"
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Status" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Events" })).toBeInTheDocument();
  });

  it("keeps Errors at the top level when it is the only visible status item", () => {
    render(
      <LedgerSidebar
        ledgerId="alice/book"
        currentPath="/ledger/alice/book/errors"
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Status" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Errors" })).toBeInTheDocument();
  });

  it("shows status only when the ledger needs attention", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    mocks.errors = [{ message: "one" }, { message: "two" }];
    mocks.events = [{ date: today.toISOString().slice(0, 10) }];
    const user = userEvent.setup();

    render(
      <LedgerSidebar ledgerId="alice/book" currentPath="/ledger/alice/book" />,
    );

    const statusButton = screen.getByRole("button", { name: /Status/ });
    expect(statusButton).toHaveTextContent("3");

    await user.click(statusButton);
    expect(screen.getByRole("link", { name: "Errors" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Events" })).toBeInTheDocument();
  });

  it("exposes a labelled Ledger navigation landmark", () => {
    render(
      <LedgerSidebar ledgerId="alice/book" currentPath="/ledger/alice/book" />,
    );

    expect(
      screen.getByRole("navigation", { name: "Ledger" }),
    ).toBeInTheDocument();
  });

  /**
   * The current page's group opens on arrival, but its disclosure used to be
   * stuck open: activation flipped nothing because the active route forced
   * it true (w4/300).
   */
  describe("closing the group of the current page", () => {
    const balanceSheet = "/ledger/alice/book/balance-sheet";

    it("closes and reopens the active Reports group from its chevron", async () => {
      const user = userEvent.setup();
      render(
        <LedgerSidebar ledgerId="alice/book" currentPath={balanceSheet} />,
      );
      const chevron = screen.getByRole("button", { name: "Reports" });
      expect(chevron).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("link", { name: "Balance Sheet" })).toBeVisible();

      chevron.focus();
      await user.keyboard("{Enter}");
      expect(chevron).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("link", { name: "Balance Sheet" })).toBeNull();
      expect(document.activeElement).toBe(chevron);

      await user.keyboard(" ");
      expect(chevron).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("link", { name: "Balance Sheet" })).toBeVisible();

      await user.click(chevron);
      expect(chevron).toHaveAttribute("aria-expanded", "false");
      // The landing link beside it still navigates.
      expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute(
        "href",
        "/ledger/alice/book/income-statement",
      );
    });

    it("closes an active group whose header is its own button", async () => {
      const user = userEvent.setup();
      render(
        <LedgerSidebar
          ledgerId="alice/book"
          currentPath="/ledger/alice/book/commodities"
        />,
      );
      const advanced = screen.getByRole("button", { name: "Advanced" });
      await user.click(advanced);
      expect(advanced).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("link", { name: "Commodities" })).toBeNull();
      // An inactive group still opens and closes.
      const reports = screen.getByRole("button", { name: "Reports" });
      await user.click(reports);
      expect(reports).toHaveAttribute("aria-expanded", "true");
      await user.click(reports);
      expect(reports).toHaveAttribute("aria-expanded", "false");
    });

    it("reveals the group again when the reader arrives on another of its pages", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <LedgerSidebar ledgerId="alice/book" currentPath={balanceSheet} />,
      );
      await user.click(screen.getByRole("button", { name: "Reports" }));
      expect(screen.queryByRole("link", { name: "Balance Sheet" })).toBeNull();

      rerender(
        <LedgerSidebar
          ledgerId="alice/book"
          currentPath="/ledger/alice/book/trial-balance"
        />,
      );
      expect(screen.getByRole("button", { name: "Reports" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(screen.getByRole("link", { name: "Trial Balance" })).toBeVisible();
    });
  });
});

describe("LedgerSidebar's own collapse control", () => {
  afterEach(() => {
    mocks.sidebar = { isMobile: false, state: "expanded" };
  });

  it("offers Collapse while open and Expand on the rail, from a tablet up", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <LedgerSidebar ledgerId="alice/book" currentPath="/ledger/alice/book" />,
    );
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(mocks.toggleSidebar).toHaveBeenCalledTimes(1);

    mocks.sidebar = { isMobile: false, state: "collapsed" };
    rerender(
      <LedgerSidebar ledgerId="alice/book" currentPath="/ledger/alice/book" />,
    );
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
  });

  it("leaves a phone's drawer to the header's control", () => {
    mocks.sidebar = { isMobile: true, state: "expanded" };
    render(
      <LedgerSidebar ledgerId="alice/book" currentPath="/ledger/alice/book" />,
    );
    expect(
      screen.queryByRole("button", { name: /sidebar/i }),
    ).not.toBeInTheDocument();
  });
});
