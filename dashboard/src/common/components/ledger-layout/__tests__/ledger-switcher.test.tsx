import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as apolloClient from "@apollo/client/react";
import type { ListLedgersQuery } from "@/graphql/definitions";
import { LedgerSwitcher } from "../ledger-switcher";
import { SidebarProvider, useSidebar } from "@/common/components/ui/sidebar";

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    className,
    "aria-label": ariaLabel,
  }: {
    children: ReactNode;
    className?: string;
    "aria-label"?: string;
  }) => (
    <a href="#" className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: "/ledger/open_ledger/ledger-1/journal" }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/common/components/authenticated", () => ({
  Authenticated: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/common/providers/react-native-bridge-provider", () => ({
  useReactNativeContext: () => ({ isReactNative: false }),
}));

function makeLedgers(count: number): ListLedgersQuery["listLedgers"] {
  return Array.from({ length: count }, (_, index) => {
    const name = `ledger-${index + 1}`;
    return {
      __typename: "Ledger" as const,
      id: `open_ledger/${name}`,
      name,
      fullName: `open_ledger/${name}`,
      httpUrl: `https://example.com/open_ledger/${name}`,
      sshUrl: `git@example.com:open_ledger/${name}`,
      private: false,
      empty: false,
      size: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      description: null,
      permissions: {
        __typename: "Permission" as const,
        admin: true,
        pull: true,
        push: true,
      },
    };
  });
}

function MobileDrawerProbe() {
  const { openMobile, setOpenMobile, isMobile } = useSidebar();
  return (
    <div>
      <div data-testid="is-mobile">{isMobile ? "mobile" : "desktop"}</div>
      <div data-testid="open-mobile">{openMobile ? "open" : "closed"}</div>
      <button type="button" onClick={() => setOpenMobile(true)}>
        Open drawer
      </button>
    </div>
  );
}

describe("LedgerSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1440,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue({
      data: { listLedgers: makeLedgers(20) },
      loading: false,
    } as ReturnType<typeof apolloClient.useQuery>);
    vi.mocked(apolloClient.useMutation).mockReturnValue([
      vi.fn(),
      { loading: false },
    ] as unknown as ReturnType<typeof apolloClient.useMutation>);
  });

  it("scrolls ledger results while keeping global actions outside the list", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <LedgerSwitcher
          currentLedgerId="open_ledger/ledger-1"
          currentLedgerName="ledger-1"
          currentLedgerFullName="open_ledger/ledger-1"
        />
      </SidebarProvider>,
    );

    await user.click(screen.getByRole("combobox", { name: "Select a ledger" }));

    expect(
      screen.getByRole("combobox", { name: /search ledgers/i }),
    ).toBeInTheDocument();

    const ledgerList = await screen.findByRole("listbox");
    const createButton = screen.getByRole("button", { name: "Create Ledger" });
    const manageButton = screen.getByRole("button", {
      name: "Manage your Beancount ledgers",
    });

    expect(ledgerList).toHaveClass(
      "min-h-0",
      "flex-1",
      "max-h-[300px]",
      "overflow-y-auto",
    );
    expect(ledgerList).not.toContainElement(createButton);
    expect(ledgerList).not.toContainElement(manageButton);
    expect(createButton.parentElement).toHaveClass(
      "shrink-0",
      "border-t",
      "bg-popover",
    );
  });

  it("closes the narrow sidebar drawer after selecting another ledger", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("max-width"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 390,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue({
      data: {
        listLedgers: makeLedgers(2).concat([
          {
            ...makeLedgers(1)[0],
            id: "open_ledger/minimax",
            name: "minimax",
            fullName: "open_ledger/minimax",
          },
        ]),
      },
      loading: false,
    } as ReturnType<typeof apolloClient.useQuery>);

    render(
      <SidebarProvider>
        <MobileDrawerProbe />
        <LedgerSwitcher
          currentLedgerId="open_ledger/ledger-1"
          currentLedgerName="ledger-1"
          currentLedgerFullName="open_ledger/ledger-1"
        />
      </SidebarProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-mobile")).toHaveTextContent("mobile");
    });

    await user.click(screen.getByRole("button", { name: "Open drawer" }));
    expect(screen.getByTestId("open-mobile")).toHaveTextContent("open");

    await user.click(screen.getByRole("combobox", { name: "Select a ledger" }));
    const destination = await screen.findByRole("option", {
      name: (_, element) =>
        element.getAttribute("data-value") === "open_ledger/minimax minimax",
    });
    await user.click(destination);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
      expect(screen.getByTestId("open-mobile")).toHaveTextContent("closed");
    });
  });
});
