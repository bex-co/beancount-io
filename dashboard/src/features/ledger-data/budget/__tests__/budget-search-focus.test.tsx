import {
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
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GetLedgerIntervalTotalsDocument,
  GetLedgerJournalDocument,
} from "@/graphql/definitions";
import { en } from "@/i18n/locales";
import LedgerBudgetPage from "../index";
import type { BudgetEntry } from "../types";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@apollo/client/react", () => ({ useQuery: query }));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    primaryCurrency: "USD",
    ledgerData: { options: { renderCommas: true } },
  }),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: false }),
}));
// Canvas rendering and closed mutation dialogs are outside this search journey.
// The page, filters, cards, history tables, and period disclosures remain real.
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: () => null,
}));
vi.mock("../add-budget-dialog", () => ({ AddBudgetDialog: () => null }));
vi.mock("../delete-budget-dialog", () => ({ DeleteBudgetDialog: () => null }));

const entries: BudgetEntry[] = [
  "Dining",
  "Rent",
  "Groceries",
  "Utilities",
  "Transport",
  "Entertainment",
  "Travel",
].map((category) => ({
  date: "2025-01-01",
  entry_hash: `synthetic-budget-${category}`,
  directive_type: "custom",
  type: "budget",
  values: [
    `Expenses:${category}`,
    category === "Travel" ? "yearly" : "monthly",
    { number: "200", currency: "USD" },
  ],
}));

const intervalTotals = [
  { date: "2025-01-31", balance: { USD: "100" }, accountBalances: {} },
];
let i18n = createInstance();

beforeEach(async () => {
  query.mockReset();
  query.mockImplementation((document: unknown) => {
    if (document === GetLedgerJournalDocument) {
      return { data: { getLedgerJournal: { data: entries } }, loading: false };
    }
    if (document === GetLedgerIntervalTotalsDocument) {
      return {
        data: { getLedgerIntervalTotals: intervalTotals },
        loading: false,
      };
    }
    throw new Error("Unexpected budget query");
  });
  i18n = createInstance();
  await i18n.init({
    lng: "en",
    fallbackLng: "en",
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  });
});

afterEach(() => {
  cleanup();
});

async function mountPage() {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    component: () => <Outlet />,
  });
  const budgetRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/budget",
    component: LedgerBudgetPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([ledgerRoute.addChildren([budgetRoute])]),
    history: createMemoryHistory({
      initialEntries: ["/ledger/alice/books/budget"],
    }),
  });
  await router.load();
  render(
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
  await screen.findByRole("textbox", { name: "Search budgets by account..." });
}

function searchBox() {
  return screen.getByRole("textbox", { name: "Search budgets by account..." });
}

function searchClear() {
  return within(searchBox().parentElement!).getByRole("button", {
    name: "Clear",
  });
}

function filterButton(group: string, name: string) {
  return within(screen.getByRole("group", { name: group })).getByRole(
    "button",
    {
      name,
      exact: true,
    },
  );
}

function expectHistories(accounts: string[]) {
  // Each card also contains a period-data table. Identify the account/currency
  // history by its exact accessible name instead of assuming one table/card.
  expect(screen.queryAllByRole("table", { name: / USD$/ })).toHaveLength(
    accounts.length,
  );
  for (const account of accounts) {
    expect(
      screen.getByRole("table", { name: `${account} USD`, exact: true }),
    ).toBeInTheDocument();
  }
}

const monthlyAccounts = entries
  .filter((entry) => entry.values[1] === "monthly")
  .map((entry) => entry.values[0] as string);

function expectRetainedFilters() {
  expect(filterButton("Interval", "Monthly")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(filterButton("Time span", "Last year")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(query).toHaveBeenCalledWith(
    GetLedgerIntervalTotalsDocument,
    expect.objectContaining({
      variables: expect.objectContaining({
        ledgerId: "alice/books",
        accountName: "Expenses:Rent",
        interval: "monthly",
        conversion: "units",
        time: "year-1",
      }),
    }),
  );
}

describe("Budget search Clear focus on the owning page", () => {
  it.each(["Dining", "no-matching-budget"])(
    "supports Tab/Enter clearing and immediate next search (first=%s)",
    async (firstSearch) => {
      const user = userEvent.setup();
      await mountPage();
      expectHistories(entries.map((entry) => entry.values[0] as string));
      await user.click(filterButton("Interval", "Monthly"));
      await user.click(filterButton("Time span", "Last year"));
      const input = searchBox();
      await user.type(input, firstSearch);
      expectHistories(firstSearch === "Dining" ? ["Expenses:Dining"] : []);
      const clear = searchClear();
      await user.tab();
      expect(clear).toHaveFocus();
      await user.keyboard("{Enter}");

      expect(searchBox()).toBe(input);
      expect(input).toHaveValue("");
      expect(input).toHaveFocus();
      expect(clear).not.toBeInTheDocument();
      expectHistories(monthlyAccounts);
      expectRetainedFilters();
      // Actual keys, without a refocus, must edit the now-empty input.
      await user.keyboard("Rent");
      expect(input).toHaveValue("Rent");
      expect(input).toHaveFocus();
      expectHistories(["Expenses:Rent"]);
      expectRetainedFilters();
      expect(
        screen.queryByRole("button", { name: "Add Budget" }),
      ).not.toBeInTheDocument();
    },
  );

  it("returns pointer Clear to input after trimmed/case-insensitive matching", async () => {
    const user = userEvent.setup();
    await mountPage();
    await user.click(filterButton("Interval", "Monthly"));
    await user.click(filterButton("Time span", "Last year"));
    const input = searchBox();
    await user.type(input, "  DINING  ");
    expectHistories(["Expenses:Dining"]);
    await user.click(searchClear());
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expectHistories(monthlyAccounts);
    expectRetainedFilters();
    await user.keyboard("Rent");
    expect(input).toHaveValue("Rent");
    expectHistories(["Expenses:Rent"]);
  });

  it("keeps the separate no-match reset clearing interval and search while retaining time", async () => {
    const user = userEvent.setup();
    await mountPage();
    await user.click(filterButton("Interval", "Monthly"));
    await user.click(filterButton("Time span", "Last year"));
    await user.type(searchBox(), "no-matching-budget");
    expectHistories([]);
    expect(screen.getByText(en["common.noResultsFound"])).toBeInTheDocument();
    const clearButtons = screen.getAllByRole("button", { name: "Clear" });
    expect(clearButtons).toHaveLength(2);
    await user.click(clearButtons.find((button) => button !== searchClear())!);
    expect(searchBox()).toHaveValue("");
    expect(filterButton("Interval", "All")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(filterButton("Time span", "Last year")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expectHistories(entries.map((entry) => entry.values[0] as string));
    await waitFor(() => {
      expect(query).toHaveBeenCalledWith(
        GetLedgerIntervalTotalsDocument,
        expect.objectContaining({
          variables: expect.objectContaining({
            accountName: "Expenses:Travel",
            interval: "yearly",
            time: "year-1",
          }),
        }),
      );
    });
  });
});
