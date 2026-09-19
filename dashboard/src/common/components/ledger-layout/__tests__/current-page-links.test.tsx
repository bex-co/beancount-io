import { render, screen, waitFor } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { RelatedLinks } from "@/common/components/related-links";
import { LedgerSidebar } from "../ledger-sidebar";

/**
 * `Link` adds `aria-current="page"` by itself whenever it considers the
 * destination active, and it matches pathname prefixes by default. A mocked
 * Link renders a plain anchor and cannot reproduce that, so these cases run a
 * real router over a real history and read the attributes the router wrote.
 */

const mocks = vi.hoisted(() => ({
  errorsDocument: {},
  eventsDocument: {},
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: (document: object) =>
    document === mocks.errorsDocument
      ? { data: { getLedgerErrors: [] } }
      : { data: { getLedgerEvents: [] } },
}));

vi.mock("@/graphql/definitions.ts", () => ({
  GetLedgerErrorsDocument: mocks.errorsDocument,
  GetLedgerEventsDocument: mocks.eventsDocument,
}));

vi.mock("@/common/components/ui/sidebar.tsx", () => ({
  Sidebar: ({ children }: { children: ReactNode }) => <aside>{children}</aside>,
  SidebarContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarFooter: ({ children }: { children: ReactNode }) => (
    <footer>{children}</footer>
  ),
  SidebarGroup: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarHeader: ({ children }: { children: ReactNode }) => (
    <header>{children}</header>
  ),
  SidebarMenu: ({ children }: { children: ReactNode }) => <ul>{children}</ul>,
  SidebarMenuAction: ({
    children,
    ...props
  }: React.ComponentProps<"button">) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  SidebarMenuBadge: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
  // Mirrors the real primitive: it forwards `isActive` to `data-active` on the
  // child it renders, which is what the visual selection is driven by.
  SidebarMenuButton: ({
    asChild,
    children,
    isActive,
    tooltip: _tooltip,
    ...props
  }: React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string;
  }) =>
    asChild ? (
      <span data-active={String(!!isActive)}>{children}</span>
    ) : (
      <button type="button" data-active={String(!!isActive)} {...props}>
        {children}
      </button>
    ),
  SidebarMenuItem: ({ children }: { children: ReactNode }) => (
    <li>{children}</li>
  ),
  SidebarMenuSub: ({ children, ...props }: React.ComponentProps<"ul">) => (
    <ul {...props}>{children}</ul>
  ),
  SidebarMenuSubButton: ({
    children,
    isActive,
  }: {
    children: ReactNode;
    isActive?: boolean;
  }) => <span data-active={String(!!isActive)}>{children}</span>,
  SidebarMenuSubItem: ({ children }: { children: ReactNode }) => (
    <li>{children}</li>
  ),
  SidebarRail: () => null,
  useSidebar: () => ({
    isMobile: false,
    state: "expanded",
    setOpenMobile: vi.fn(),
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
  Authenticated: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../go-to-account.tsx", () => ({
  AccountCombobox: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../add-directive-button.tsx", () => ({
  AddDirectiveButton: () => <button type="button">Add directive</button>,
}));
vi.mock("../directive-usage-indicator.tsx", () => ({
  DirectiveUsageIndicator: () => null,
}));
vi.mock("@/common/components/ledger-permission/owner", () => ({
  LedgerOwnerPermission: ({ children }: { children: ReactNode }) => children,
}));

async function mountAt(initialEntry: string, ui: () => ReactNode) {
  const rootRoute = createRootRoute();
  // A splat child so every ledger path the sidebar links to resolves.
  const anyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "$",
    component: () => <>{ui()}</>,
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <>{ui()}</>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, anyRoute]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
  render(<RouterProvider router={router as never} />);
  await waitFor(() =>
    expect(document.querySelectorAll("a[href]").length).toBeGreaterThan(0),
  );
  return router;
}

function currentPageLinks() {
  return [...document.querySelectorAll("a[href]")].filter(
    (a) => a.getAttribute("aria-current") === "page",
  );
}

describe("current-page link semantics", () => {
  it("marks only the sidebar destination that is actually open", async () => {
    await mountAt("/ledger/alice/book/journal", () => (
      <LedgerSidebar
        ledgerId="alice/book"
        currentPath="/ledger/alice/book/journal"
      />
    ));

    const current = currentPageLinks();
    expect(current.map((a) => a.getAttribute("href"))).toEqual([
      "/ledger/alice/book/journal",
    ]);

    // The ancestor Overview is still a link, just not the current page — and
    // its visual selection already agreed.
    const overview = screen.getByRole("link", { name: "Overview" });
    expect(overview).not.toHaveAttribute("aria-current");
    expect(overview.closest("[data-active]")).toHaveAttribute(
      "data-active",
      "false",
    );
  });

  it("marks Overview itself when the overview page is open", async () => {
    await mountAt("/ledger/alice/book", () => (
      <LedgerSidebar ledgerId="alice/book" currentPath="/ledger/alice/book" />
    ));

    expect(currentPageLinks().map((a) => a.getAttribute("href"))).toEqual([
      "/ledger/alice/book",
    ]);
    expect(screen.getByRole("link", { name: "Journal" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps the open destination current on a filtered URL", async () => {
    await mountAt("/ledger/alice/book/journal?time=2016", () => (
      <LedgerSidebar
        ledgerId="alice/book"
        currentPath="/ledger/alice/book/journal"
      />
    ));

    // The filter rides along in the href; the page is still the journal.
    expect(currentPageLinks()).toHaveLength(1);
    expect(currentPageLinks()[0].getAttribute("href")).toContain("/journal");
  });

  it("does not let a related link to an ancestor claim the current page", async () => {
    await mountAt("/ledger/alice/book/journal", () => (
      <RelatedLinks
        links={[
          { to: "/ledger/alice/book", label: "Overview" },
          { to: "/ledger/alice/book/accounts", label: "Accounts" },
        ]}
      />
    ));

    expect(currentPageLinks()).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/ledger/alice/book",
    );
  });
});
