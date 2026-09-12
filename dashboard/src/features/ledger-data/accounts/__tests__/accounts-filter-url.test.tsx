import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { accountsActionSearchSchema } from "@/common/lib/ledger-action-search";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params";
import LedgerAccountsPage from "../index";

const accounts = [
  {
    account: "Assets:Cash",
    openedAt: "2024-01-01",
    closedAt: null,
    entryCount: 4,
    balance: { USD: "10.00" },
  },
  {
    account: "Assets:Bank:Checking",
    openedAt: "2024-01-02",
    closedAt: null,
    entryCount: 7,
    balance: { USD: "250.00" },
  },
  {
    account: "Expenses:Cash-Advance-Fees",
    openedAt: "2024-01-03",
    closedAt: null,
    entryCount: 1,
    balance: null,
  },
  {
    account: "Income:Salary",
    openedAt: "2024-01-04",
    closedAt: null,
    entryCount: 2,
    balance: null,
  },
];

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: { getLedgerAccountDirectives: accounts },
    loading: false,
    error: undefined,
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerName: "My books",
    ledgerData: {
      options: {
        nameAssets: "Assets",
        nameLiabilities: "Liabilities",
        nameEquity: "Equity",
        nameIncome: "Income",
        nameExpenses: "Expenses",
      },
    },
  }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));

vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => vi.fn(),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("../open-account-dialog", () => ({
  OpenAccountDialog: ({ open }: { open: boolean }) => (
    <div data-testid="open-account-dialog" data-open={String(open)} />
  ),
}));
vi.mock("../delete-account-dialog", () => ({
  DeleteAccountDialog: () => null,
}));
vi.mock("../close-account-dialog", () => ({ CloseAccountDialog: () => null }));

function buildRouter(initialEntry: string) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    // Mirrors the real parent route: it owns the shared ledger filters and
    // drops every other key, so list-local params are the child's business.
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    component: () => <Outlet />,
  });
  const accountsRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/accounts",
    validateSearch: (search) => accountsActionSearchSchema.parse(search),
    component: LedgerAccountsPage,
  });
  const accountRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/account/$accountName",
    component: () => <div data-testid="account-page">account detail</div>,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      ledgerRoute.addChildren([accountsRoute, accountRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
}

async function mountAt(initialEntry: string) {
  cleanup();
  const router = buildRouter(initialEntry);
  await router.load();
  render(<RouterProvider router={router} />);
  await waitFor(() => {
    expect(screen.getByTestId("open-account-dialog")).toBeInTheDocument();
  });
  return router;
}

function searchBox() {
  return screen.getByRole("textbox", { name: "page.accounts.searchAccounts" });
}

/** The type chips share names with the account-prefix buttons in the rows. */
function typeChip(name: string) {
  return within(
    screen.getByRole("group", { name: "page.accounts.type" }),
  ).getByRole("button", { name });
}

function accountNames() {
  return screen
    .getAllByRole("button")
    .map((button) => button.getAttribute("aria-label"))
    .filter((label): label is string =>
      accounts.some((account) => account.account === label),
    );
}

afterEach(() => {
  cleanup();
});

describe("accounts list filters in the URL", () => {
  it("restores search and type after opening an account and pressing Back, then Forward", async () => {
    const user = userEvent.setup();
    const router = await mountAt(
      "/ledger/alice/books/accounts?search=cash&type=Assets",
    );

    expect(searchBox()).toHaveValue("cash");
    expect(typeChip("Assets")).toHaveAttribute("aria-pressed", "true");
    expect(accountNames()).toEqual(["Assets:Cash"]);

    await user.click(screen.getByRole("button", { name: "Assets:Cash" }));
    await waitFor(() => {
      expect(screen.getByTestId("account-page")).toBeInTheDocument();
    });

    await act(async () => {
      router.history.back();
    });

    await waitFor(() => {
      expect(searchBox()).toHaveValue("cash");
    });
    expect(accountNames()).toEqual(["Assets:Cash"]);
    expect(typeChip("Assets")).toHaveAttribute("aria-pressed", "true");

    await act(async () => {
      router.history.forward();
    });
    await waitFor(() => {
      expect(screen.getByTestId("account-page")).toBeInTheDocument();
    });
  });

  it("restores the filtered list from a reloaded URL", async () => {
    const router = await mountAt(
      "/ledger/alice/books/accounts?search=cash&type=Expenses",
    );
    const href = router.state.location.href;

    await mountAt(href);
    expect(searchBox()).toHaveValue("cash");
    expect(accountNames()).toEqual(["Expenses:Cash-Advance-Fees"]);
  });

  it("writes typed searches and type picks without stacking history entries", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/alice/books/accounts");
    const startLength = router.history.length;

    await user.type(searchBox(), "cash");
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ search: "cash" });
    });
    expect(accountNames()).toEqual([
      "Assets:Cash",
      "Expenses:Cash-Advance-Fees",
    ]);

    await user.click(typeChip("Income"));
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ type: "Income" });
    });
    expect(router.history.length).toBe(startLength);
  });

  it("clears both filter keys from the URL", async () => {
    const user = userEvent.setup();
    const router = await mountAt(
      "/ledger/alice/books/accounts?search=nothing-matches&type=Assets",
    );

    // Two controls carry this label: the input's inline clear, then the empty
    // state's "Clear" which drops every filter.
    const clearButtons = screen.getAllByRole("button", {
      name: "common.clearInput",
    });
    expect(clearButtons).toHaveLength(2);
    await user.click(clearButtons[1]);

    await waitFor(() => {
      expect(router.state.location.search).toEqual({});
    });
    expect(router.state.location.searchStr).toBe("");
    expect(searchBox()).toHaveValue("");
    expect(typeChip("page.accounts.allTypes")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("coerces hostile filter values instead of failing to render", async () => {
    const longQuery = "a".repeat(250);
    const router = await mountAt(
      `/ledger/alice/books/accounts?search=${longQuery}&type=Not%3AA%3AType`,
    );

    // Truncated, not rejected: the page still renders with a usable input, and
    // the unknown root name falls back to every type.
    expect(searchBox()).toHaveValue("a".repeat(100));
    expect(typeChip("page.accounts.allTypes")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(router.state.location.search).toMatchObject({ type: "Not:A:Type" });
    expect(accountNames()).toEqual([]);

    // Non-text values (arrays, objects, booleans) drop out entirely.
    await mountAt(
      `/ledger/alice/books/accounts?search=${encodeURIComponent('["x"]')}&type=${encodeURIComponent('{"bad":1}')}`,
    );
    expect(searchBox()).toHaveValue("");
    expect(typeChip("page.accounts.allTypes")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(accountNames()).toHaveLength(accounts.length);
  });
});
