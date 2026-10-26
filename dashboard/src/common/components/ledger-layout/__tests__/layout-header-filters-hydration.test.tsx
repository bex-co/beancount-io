import { act, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LayoutHeader } from "../layout-header";

/**
 * The compact Filters trigger opens its sheet from client state, so an early
 * click before hydration is lost and never replayed (w4/1101). It is
 * unavailable in server markup and enabled once hydrated, then opens the
 * sheet on its first activation. Real SSR markup, real hydration.
 */

const locationMock = vi.hoisted(() => ({
  pathname: "/ledger/alice/book",
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  // The real useHydrated: false on the server and through hydration's first
  // pass, true once hydrated.
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useLocation: () => locationMock,
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({
      location: { href: locationMock.pathname, ...locationMock },
    }),
  Link: ({
    children,
    search,
    ...props
  }: React.ComponentProps<"a"> & { search?: { next?: string } }) => (
    <a data-next={search?.next} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/common/components/ui/sidebar.tsx", () => ({
  SidebarTrigger: () => <button type="button">Open sidebar</button>,
  useSidebar: () => ({ state: "expanded", isMobile: false, openMobile: false }),
}));

vi.mock("@/common/components/ledger-search-controls", () => ({
  LedgerSearchControls: ({ layout }: { layout?: string }) => (
    <div>Ledger search ({layout ?? "inline"})</div>
  ),
}));

vi.mock("@/common/providers/ledger-search-params-provider", () => ({
  LedgerSearchParamsContext: {
    // Consumer reads via useContext; Provider isn't needed when we mock useContext
  },
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useContext: () => ({
      searchParams: { time: "2025", account: "", filter: "" },
      setSearchParams: vi.fn(),
    }),
  };
});

vi.mock("@/common/hooks/use-translations.ts", () => ({
  useTranslations: () => ({
    t: (key: string) =>
      ({
        "auth.login": "Log in",
        "common.helpAndSupport": "Help and support",
        "common.helpCenter": "Help Center",
        "common.helpCenterDescription": "Browse guides and documentation",
        "common.communitySupport": "Community Support",
        "common.communitySupportDescription": "Ask the community on Telegram",
        "common.requestFeature": "Request a Feature",
        "common.requestFeatureDescription":
          "Share ideas or report bugs on GitHub",
        "component.searchControls.filters": "Filters",
        "component.searchControls.filtersTitle": "Report filters",
        "component.searchControls.filtersDescription":
          "Change the time, account, or payee/tag scope for this page.",
      })[key] ?? key,
    i18n: { language: "en" },
  }),
}));

const auth = vi.hoisted(() => ({ signedIn: true }));
vi.mock("../../authenticated", () => ({
  Authenticated: ({
    children,
    fallback,
  }: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) => (auth.signedIn ? children : fallback),
}));

vi.mock("../../user-nav.tsx", () => ({
  UserNav: () => <button type="button">User menu</button>,
}));

vi.mock("../import-dropdown.tsx", () => ({
  ImportDropdown: () => <button type="button">Import</button>,
}));

vi.mock("../ledger-out-of-date-indicator", () => ({
  LedgerOutOfDateIndicator: () => null,
}));

vi.mock("../../ledger-permission/write.tsx", () => ({
  LedgerWritePermission: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe("Filters trigger before and after hydration", () => {
  it("is unavailable in server markup and opens the sheet once hydrated", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const header = <LayoutHeader ledgerId="alice/book" />;
    container.innerHTML = renderToString(header);
    const filters = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Filters"]',
    )!;
    expect(filters).not.toBeNull();
    expect(filters).toBeDisabled();
    expect(filters).toHaveAttribute("aria-expanded", "false");

    const recoverable = vi.fn();
    await act(async () => {
      hydrateRoot(container, header, { onRecoverableError: recoverable });
    });
    await waitFor(() => expect(filters).toBeEnabled());

    await act(async () => filters.click());
    expect(filters).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(recoverable).not.toHaveBeenCalled();
    container.remove();
  });
});
