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
vi.mock("@apollo/client/react", () => ({
  useQuery: query,
  useApolloClient: () => ({ query: vi.fn() }),
}));
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
      return {
        data: { getLedgerJournal: { total: entries.length, data: entries } },
        loading: false,
      };
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

function filterButton(group: string, name: string) {
  return within(screen.getByRole("group", { name: group })).getByRole(
    "button",
    { name, exact: true },
  );
}

/** The range the cards last asked their interval totals for. */
const requestedTime = () =>
  query.mock.calls
    .filter(([document]) => document === GetLedgerIntervalTotalsDocument)
    .map(
      ([, options]) =>
        (options as { variables: { time?: string } }).variables.time,
    )
    .at(-1);

/** Last 12 months ends on the day it is chosen (w4/980). */
describe("Budget's Last 12 months range", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 21, 12));
  });
  afterEach(() => vi.useRealTimers());

  it("ends on the selection day after the page was opened the day before", async () => {
    const user = userEvent.setup();
    await mountPage();
    vi.setSystemTime(new Date(2026, 9, 22, 12));

    await user.click(filterButton("Time span", "Last 12 months"));
    await waitFor(() =>
      expect(requestedTime()).toBe("2025-10-22 - 2026-10-22"),
    );
  });

  it("moves to the new day when chosen again after switching away", async () => {
    const user = userEvent.setup();
    await mountPage();
    await user.click(filterButton("Time span", "Last 12 months"));
    await waitFor(() =>
      expect(requestedTime()).toBe("2025-10-21 - 2026-10-21"),
    );

    await user.click(filterButton("Time span", "All time"));
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    await user.click(filterButton("Time span", "Last 12 months"));
    await waitFor(() =>
      expect(requestedTime()).toBe("2025-10-23 - 2026-10-23"),
    );
  });

  it("keeps the other spans' fixed filters", async () => {
    const user = userEvent.setup();
    await mountPage();
    await user.click(filterButton("Time span", "Last year"));
    await waitFor(() => expect(requestedTime()).toBe("year-1"));
    await user.click(filterButton("Time span", "This year"));
    await waitFor(() => expect(requestedTime()).toBe("year"));
  });
});
