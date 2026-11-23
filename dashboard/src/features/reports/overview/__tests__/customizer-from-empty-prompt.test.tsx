import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import LedgerOverviewPage from "../index";

const searchParamsMock = vi.hoisted(() => ({
  account: "",
  filter: "",
  time: "",
}));
const access = vi.hoisted(() => ({ canWrite: true }));

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));
// The public reader's header star is not under test here.
vi.mock("../components/star-button", () => ({ StarButton: () => null }));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({
    children,
    to,
    params,
    search,
    activeOptions: _activeOptions,
    ...props
  }: React.ComponentProps<"a"> & {
    to: string;
    activeOptions?: unknown;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
  }) => (
    <a
      href="#"
      data-to={to}
      data-params={params ? JSON.stringify(params) : undefined}
      data-search={search ? JSON.stringify(search) : undefined}
      {...props}
    >
      {children}
    </a>
  ),
  useParams: () => ({ ledgerOwner: "demo", ledgerName: "empty" }),
  useLoaderData: () => ({}),
}));

vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: searchParamsMock,
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    primaryCurrency: "USD",
    ledgerName: "Empty ledger",
    ledgerData: {
      isStarred: false,
      options: { nameIncome: "Income", nameExpenses: "Expenses" },
      bcioOptions: {
        transactionFile: null,
        defaultFile: "books/2026.bean",
      },
    },
  }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({
    isAdmin: access.canWrite,
    canWrite: access.canWrite,
  }),
}));

vi.mock("@/common/lib/fava-options", () => ({
  getInvertIncomeLiabilitiesEquity: () => false,
}));

vi.mock("@/features/ai-agent/components/quick-ask-input", () => ({
  QuickAskInput: () => null,
}));
vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: () => null,
}));
// The modules themselves are not under test here; only which are shown.
vi.mock("../components/net-worth-card", () => ({
  NetWorthCard: () => <div data-testid="module-financial-position" />,
}));
vi.mock("../components/money-movement-section", () => ({
  MoneyMovementSection: () => <div data-testid="module-money-movement" />,
}));
vi.mock("../components/recent-activity-card", () => ({
  RecentActivityCard: () => <div data-testid="module-recent-activity" />,
}));
vi.mock("../components/account-balances-card", () => ({
  AccountBalancesCard: () => null,
}));
vi.mock("../components/cash-flow-sankey", () => ({ default: () => null }));
vi.mock("@/common/components/readme-card", () => ({ ReadmeCard: () => null }));

/**
 * The all-hidden prompt owned its own customization panel, so enabling the
 * first module removed the prompt — and the open panel with it (w4/185). The
 * real layout hook and customizer are used, over real localStorage.
 */
const STORAGE_KEY = "ledger.demo/empty.overview.layout.v1";
const ALL = [
  "financial-position",
  "money-movement",
  "recent-activity",
  "readme",
];

