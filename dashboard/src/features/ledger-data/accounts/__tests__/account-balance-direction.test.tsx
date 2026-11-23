import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
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
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { accountsActionSearchSchema } from "@/common/lib/ledger-action-search";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import LedgerAccountsPage from "../index";
import { formatSourceDecimal } from "@/common/lib/format/format-number";
import { parseDecimalNumber } from "@/common/lib/beancount/decimal-number";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerName: "دفتر نمونه",
    ledgerData: {
      permissions: { pull: true, push: true },
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
  useIsAuthenticated: () => true,
}));
vi.mock("@/common/hooks/use-auth-status", () => ({
  useAuthStatus: () => "signed-in",
}));
// Mutating account dialogs are outside this read-only balance journey.
vi.mock("../open-account-dialog", () => ({ OpenAccountDialog: () => null }));
vi.mock("../close-account-dialog", () => ({ CloseAccountDialog: () => null }));
vi.mock("../delete-account-dialog", () => ({
  DeleteAccountDialog: () => null,
}));

const accountName = "Assets:بانک:جاری";
/**
 * Each balance as the reader's language writes it: grouped and in its digits,
 * with every source digit kept (w2/119). The subject here is isolation; the
 * formatting itself is pinned in `ledger-amount.test.tsx`.
 */
const amountsIn = (language: string) =>
  (
    [
      ["-33.71", "USD"],
      ["+100.2500", "EUR"],
      ["0.0000000000000000000123456789", "ETH"],
      ["9007199254740993.0000000001", "BTC"],
    ] as const
  ).map(
    ([number, currency]) =>
      `${formatSourceDecimal(parseDecimalNumber(number)!, true, language)} ${currency}`,
  );
const accounts = [
  {
    __typename: "LedgerAccountItem",
    account: accountName,
    balance: {
      USD: "-33.71",
      EUR: "+100.2500",
      ETH: "0.0000000000000000000123456789",
      BTC: "9007199254740993.0000000001",
    },
  },
  { __typename: "LedgerAccountItem", account: "Assets:Empty", balance: {} },
  {
    __typename: "LedgerAccountItem",
    account: "Assets:Zero",
    balance: { USD: "0.00" },
  },
  { __typename: "LedgerAccountItem", account: "Income:Salary", balance: null },
].map((account, index) => ({
  ...account,
  openedAt: "2025-01-01",
  closedAt: null,
  entryCount: 7,
  referenceCount: 7,
  entryHash: `open-${index}`,
  closeEntryHash: null,
}));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

async function setup(language: "en" | "fa") {
  const requests: Array<{ name: string; variables: Record<string, unknown> }> =
    [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            name: operation.operationName,
            variables: operation.variables,
          });
          if (operation.operationName !== "GetLedgerAccountDirectives") {
            observer.error(
              new Error(`Unexpected operation: ${operation.operationName}`),
            );
            return;
          }
          observer.next({ data: { getLedgerAccountDirectives: accounts } });
          observer.complete();
        }),
    ),
  });
  clients.push(client);
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
    component: () => <h1>Account detail</h1>,
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
      <ApolloProvider client={client}>
        <div dir={localization.i18n.dir()} data-testid="reading-context">
          <RouterProvider router={router} />
        </div>
      </ApolloProvider>
    </LocalizationProvider>,
  );
  const table = await screen.findByRole("table", {
    name: language === "fa" ? "حساب‌ها" : "Accounts",
  });
  const account = within(table).getByRole("link", { name: accountName });
  const row = account.closest("tr")!;
  return { ...view, router, table, account, row, requests };
}

