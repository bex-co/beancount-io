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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { en, de } from "@/i18n/locales";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params";
import LedgerHoldingsPage from "../index";
import { holdingsSearchSchema } from "../search";
import {
  holdingsStatementByCurrency,
  holdingsStatementByCostCurrency,
} from "../holdings-statement";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));
vi.mock("@apollo/client/react", () => ({ useQuery: mockQuery }));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "My books" }),
}));

vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

const TAB_LABELS = {
  holdings: "Holdings",
  "by-account": "Holdings by Account",
  "by-currency": "Holdings by Currency",
  "by-cost-currency": "Holdings by Cost Currency",
} as const;

const TABLE_DATA = {
  resultType: "table",
  table: {
    types: [{ name: "account" }, { name: "units" }, { name: "market_value" }],
    rows: [["Assets:Brokerage", { ACME: "0.004" }, { USD: "123.4500" }]],
  },
};

let i18n = createInstance();

beforeEach(async () => {
  mockQuery.mockImplementation(
    (_, { variables }: { variables: { query: string } }) => ({
      loading: false,
      error: undefined,
      data: {
        queryShell:
          variables.query === holdingsStatementByCurrency ||
          variables.query === holdingsStatementByCostCurrency
            ? {
                ...TABLE_DATA,
                table: {
                  types: [{ name: "units" }, { name: "book_value" }],
                  rows: [[{ ACME: "0.004" }, { USD: "123.4500" }]],
                },
              }
            : TABLE_DATA,
      },
    }),
  );
  i18n = createInstance();
  await i18n.init({
    lng: "en",
    fallbackLng: "en",
    resources: { en: { translation: en }, de: { translation: de } },
    interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  });
});

function buildRouter(initialEntry: string) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    component: () => <Outlet />,
  });
  const holdingsRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/holdings",
    validateSearch: (search) => holdingsSearchSchema.parse(search),
    component: LedgerHoldingsPage,
  });
  const accountRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/account/$accountName",
    component: () => <div data-testid="account-page">account detail</div>,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      ledgerRoute.addChildren([holdingsRoute, accountRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
}

async function mountAt(initialEntry: string) {
  cleanup();
  const router = buildRouter(initialEntry);
  await router.load();
  render(
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
  await waitFor(() => {
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });
  return router;
}

function activeTab() {
  return screen
    .getAllByRole("tab")
    .find((tab) => tab.getAttribute("aria-selected") === "true")?.textContent;
}

/** Drills into an account the way a holdings row link would. */
async function openAccount(router: ReturnType<typeof buildRouter>) {
  await act(async () => {
    await router.navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
      params: {
        ledgerOwner: "alice",
        ledgerName: "books",
        accountName: "Assets:Brokerage",
      },
    });
  });
  await waitFor(() => {
    expect(screen.getByTestId("account-page")).toBeInTheDocument();
  });
}

afterEach(() => {
  cleanup();
});