describe("Overview customization from the all-hidden prompt", () => {
  beforeEach(() => {
    // The shared setup stubs storage with no-op mocks; the layout hook needs
    // one that actually stores.
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    });
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, order: ALL, hidden: ALL }),
    );
    vi.mocked(useQuery).mockReturnValue({
      data: {
        getLedgerOverview: {
          netWorthData: [{ date: "2026-07-31", balance: { USD: 1250 } }],
          assetsData: [{ date: "2026-07-31", balance: { USD: 1250 } }],
          liabilitiesData: [],
          incomeIntervalData: [],
          incomeData: [],
          expensesIntervalData: [],
          expensesData: [],
          assetsHierarchyData: null,
          liabilitiesHierarchyData: null,
          incomeHierarchyData: null,
          expensesHierarchyData: null,
        },
      },
      loading: false,
      error: undefined,
    } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    access.canWrite = true;
  });

  it("keeps keyboard tab order after moving a module to either end", async () => {
    const user = userEvent.setup();
    render(<LedgerOverviewPage />);
    const prompt = screen.getByText(/All dashboard modules are hidden/);
    await user.click(
      within(prompt.parentElement!).getByRole("button", { name: "Customize" }),
    );
    const panel = within(await screen.findByRole("dialog"));
    const down = panel.getByRole("button", {
      name: "Move down: Financial position",
    });
    const up = panel.getByRole("button", {
      name: "Move up: Financial position",
    });
    const financialPosition = panel.getByRole("switch", {
      name: "Show module: Financial position",
    });

    down.focus();
    await user.keyboard("{Enter}{Enter}{Enter}");
    expect(panel.getAllByRole("switch").at(-1)).toBe(financialPosition);
    expect(down).toHaveFocus();
    expect(down).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Enter}");
    expect(panel.getAllByRole("switch").at(-1)).toBe(financialPosition);
    await user.tab();
    expect(panel.getByRole("button", { name: "Reset layout" })).toHaveFocus();

    up.focus();
    await user.keyboard("{Enter}{Enter}{Enter}");
    expect(panel.getAllByRole("switch")[0]).toBe(financialPosition);
    expect(up).toHaveFocus();
    expect(up).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Enter}");
    expect(panel.getAllByRole("switch")[0]).toBe(financialPosition);
    await user.tab();
    expect(down).toHaveFocus();
  });

  it("stays open while modules are restored, then returns focus to a visible trigger", async () => {
    const user = userEvent.setup();
    render(<LedgerOverviewPage />);

    const prompt = screen.getByText(/All dashboard modules are hidden/);
    const promptCard = prompt.parentElement as HTMLElement;
    await user.click(
      within(promptCard).getByRole("button", {
        name: "Customize",
      }),
    );
    const dialog = await screen.findByRole("dialog");

    // Pointer: the first module comes back and removes the prompt...
    await user.click(
      within(dialog).getByRole("switch", {
        name: "Show module: Financial position",
      }),
    );
    expect(screen.getByTestId("module-financial-position")).toBeInTheDocument();
    expect(screen.queryByText(/All dashboard modules are hidden/)).toBeNull();
    // ...and the panel is still here, focus inside it.
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Keyboard: a second module without reopening anything.
    const recent = within(dialog).getByRole("switch", {
      name: "Show module: Recent activity",
    });
    recent.focus();
    await user.keyboard(" ");
    expect(screen.getByTestId("module-recent-activity")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBe(dialog);

    // The prompt's button is gone, so focus lands on the header trigger.
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Customize" }),
    );
  });

  /**
   * A public reader has no header Customize trigger, so once restoring a
   * module removed the prompt's button, closing the panel left focus on the
   * body and the next Tab restarted at the skip link (w4/299).
   */
  describe("for a public reader", () => {
    beforeEach(() => {
      access.canWrite = false;
    });

    function renderInShell() {
      render(
        <main id="main-content" tabIndex={-1}>
          <LedgerOverviewPage />
        </main>,
      );
      return screen.getByRole("main");
    }

    async function openFromPrompt() {
      const promptCard = screen.getByText(/All dashboard modules are hidden/)
        .parentElement as HTMLElement;
      within(promptCard).getByRole("button", { name: "Customize" }).focus();
      await userEvent.keyboard("{Enter}");
      return screen.findByRole("dialog");
    }

    it("resumes in the dashboard after restoring a module", async () => {
      const main = renderInShell();
      expect(screen.queryByRole("button", { name: "Customize" })).toBe(
        within(main).getByRole("button", { name: "Customize" }),
      );
      const dialog = await openFromPrompt();
      within(dialog)
        .getByRole("switch", { name: "Show module: Financial position" })
        .focus();
      await userEvent.keyboard(" ");
      expect(
        screen.getByTestId("module-financial-position"),
      ).toBeInTheDocument();

      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      // There is no header trigger to fall back to: the dashboard's own title.
      expect(screen.queryByRole("button", { name: "Customize" })).toBeNull();
      const heading = screen.getByRole("heading", { level: 1 });
      expect(document.activeElement).toBe(heading);

      await userEvent.tab();
      expect(main.contains(document.activeElement)).toBe(true);
      expect(
        heading.compareDocumentPosition(document.activeElement!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("resumes in the dashboard after Reset layout", async () => {
      renderInShell();
      const dialog = await openFromPrompt();
      within(dialog)
        .getByRole("button", { name: /Reset layout/ })
        .focus();
      await userEvent.keyboard("{Enter}");
      expect(screen.queryByText(/All dashboard modules are hidden/)).toBeNull();

      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { level: 1 }),
      );
    });

    it("still returns to the prompt's button when nothing changed", async () => {
      const main = renderInShell();
      await openFromPrompt();
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(document.activeElement).toBe(
        within(main).getByRole("button", { name: "Customize" }),
      );
    });
  });
});