describe("account balance reading direction", () => {
  it.each(["fa", "en"] as const)(
    "isolates each complete %s balance and keeps the account path root first",
    async (language) => {
      const { table, account, row } = await setup(language);
      const context = screen.getByTestId("reading-context");
      expect(context).toHaveAttribute("dir", language === "fa" ? "rtl" : "ltr");
      for (const text of amountsIn(language)) {
        // Narrow, the balance sits under the name; wide, in its column.
        // Each width shows one of the two copies.
        const copies = within(row).getAllByText(text);
        expect(copies).toHaveLength(2);
        expect(copies[0].closest(".\\@lg\\:hidden")).not.toBeNull();
        expect(copies[1].closest(".\\@lg\\:block")).not.toBeNull();
        for (const amount of copies) {
          expect(amount.textContent).toBe(text);
          const isolated = amount.closest('bdi[dir="ltr"]');
          expect(isolated).not.toBeNull();
          expect(isolated?.textContent).toBe(text);
          expect(isolated).not.toContainElement(account);
        }
      }
      // The account path and the amounts keep their own direction.
      expect(account.parentElement).toHaveAttribute("dir", "ltr");
      expect(row.closest("[dir]")).toBe(context);
      expect(row).not.toHaveAttribute("dir");
      expect(table).not.toHaveAttribute("dir");
      // An open account goes unmarked; only a closed one says so.
      expect(
        within(row).queryByText(language === "fa" ? "باز" : "Open"),
      ).not.toBeInTheDocument();
    },
  );

  it.each(["fa", "en"] as const)(
    "preserves %s native rows, unknown/empty balances, and keyboard account navigation",
    async (language) => {
      const { router, table, account, row, requests } = await setup(language);
      // The column headings, a heading per type (Assets, Income), 4 accounts.
      expect(within(table).getAllByRole("row")).toHaveLength(7);
      expect(within(row).getAllByRole("cell")).toHaveLength(5);
      expect(row).not.toHaveAttribute("role");
      expect(row).not.toHaveAttribute("tabindex");
      expect(within(row).getAllByRole("cell")[3].textContent).toBe(
        amountsIn(language).join(""),
      );
      const emptyRow = within(table)
        .getByRole("link", { name: "Assets:Empty" })
        .closest("tr")!;
      expect(within(emptyRow).getAllByRole("cell")[3].textContent).toBe("0");
      expect(
        within(table).getAllByText(
          language === "fa" ? "محاسبه نشده" : "Not computed",
        ),
      ).toHaveLength(1);
      act(() => account.focus());
      await userEvent.setup().keyboard("{Enter}");
      await screen.findByRole("heading", { name: "Account detail" });
      await waitFor(() =>
        expect(router.state.matches.at(-1)?.params).toMatchObject({
          ledgerOwner: "alice",
          ledgerName: "books",
          accountName,
        }),
      );
      expect(requests).toEqual([
        {
          name: "GetLedgerAccountDirectives",
          variables: { ledgerId: "alice/books" },
        },
      ]);
    },
  );
});

describe("Accounts balances at every width", () => {
  it.each(["en", "fa"] as const)(
    "keeps every %s balance under the name when narrow and in its own column when wide",
    async (language) => {
      const { table, row } = await setup(language);
      expect(table.closest(".\\@container")).not.toBeNull();
      const [, postings, opened, balance] = within(row).getAllByRole("cell");
      // Narrow, the postings and open-date cells keep their place in the
      // grid at no width (a hidden cell would pull the balance into its
      // column); only their contents hide.
      for (const cell of [postings, opened, balance]) {
        expect(cell).not.toHaveClass("hidden");
      }
      expect(balance.textContent).toBe(amountsIn(language).join(""));
      const [name] = within(row).getAllByRole("cell");
      // The narrow copy: at the end of the name cell's first line (the
      // parent path under the name is narrow-only too).
      const narrow = [
        ...name.querySelectorAll<HTMLElement>(".\\@lg\\:hidden"),
      ].find((element) => element.classList.contains("text-end"));
      expect(narrow?.textContent).toBe(amountsIn(language).join(""));
      for (const text of amountsIn(language)) {
        expect(
          within(balance).getByText(text).closest('bdi[dir="ltr"]')
            ?.textContent,
        ).toBe(text);
      }
      for (const [name, text] of [
        ["Assets:Empty", "0"],
        ["Assets:Zero", `${formatSourceDecimal("0.00", true, language)} USD`],
        ["Income:Salary", language === "fa" ? "محاسبه نشده" : "Not computed"],
      ]) {
        const stateRow = within(table)
          .getByRole("link", { name })
          .closest("tr")!;
        expect(within(stateRow).getAllByRole("cell")[3].textContent).toBe(text);
      }
    },
  );

  it.each(["en", "fa"] as const)(
    "preserves %s row action focus and account-prefix keyboard navigation",
    async (language) => {
      const { router, table, row, requests } = await setup(language);
      const emptyRow = within(table)
        .getByRole("link", { name: "Assets:Empty" })
        .closest("tr")!;
      const trigger = within(emptyRow).getByRole("button", {
        name:
          language === "fa"
            ? "عملیات برای Assets:Empty"
            : "Actions for Assets:Empty",
      });
      const user = userEvent.setup();
      act(() => trigger.focus());
      await user.keyboard("{ArrowDown}");
      const openRegister = await screen.findByRole("menuitem", {
        name: language === "fa" ? "باز کردن دفتر حساب" : "Open register",
      });
      await waitFor(() => expect(openRegister).toHaveFocus());
      await user.keyboard("{Escape}");
      await waitFor(() => expect(trigger).toHaveFocus());
      const prefix = within(row).getByRole("link", { name: "Assets:بانک" });
      act(() => prefix.focus());
      await user.keyboard("{Enter}");
      await screen.findByRole("heading", { name: "Account detail" });
      expect(router.state.matches.at(-1)?.params).toMatchObject({
        ledgerOwner: "alice",
        ledgerName: "books",
        accountName: "Assets:بانک",
      });
      expect(requests).toEqual([
        {
          name: "GetLedgerAccountDirectives",
          variables: { ledgerId: "alice/books" },
        },
      ]);
    },
  );
});