describe("holdings grouping in the URL", () => {
  it("defaults to the holdings grouping", async () => {
    await mountAt("/ledger/alice/books/holdings");
    expect(activeTab()).toBe(TAB_LABELS.holdings);
    expect(
      screen.getByRole("table", { name: TAB_LABELS.holdings }),
    ).toBeInTheDocument();
  });

  it("restores the selected grouping after an account drill-down and Back, then Forward", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/alice/books/holdings");

    await user.click(
      screen.getByRole("tab", { name: TAB_LABELS["by-currency"] }),
    );
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({
        view: "by-currency",
      });
    });
    expect(activeTab()).toBe(TAB_LABELS["by-currency"]);
    expect(
      screen.getByRole("table", { name: TAB_LABELS["by-currency"] }),
    ).toBeInTheDocument();

    await openAccount(router);

    await act(async () => {
      router.history.back();
    });
    await waitFor(() => {
      expect(
        screen.getByRole("table", { name: TAB_LABELS["by-currency"] }),
      ).toBeInTheDocument();
    });
    expect(activeTab()).toBe(TAB_LABELS["by-currency"]);

    await act(async () => {
      router.history.forward();
    });
    await waitFor(() => {
      expect(screen.getByTestId("account-page")).toBeInTheDocument();
    });
  });

  it("restores every grouping from a reloaded URL", async () => {
    for (const [view, label] of Object.entries(TAB_LABELS)) {
      await mountAt(`/ledger/alice/books/holdings?view=${view}`);
      expect(activeTab()).toBe(label);
      const table = screen.getByRole("table", { name: label });
      expect(table.tagName).toBe("TABLE");
      expect(within(table).getAllByRole("row")).toHaveLength(2);
      expect(within(table).getAllByRole("columnheader").length).toBeGreaterThan(
        0,
      );
      expect(within(table).getAllByRole("cell").length).toBeGreaterThan(0);
    }
  });

  it("switches groupings without stacking history entries, and a rerender adds none", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/alice/books/holdings");
    const startLength = router.history.length;

    await user.click(
      screen.getByRole("tab", { name: TAB_LABELS["by-account"] }),
    );
    await waitFor(() => {
      expect(activeTab()).toBe(TAB_LABELS["by-account"]);
      expect(
        screen.getByRole("table", { name: TAB_LABELS["by-account"] }),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole("tab", { name: TAB_LABELS["by-cost-currency"] }),
    );
    await waitFor(() => {
      expect(activeTab()).toBe(TAB_LABELS["by-cost-currency"]);
      expect(
        screen.getByRole("table", { name: TAB_LABELS["by-cost-currency"] }),
      ).toBeInTheDocument();
    });
    expect(router.history.length).toBe(startLength);

    // Re-selecting the active grouping is a no-op, not a navigation.
    const locationKey = router.state.location.state.key;
    await user.click(
      screen.getByRole("tab", { name: TAB_LABELS["by-cost-currency"] }),
    );
    expect(router.history.length).toBe(startLength);
    expect(router.state.location.state.key).toBe(locationKey);
  });

  it("names the active table after grouping changes through the narrow View selector", async () => {
    const user = userEvent.setup();
    await mountAt("/ledger/alice/books/holdings");

    const selector = screen.getByRole("combobox", { name: "View" });
    selector.focus();
    await user.keyboard("{ArrowDown}");
    await user.click(
      await screen.findByRole("option", { name: TAB_LABELS["by-currency"] }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("table", { name: TAB_LABELS["by-currency"] }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("table", { name: TAB_LABELS.holdings }),
    ).not.toBeInTheDocument();
  });

  it("updates each mounted grouping's table name when the language changes", async () => {
    const labels = [
      ["holdings", "page.holdings.holdings"],
      ["by-account", "page.holdings.holdingsByAccount"],
      ["by-currency", "page.holdings.holdingsByCurrency"],
      ["by-cost-currency", "page.holdings.holdingsByCostCurrency"],
    ] as const;
    for (const [view, key] of labels) {
      await act(() => i18n.changeLanguage("en"));
      await mountAt(`/ledger/alice/books/holdings?view=${view}`);
      expect(screen.getByRole("table", { name: en[key] })).toBeInTheDocument();

      await act(() => i18n.changeLanguage("de"));

      expect(screen.getByRole("table", { name: de[key] })).toBeInTheDocument();
      expect(
        screen.queryByRole("table", { name: en[key] }),
      ).not.toBeInTheDocument();
    }
  });

  it("preserves native row and cell semantics and account navigation in the named table", async () => {
    const user = userEvent.setup();
    const router = await mountAt(
      "/ledger/alice/books/holdings?view=by-account",
    );
    const table = screen.getByRole("table", { name: TAB_LABELS["by-account"] });
    const rows = within(table).getAllByRole("row");
    expect(rows[1].tagName).toBe("TR");
    expect(rows[1]).not.toHaveAttribute("role");
    expect(rows[1]).not.toHaveAttribute("tabindex");
    expect(within(rows[1]).getAllByRole("cell")).toHaveLength(3);
    expect(within(table).getByText("0.004")).toBeInTheDocument();
    expect(within(table).getByText("123.4500")).toBeInTheDocument();
    const accountButton = within(table).getByRole("button", {
      name: "Assets:Brokerage",
    });
    accountButton.focus();
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(screen.getByTestId("account-page")).toBeInTheDocument(),
    );
    expect(router.state.location.pathname).toBe(
      "/ledger/alice/books/account/Assets%3ABrokerage",
    );
  });

  it.each(["loading", "error", "empty"])(
    "keeps the owning page table-free for %s results",
    async (state) => {
      mockQuery.mockReturnValue({
        loading: state === "loading",
        error: state === "error" ? new Error("Query failed") : undefined,
        data: {
          queryShell:
            state === "empty"
              ? { ...TABLE_DATA, table: { ...TABLE_DATA.table, rows: [] } }
              : TABLE_DATA,
        },
      });
      await mountAt("/ledger/alice/books/holdings?view=by-account");

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Export CSV" }),
      ).not.toBeInTheDocument();
      if (state === "error")
        expect(screen.getByRole("alert")).toBeInTheDocument();
      if (state === "empty")
        expect(
          screen.getByText("No data returned from query"),
        ).toBeInTheDocument();
    },
  );

  it("coerces an unknown or malformed grouping to the default", async () => {
    await mountAt("/ledger/alice/books/holdings?view=by-sunshine");
    expect(activeTab()).toBe(TAB_LABELS.holdings);

    await mountAt(
      `/ledger/alice/books/holdings?view=${encodeURIComponent('["by-account"]')}`,
    );
    expect(activeTab()).toBe(TAB_LABELS.holdings);

    await mountAt("/ledger/alice/books/holdings?view=");
    expect(activeTab()).toBe(TAB_LABELS.holdings);
  });
});
