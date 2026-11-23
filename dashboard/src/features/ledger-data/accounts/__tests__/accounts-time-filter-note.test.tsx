import { MockedProvider } from "@apollo/client/testing/react";
import { act, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { accountsActionSearchSchema } from "@/common/lib/ledger-action-search";
import { GetLedgerAccountDirectivesDocument } from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import LedgerAccountsPage from "../index";
import { LedgerSearchParamsContext } from "@/common/providers/ledger-search-params-provider";
import en from "../locales/en";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerName: "books",
    ledgerData: {
      permissions: null,
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
vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => false,
}));
// Account editing dialogs are outside this read-only table journey.
vi.mock("../open-account-dialog", () => ({ OpenAccountDialog: () => null }));
vi.mock("../close-account-dialog", () => ({ CloseAccountDialog: () => null }));
vi.mock("../delete-account-dialog", () => ({
  DeleteAccountDialog: () => null,
}));

const accounts = [
  {
    __typename: "LedgerAccountItem" as const,
    account: "Assets:Bank:Checking",
    openedAt: "2024-01-01",
    closedAt: null,
    balance: { USD: "250.00" },
    entryCount: 7,
    referenceCount: 7,
    entryHash: "checking-open",
    closeEntryHash: null,
  },
  {
    __typename: "LedgerAccountItem" as const,
    account: "Expenses:Fees",
    openedAt: "2024-01-02",
    closedAt: "2024-12-31",
    balance: null,
    entryCount: 2,
    referenceCount: 2,
    entryHash: "fees-open",
    closeEntryHash: "fees-close",
  },
];

async function setup(time: string | undefined) {
  const localization = createLocalization();
  await localization.changeLanguage("en");
  const root = createRootRoute({ component: () => <Outlet /> });
  const accountsRoute = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/accounts",
    validateSearch: (search) => accountsActionSearchSchema.parse(search),
    component: LedgerAccountsPage,
  });
  const router = createRouter({
    routeTree: root.addChildren([accountsRoute]),
    history: createMemoryHistory({
      initialEntries: ["/ledger/alice/books/accounts"],
    }),
  });
  await router.load();
  render(
    <LocalizationProvider localization={localization}>
      <LedgerSearchParamsContext.Provider
        value={{
          searchParams: { time, account: "", filter: "" },
          setSearchParams: vi.fn(),
        }}
      >
        <MockedProvider
          mocks={[
            {
              request: {
                query: GetLedgerAccountDirectivesDocument,
                variables: { ledgerId: "alice/books" },
              },
              result: { data: { getLedgerAccountDirectives: accounts } },
              maxUsageCount: 2,
            },
          ]}
        >
          <RouterProvider router={router} />
        </MockedProvider>
      </LedgerSearchParamsContext.Provider>
    </LocalizationProvider>,
  );
  await act(async () => {
    await router.load();
  });
}

describe("Accounts directory under a carried-over Time filter (w3/568)", () => {
  it("says its balances are current and the period does not apply", async () => {
    await setup("2026-07");

    expect(await screen.findByRole("note")).toHaveTextContent(
      en["page.accounts.timeFilterNotApplied"].message,
    );
  });

  it("says nothing without a Time filter", async () => {
    await setup(undefined);

    await screen.findByRole("heading", {
      name: en["page.accounts.accounts"].message,
    });
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
