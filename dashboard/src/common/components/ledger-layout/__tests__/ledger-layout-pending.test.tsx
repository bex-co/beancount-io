import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { LedgerLayout } from "../index";

const { useRouterState, useParams, useLocation, useNavigate, useQuery } =
  vi.hoisted(() => ({
    useRouterState: vi.fn(),
    useParams: vi.fn(),
    useLocation: vi.fn(),
    useNavigate: vi.fn(() => vi.fn()),
    useQuery: vi.fn(),
  }));

vi.mock("@tanstack/react-router", () => ({
  useRouterState,
  useParams,
  useLocation,
  useNavigate,
  Outlet: () => <div data-testid="ledger-outlet">outlet</div>,
}));

vi.mock("@apollo/client/react", () => ({ useQuery }));

vi.mock("@/common/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge",
  () => ({
    isReactNative: () => true,
  }),
);

vi.mock("@/common/providers/ledger-provider", () => ({
  LedgerProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/common/providers/ledger-search-params-provider", () => ({
  LedgerSearchParamsProvider: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../ledger-sidebar", () => ({
  LedgerSidebar: () => <div>sidebar</div>,
}));

vi.mock("../ledger-layout-background-queries", () => ({
  LedgerLayoutBackgroundQueries: () => null,
}));

vi.mock("../layout-header", () => ({
  LayoutHeader: () => null,
}));

vi.mock("@/common/components/ui/sidebar.tsx", () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("LedgerLayout pending outlet", () => {
  beforeEach(() => {
    useParams.mockReturnValue({
      ledgerOwner: "open_ledger",
      ledgerName: "minimax",
    });
    useLocation.mockReturnValue({
      pathname: "/ledger/open_ledger/minimax/journal",
    });
    useQuery.mockReturnValue({
      data: {
        getLedger: {
          id: "open_ledger/minimax",
          name: "minimax",
          options: {},
          favaOptions: {},
        },
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
  });

  it("replaces the outlet with an accessible pending state while the router loads", () => {
    useRouterState.mockImplementation(
      ({ select }: { select: (s: { isLoading: boolean }) => unknown }) =>
        select({ isLoading: true }),
    );

    render(<LedgerLayout />);

    expect(screen.queryByTestId("ledger-outlet")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
  });

  it("renders the outlet once the router is idle", () => {
    useRouterState.mockImplementation(
      ({ select }: { select: (s: { isLoading: boolean }) => unknown }) =>
        select({ isLoading: false }),
    );

    render(<LedgerLayout />);

    expect(screen.getByTestId("ledger-outlet")).toBeInTheDocument();
    expect(screen.getByRole("main")).not.toHaveAttribute("aria-busy");
  });
});
