import { MockedProvider } from "@apollo/client/testing/react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
import type { SupportedLanguage } from "@/i18n/config";
import LedgerAccountsPage from "../index";
import en from "../locales/en";
import fa from "../locales/fa";

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
    entryHash: "fees-open",
    closeEntryHash: "fees-close",
  },
];

async function setup(language: SupportedLanguage, loading: boolean) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const root = createRootRoute({ component: () => <Outlet /> });
  const accountsRoute = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/accounts",
    validateSearch: (search) => accountsActionSearchSchema.parse(search),
    component: LedgerAccountsPage,
  });
  const accountRoute = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
    component: () => <h1>Account details</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([accountsRoute, accountRoute]),
    history: createMemoryHistory({
      initialEntries: ["/ledger/alice/books/accounts"],
    }),
  });
  await router.load();
  const view = render(
    <LocalizationProvider localization={localization}>
      <MockedProvider
        mocks={[
          {
            request: {
              query: GetLedgerAccountDirectivesDocument,
              variables: { ledgerId: "alice/books" },
            },
            result: { data: { getLedgerAccountDirectives: accounts } },
            delay: loading ? Infinity : 0,
            maxUsageCount: 2,
          },
        ]}
      >
        <RouterProvider router={router} />
      </MockedProvider>
    </LocalizationProvider>,
  );
  await act(async () => {
    await router.load();
  });
  return { ...view, router, user: userEvent.setup() };
}

describe("Accounts table identity", () => {
  it.each([
    ["en", en],
    ["fa", fa],
  ] as const)(
    "labels the %s loading table while keeping its skeleton outside the accessibility tree",
    async (language, labels) => {
      const { container } = await setup(language, true);
      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-busy", "true");
      const table = container.querySelector("table");
      expect(table).toHaveAttribute(
        "aria-label",
        labels["page.accounts.accounts"].message,
      );
      expect(table?.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(status).toContainElement(table);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(table?.querySelectorAll("thead th")).toHaveLength(7);
      expect(table?.querySelectorAll("tbody tr")).toHaveLength(8);
    },
  );

  it.each([
    ["en", en],
    ["fa", fa],
  ] as const)(
    "names the populated %s native table and retains headers, balances and keyboard account navigation",
    async (language, labels) => {
      const { router, user } = await setup(language, false);
      const name = labels["page.accounts.accounts"].message;
      const table = await screen.findByRole("table", { name });
      expect(table.tagName).toBe("TABLE");
      expect(within(table).getAllByRole("columnheader")).toHaveLength(7);
      for (const key of [
        "account",
        "status",
        "openDate",
        "closeDate",
        "entries",
        "balance",
      ]) {
        expect(
          within(table).getByRole("columnheader", {
            name: labels[`page.accounts.${key}`].message,
          }),
        ).toBeInTheDocument();
      }
      expect(within(table).getAllByRole("row")).toHaveLength(3);
      expect(within(table).getAllByRole("cell")).toHaveLength(14);
      expect(within(table).getByText("250.00 USD")).toBeInTheDocument();
      expect(
        within(table).getByText(labels["page.accounts.closed"].message),
      ).toBeInTheDocument();
      expect(
        within(table).getByText(
          labels["page.accounts.balanceNotComputed"].message,
        ),
      ).toBeInTheDocument();
      const account = within(table).getByRole("button", {
        name: "Assets:Bank:Checking",
      });
      act(() => account.focus());
      await user.keyboard("{Enter}");
      await screen.findByRole("heading", { name: "Account details" });
      expect(decodeURIComponent(router.state.location.pathname)).toBe(
        "/ledger/alice/books/account/Assets:Bank:Checking",
      );
      await act(async () => {
        router.history.back();
        await router.load();
      });
      await waitFor(() => {
        expect(screen.getByRole("table", { name })).toBeInTheDocument();
      });
    },
  );
});
