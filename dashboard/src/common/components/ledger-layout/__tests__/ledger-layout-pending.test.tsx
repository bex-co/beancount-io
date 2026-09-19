import { act, cleanup, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
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
  const pathname = "/ledger/open_ledger/minimax/journal";
  let state: {
    isLoading: boolean;
    location: { pathname: string; search: Record<string, unknown> };
    matches: { pathname: string; search: Record<string, unknown> }[];
  };

  beforeEach(() => {
    state = {
      isLoading: false,
      location: { pathname, search: {} },
      matches: [{ pathname, search: {} }],
    };
    useRouterState.mockImplementation(
      ({
        select,
      }: {
        select: (
          s: typeof state & { pendingMatches: typeof state.matches },
        ) => unknown;
      }) => select({ ...state, pendingMatches: [state.location] }),
    );
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

  afterEach(cleanup);

  it.each(["time", "account", "filter"])(
    "hides the old outlet while a new %s scope loads, including the first navigation after hydration",
    (key) => {
      state.isLoading = true;
      state.location.search = { [key]: "new scope" };

      render(<LedgerLayout />);

      expect(screen.queryByTestId("ledger-outlet")).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
      expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    },
  );

  it("renders the outlet once the router is idle", () => {
    render(<LedgerLayout />);

    expect(screen.getByTestId("ledger-outlet")).toBeInTheDocument();
    expect(screen.getByRole("main")).not.toHaveAttribute("aria-busy");
  });

  it.each(["search", "type", "query", "groupBy"])(
    "retains the mounted outlet while local %s state changes",
    (key) => {
      const { rerender } = render(<LedgerLayout />);
      const outlet = screen.getByTestId("ledger-outlet");
      state.isLoading = true;
      state.location.search = { [key]: "local value" };
      rerender(<LedgerLayout />);

      expect(screen.getByTestId("ledger-outlet")).toBe(outlet);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByRole("main")).not.toHaveAttribute("aria-busy");
    },
  );

  it.each([
    "/ledger/open_ledger/other/journal",
    "/ledger/open_ledger/minimax/balance-sheet",
  ])("hides the old outlet while navigating to %s", (destination) => {
    state.isLoading = true;
    state.location.pathname = destination;
    render(<LedgerLayout />);
    expect(screen.queryByTestId("ledger-outlet")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it.each(["%20", "+"])(
    "hydrates the existing outlet during canonicalization of a %s date range URL",
    async (space) => {
      const path = "/ledger/open_ledger/minimax";
      const time = new URLSearchParams(
        `time=2026-02-01${space}-${space}2026-03-31`,
      ).get("time");
      state.matches = [{ pathname: `${path}/`, search: { time } }];
      state.location = { pathname: path, search: { time } };
      const container = document.createElement("div");
      document.body.appendChild(container);
      container.innerHTML = renderToString(<LedgerLayout />);
      const outlet = container.querySelector('[data-testid="ledger-outlet"]');
      state.isLoading = true;
      const onRecoverableError = vi.fn();
      const root = hydrateRoot(container, <LedgerLayout />, {
        onRecoverableError,
      });
      try {
        await act(async () => {});
        expect(container.querySelector('[data-testid="ledger-outlet"]')).toBe(
          outlet,
        );
        expect(onRecoverableError).not.toHaveBeenCalled();
      } finally {
        await act(async () => root.unmount());
        container.remove();
      }
    },
  );
});
