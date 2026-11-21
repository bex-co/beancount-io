import { cleanup, render, screen, within } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";
import { DirectiveType, type JournalBalance } from "@/common/types/journal";
import {
  LedgerProviderContext,
  type LedgerProviderContextType,
} from "@/common/providers/ledger-provider/context";
import { JournalTable } from "../journal-table";

const ledger = {
  ledgerData: { options: { renderCommas: true } },
} as unknown as LedgerProviderContextType;

type Layout = "lines" | "days";

afterEach(cleanup);

const assertion: JournalBalance = {
  directive_type: DirectiveType.BALANCE,
  entry_hash: "synthetic-balance-assertion",
  date: "2026-08-29",
  account: "Assets:Cash",
  amount: { number: "49.75", currency: "USD" },
  tolerance: null,
  diff_amount: null,
};

async function renderRow(
  layout: Layout,
  directive: JournalBalance,
  isAccountJournal: boolean,
) {
  const root = createRootRoute({ component: () => <Outlet /> });
  const journal = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => (
      <LedgerProviderContext.Provider value={ledger}>
        <JournalTable
          layout={layout}
          money={{
            primaryCurrency: "USD",
            incomeRoot: "Income",
            expensesRoot: "Expenses",
            accountFilter: isAccountJournal ? "Assets:Cash" : "",
          }}
          register={
            isAccountJournal
              ? { account: "Assets:Cash", withChildren: true }
              : undefined
          }
          data={[{ directive, change: {}, balance: {} }]}
          showMetadata={false}
          showPostings={false}
          ledgerOwner="owner"
          ledgerName="ledger"
          onEntryClick={() => {}}
        />
      </LedgerProviderContext.Provider>
    ),
  });
  const router = createRouter({
    routeTree: root.addChildren([journal]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
    isServer: false,
  });
  await router.load();
  render(<RouterProvider router={router} />);
  await screen.findByRole("table");
  return screen
    .getByRole("button", { name: /^Open entry 2026-08-29 Balance/ })
    .closest("tr")!;
}

/** The isolated run of sign, figure and unit that reads `text` whole. */
function amount(row: HTMLElement, text: string) {
  const runs = within(row).getAllByText(
    (_, element) => element?.tagName === "BDI" && element.textContent === text,
  );
  for (const run of runs) expect(run).toHaveAttribute("dir", "ltr");
  return runs;
}

describe.each(["lines", "days"] as const)(
  "Balance rows show the asserted amount (w3/556) (%s)",
  (layout) => {
    it.each([
      ["the journal", false],
      ["the account journal", true],
    ])(
      "reads Assets:Cash … 49.75 USD in %s",
      async (_name, isAccountJournal) => {
        const row = await renderRow(layout, assertion, isAccountJournal);

        expect(within(row).getAllByText("Assets:Cash").length).toBeGreaterThan(
          0,
        );
        // Isolated so RTL layouts keep the number and currency in order.
        expect(amount(row, "49.75 USD").length).toBeGreaterThan(0);
      },
    );

    it("names the entry by its account and amount, not as a price", async () => {
      const row = await renderRow(layout, assertion, false);

      expect(
        within(row).getByRole("button", {
          name: "Open entry 2026-08-29 Balance Assets:Cash 49.75 USD (row 1)",
        }),
      ).toBeInTheDocument();
    });

    it("shows an explicit tolerance with the amount", async () => {
      const row = await renderRow(
        layout,
        { ...assertion, tolerance: "0.01" },
        false,
      );

      expect(amount(row, "49.75 ~ 0.01 USD").length).toBeGreaterThan(0);
    });

    it("still renders the account when an older service omits the amount", async () => {
      const { amount: _omitted, ...legacy } = assertion;
      const row = await renderRow(layout, legacy, false);

      expect(within(row).getAllByText("Assets:Cash").length).toBeGreaterThan(0);
      expect(within(row).queryByText(/USD/)).not.toBeInTheDocument();
    });
  },
);
