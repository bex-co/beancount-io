import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LedgerLayout } from "@/common/components/ledger-layout";
import ReceiptPage from "../receipt-page";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  refetch: vi.fn(),
  useReceiptWorkflow: vi.fn(),
  authenticated: true,
}));

// The failed-renewal banner reads billing state the shell under test does
// not provide; it has its own tests.
vi.mock("@/common/components/billing/failed-renewal-banner", () => ({
  FailedRenewalBanner: () => null,
}));
vi.mock("@/common/components/billing/billing-status-banner", () => ({
  BillingStatusBanner: () => null,
}));
vi.mock("@/common/hooks/use-safe-return-path", () => ({
  useSafeReturnPath: () => "/ledger/open_ledger/example/receipt",
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useParams: () => ({ ledgerOwner: "open_ledger", ledgerName: "example" }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({
    pathname: "/ledger/open_ledger/example/receipt",
    href: "/ledger/open_ledger/example/receipt",
  }),
  useRouterState: () => false,
  Outlet: () => <ReceiptPage />,
  Link: ({
    to,
    search,
    children,
  }: {
    to: string;
    search?: { next?: string };
    children: ReactNode;
  }) => (
    <a
      href={search?.next ? `${to}?next=${encodeURIComponent(search.next)}` : to}
    >
      {children}
    </a>
  ),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: mocks.query,
  useMutation: () => [vi.fn(), { loading: false }],
}));

vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => mocks.authenticated,
}));

vi.mock("@/common/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge",
  () => ({ isReactNative: () => true }),
);
vi.mock("@/common/providers/ledger-search-params-provider", () => ({
  LedgerSearchParamsProvider: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@/common/components/ui/sidebar.tsx", () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/common/components/ledger-layout/ledger-sidebar", () => ({
  LedgerSidebar: () => null,
}));
vi.mock(
  "@/common/components/ledger-layout/ledger-layout-background-queries",
  () => ({
    LedgerLayoutBackgroundQueries: () => null,
  }),
);
vi.mock("@/common/components/ledger-layout/layout-header", () => ({
  LayoutHeader: () => null,
}));
vi.mock("@/common/components/ledger-layout/ledger-layout-loading", () => ({
  LedgerLayoutLoading: () => <div role="status">Loading ledger access</div>,
}));
vi.mock("../../hooks/use-receipt-workflow", () => ({
  useReceiptWorkflow: mocks.useReceiptWorkflow,
}));

const ledger = {
  id: "open_ledger/example",
  name: "Example",
  permissions: { pull: true, push: false, admin: false },
  options: { operatingCurrency: ["USD"] },
};

const workflow = {
  state: { step: "idle" },
  startUpload: vi.fn(),
  submit: vi.fn(),
  reset: vi.fn(),
};

function setAccess(
  permissions: typeof ledger.permissions | null,
  queryState: { loading?: boolean; error?: Error } = {},
) {
  mocks.query.mockReturnValue({
    data: { getLedger: { ...ledger, permissions } },
    loading: false,
    error: undefined,
    refetch: mocks.refetch,
    ...queryState,
  });
}

function expectNoUpload(container: HTMLElement) {
  expect(container.querySelector('input[type="file"]')).toBeNull();
  expect(screen.queryByRole("button", { name: "Choose File" })).toBeNull();
  expect(mocks.useReceiptWorkflow).not.toHaveBeenCalled();
}

describe("Upload Receipt ledger access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticated = true;
    mocks.useReceiptWorkflow.mockReturnValue(workflow);
    setAccess(ledger.permissions);
  });
  afterEach(cleanup);

  it("tells a signed-in reader the ledger is read-only and keeps read navigation", () => {
    const { container } = render(<LedgerLayout />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Receipt upload unavailable");
    expect(status).toHaveTextContent("This ledger is read-only for you");
    expectNoUpload(container);
    expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute(
      "href",
      "/ledger/open_ledger/example/journal",
    );
    expect(screen.getByRole("link", { name: "Files" })).toHaveAttribute(
      "href",
      "/ledger/open_ledger/example/files/tree/main",
    );
    expect(screen.getByRole("link", { name: "Query" })).toHaveAttribute(
      "href",
      "/ledger/open_ledger/example/query",
    );
  });

  it("invites a signed-out visitor to sign in and return to the receipt page", () => {
    mocks.authenticated = false;
    setAccess(null);
    const { container } = render(<LedgerLayout />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(
      "Sign in to upload receipts to this ledger.",
    );
    expect(status).not.toHaveTextContent("could not be confirmed");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/login?next=%2Fledger%2Fopen_ledger%2Fexample%2Freceipt",
    );
    expectNoUpload(container);
  });

  it("fails closed for a signed-in user whose permissions could not be read", () => {
    setAccess(null);
    const { container } = render(<LedgerLayout />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Write access could not be confirmed",
    );
    expectNoUpload(container);
  });

  it("keeps the route unmounted while ledger access loads", () => {
    setAccess({ ...ledger.permissions, push: true }, { loading: true });
    const { container } = render(<LedgerLayout />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading ledger access",
    );
    expect(
      screen.queryByRole("heading", { name: "Upload Receipt" }),
    ).toBeNull();
    expectNoUpload(container);
  });

  it("keeps the route unmounted when the access read fails and offers retry", async () => {
    setAccess(
      { ...ledger.permissions, push: true },
      { error: new Error("Network error") },
    );
    const { container } = render(<LedgerLayout />);

    expect(
      screen.getByRole("heading", { name: "Network Connection Failed" }),
    ).toBeInTheDocument();
    expectNoUpload(container);
    await userEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it.each(["push", "admin"] as const)(
    "keeps the upload flow for a writer with %s access",
    async (permission) => {
      setAccess({ ...ledger.permissions, [permission]: true });
      const { container } = render(<LedgerLayout />);

      expect(screen.queryByRole("status")).toBeNull();
      const input = container.querySelector('input[type="file"]');
      expect(input).not.toBeNull();
      expect(mocks.useReceiptWorkflow).toHaveBeenCalledWith(
        "open_ledger/example",
      );
      await userEvent.upload(
        input as HTMLInputElement,
        new File(["png"], "receipt.png", { type: "image/png" }),
      );
      expect(screen.getByText("receipt.png")).toBeInTheDocument();
    },
  );
});
