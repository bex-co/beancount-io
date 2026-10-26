import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayoutHeader } from "../layout-header";

const locationMock = vi.hoisted(() => ({
  pathname: "/ledger/alice/book",
}));

vi.mock("@tanstack/react-router", () => ({
  useHydrated: () => true,
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

describe("LayoutHeader", () => {
  it("shows accessible help options before the create menu", async () => {
    const user = userEvent.setup();
    locationMock.pathname = "/ledger/alice/book";
    render(<LayoutHeader ledgerId="alice/book" />);

    const helpButton = screen.getByRole("button", {
      name: "Help and support",
    });
    const importButton = screen.getByRole("button", { name: "Import" });

    expect(
      helpButton.compareDocumentPosition(importButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(helpButton);

    const helpCenterLink = screen.getByRole("menuitem", {
      name: /Help Center/,
    });
    const communitySupportLink = screen.getByRole("menuitem", {
      name: /Community Support/,
    });
    const requestFeatureLink = screen.getByRole("menuitem", {
      name: /Request a Feature/,
    });

    expect(helpCenterLink).toHaveAttribute(
      "href",
      "https://beancount.io/docs/help-center",
    );
    expect(communitySupportLink).toHaveAttribute(
      "href",
      "https://t.me/beancount",
    );
    expect(requestFeatureLink).toHaveAttribute(
      "href",
      "https://github.com/bex-co/beancount-io/issues",
    );

    for (const link of [
      helpCenterLink,
      communitySupportLink,
      requestFeatureLink,
    ]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("exposes reporting filters on Cash Flow and a narrow Filters trigger", () => {
    locationMock.pathname = "/ledger/alice/book/cash-flow";
    render(<LayoutHeader ledgerId="alice/book" />);

    expect(screen.getByText("Ledger search (inline)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("offers no report filters for a Files page named journal.txt (w4/1102)", () => {
    for (const file of ["journal.txt", "notes.txt"]) {
      locationMock.pathname = `/ledger/alice/book/files/blob/main/qa-route-scope/${file}`;
      const { unmount } = render(<LayoutHeader ledgerId="alice/book" />);
      expect(screen.queryByText(/Ledger search/)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Filters" }),
      ).not.toBeInTheDocument();
      unmount();
    }

    locationMock.pathname = "/ledger/alice/book/journal";
    render(<LayoutHeader ledgerId="alice/book" />);
    expect(screen.getByText("Ledger search (inline)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });

  it("returns a signed-out visitor to this page, query and fragment (w4/237)", () => {
    locationMock.pathname = "/ledger/open_ledger/example/journal";
    Object.assign(locationMock, {
      href: "/ledger/open_ledger/example/journal?time=2017-09#main-content",
    });
    auth.signedIn = false;
    try {
      render(<LayoutHeader ledgerId="open_ledger/example" />);
      expect(screen.getByLabelText("Log in")).toHaveAttribute(
        "data-next",
        "/ledger/open_ledger/example/journal?time=2017-09#main-content",
      );
    } finally {
      auth.signedIn = true;
      delete (locationMock as { href?: string }).href;
    }
  });
});
