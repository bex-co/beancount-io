import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LedgerLayout } from "@/common/components/ledger-layout";
import ImportPage from "../import-page";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  mutate: vi.fn(),
  useMutation: vi.fn(),
  refetch: vi.fn(),
  aiCategorize: vi.fn(),
  llmParse: vi.fn(),
  authenticated: true,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useParams: () => ({ ledgerOwner: "open_ledger", ledgerName: "example" }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/ledger/open_ledger/example/import" }),
  useRouterState: () => false,
  Outlet: () => <ImportPage />,
  ClientOnly: ({ children }: { children: ReactNode }) => <>{children}</>,
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: mocks.query,
  useMutation: mocks.useMutation,
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
vi.mock("@/common/components/ai-cfo-upgrade-panel", () => ({
  AiCfoUpgradePanel: () => <div>AI CFO upgrade</div>,
}));
vi.mock("../../hooks/use-llm-parser", () => ({
  useLLMParser: () => ({ parseFile: mocks.llmParse }),
}));
vi.mock("../../hooks/use-ai-categorization", () => ({
  useAICategorization: () => ({
    categorizeTransactions: mocks.aiCategorize,
    loading: false,
  }),
}));
vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: ({
    value,
    onValueChange,
    placeholder,
    disabled,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
  }) => (
    <input
      aria-label={placeholder}
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
  CurrencyCombobox: ({
    value,
    onValueChange,
  }: {
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <input
      aria-label="currency"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
}));

const ledger = {
  id: "open_ledger/example",
  name: "Example",
  permissions: { pull: true, push: false, admin: false },
  options: { operatingCurrency: ["USD"] },
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

function expectNoWriteWorkflow(container: HTMLElement) {
  expect(container.querySelector('input[type="file"]')).toBeNull();
  expect(screen.queryByRole("button", { name: "Browse files" })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Continue to Configure" }),
  ).toBeNull();
  expect(screen.queryByRole("button", { name: /Import \d/ })).toBeNull();
  expect(screen.queryByRole("button", { name: "AI Fill" })).toBeNull();
  expect(mocks.mutate).not.toHaveBeenCalled();
  expect(mocks.aiCategorize).not.toHaveBeenCalled();
  expect(mocks.llmParse).not.toHaveBeenCalled();
}

async function uploadCsvAndConfigure(container: HTMLElement) {
  const user = userEvent.setup();
  const fileInput = container.querySelector('input[type="file"]');
  expect(fileInput).not.toBeNull();
  await user.upload(
    fileInput as HTMLInputElement,
    new File(
      [
        "Date,Payee,Description,Amount\n2026-10-08,QA Synthetic,Preview only,-1.00",
      ],
      "synthetic.csv",
      { type: "text/csv" },
    ),
  );
  expect(await screen.findByText("QA Synthetic")).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Continue to Configure" }),
  );
  expect(screen.getByText("Configure Import Settings")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "AI Fill" })).toBeEnabled();
  return user;
}

describe("Smart Import ledger access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticated = true;
    mocks.useMutation.mockReturnValue([mocks.mutate, { loading: false }]);
    mocks.mutate.mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });
    setAccess(ledger.permissions);
  });
  afterEach(cleanup);

  it("shows an accessible read-only explanation and preserves read navigation without mounting import hooks", () => {
    const { container } = render(<LedgerLayout />);

    expect(screen.getByRole("status")).toHaveTextContent("Import unavailable");
    expect(screen.getByRole("status")).toHaveTextContent(
      "This ledger is read-only for you",
    );
    expectNoWriteWorkflow(container);
    expect(mocks.useMutation).not.toHaveBeenCalled();
    expect(screen.queryByText("AI CFO upgrade")).toBeNull();
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

  it("fails closed when ledger permissions have not been resolved", () => {
    setAccess(null);
    const { container } = render(<LedgerLayout />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Write access could not be confirmed",
    );
    expectNoWriteWorkflow(container);
    expect(mocks.useMutation).not.toHaveBeenCalled();
  });

  it("keeps the route unmounted while ledger access loads, even with cached writer permissions", () => {
    setAccess({ ...ledger.permissions, push: true }, { loading: true });
    const { container } = render(<LedgerLayout />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading ledger access",
    );
    expect(screen.queryByRole("heading", { name: "Smart Import" })).toBeNull();
    expectNoWriteWorkflow(container);
    expect(mocks.useMutation).not.toHaveBeenCalled();
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
    expectNoWriteWorkflow(container);
    expect(mocks.useMutation).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("does not expose import controls for an unauthenticated reader", () => {
    mocks.authenticated = false;
    setAccess({ ...ledger.permissions, push: true });
    const { container } = render(<LedgerLayout />);

    expect(screen.getByRole("status")).toHaveTextContent("Import unavailable");
    expectNoWriteWorkflow(container);
  });

  it.each(["push", "admin"] as const)(
    "preserves CSV preview and configuration with %s access",
    async (permission) => {
      setAccess({ ...ledger.permissions, [permission]: true });
      const { container } = render(<LedgerLayout />);

      await uploadCsvAndConfigure(container);

      expect(
        screen.getByRole("button", { name: /Import 1 Transaction/ }),
      ).toBeEnabled();
      expect(mocks.mutate).not.toHaveBeenCalled();
      expect(mocks.llmParse).not.toHaveBeenCalled();
    },
  );

  it("submits normally for a writer after CSV preview and account configuration", async () => {
    setAccess({ ...ledger.permissions, push: true });
    const { container } = render(<LedgerLayout />);
    const user = await uploadCsvAndConfigure(container);
    await user.type(
      screen.getByRole("textbox", { name: "Select source account..." }),
      "Assets:Checking",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Select account..." }),
      "Expenses:Supplies",
    );

    await user.click(
      screen.getByRole("button", { name: /Import 1 Transaction/ }),
    );

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledOnce());
    expect(mocks.mutate).toHaveBeenCalledWith({
      variables: {
        ledgerId: "open_ledger/example",
        entries: [
          {
            type: "TRANSACTION",
            transaction: {
              date: "2026-10-08",
              flag: "*",
              payee: "QA Synthetic",
              narration: "Preview only",
              postings: [
                {
                  account: "Assets:Checking",
                  units: { number: "-1.00", currency: "USD" },
                },
                {
                  account: "Expenses:Supplies",
                  units: { number: "1.00", currency: "USD" },
                },
              ],
            },
          },
        ],
      },
    });
    expect(
      await screen.findByRole(
        "heading",
        { name: "Import Successful!" },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });

  it("removes configuration and AI controls immediately when write permission is lost", async () => {
    setAccess({ ...ledger.permissions, push: true });
    const { container, rerender } = render(<LedgerLayout />);
    await uploadCsvAndConfigure(container);

    setAccess(ledger.permissions);
    rerender(<LedgerLayout />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "This ledger is read-only for you",
    );
    expectNoWriteWorkflow(container);
    expect(screen.queryByText("Configure Import Settings")).toBeNull();
  });
});
