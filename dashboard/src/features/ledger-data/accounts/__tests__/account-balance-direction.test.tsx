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
  const account = within(table).getByRole("button", { name: accountName });
  const row = account.closest("tr")!;
  return { ...view, router, table, account, row, requests };
}

describe("account balance reading direction", () => {
  it.each(["fa", "en"] as const)(
    "isolates each complete %s signed balance without changing its digits or account direction",
    async (language) => {
      const { table, account, row } = await setup(language);
      const context = screen.getByTestId("reading-context");
      expect(context).toHaveAttribute("dir", language === "fa" ? "rtl" : "ltr");
      for (const text of amountsIn(language)) {
        const copies = within(row).getAllByText(text);
        expect(copies).toHaveLength(2);
        for (const amount of copies) {
          expect(amount.textContent).toBe(text);
          const isolated = amount.closest('bdi[dir="ltr"]');
          expect(isolated).not.toBeNull();
          expect(isolated?.textContent).toBe(text);
          expect(isolated).not.toContainElement(account);
        }
      }
      // Neither a whole row nor its Persian account name is forced LTR.
      expect(account.closest("[dir]")).toBe(context);
      expect(row).not.toHaveAttribute("dir");
      expect(table).not.toHaveAttribute("dir");
      expect(
        within(row).getByText(language === "fa" ? "باز" : "Open"),
      ).toBeInTheDocument();
    },
  );

  it.each(["fa", "en"] as const)(
    "preserves %s native rows, unknown/empty balances, and keyboard account navigation",
    async (language) => {
      const { router, table, account, row, requests } = await setup(language);
      expect(within(table).getAllByRole("row")).toHaveLength(5);
      expect(within(row).getAllByRole("cell")).toHaveLength(7);
      expect(row).not.toHaveAttribute("role");
      expect(row).not.toHaveAttribute("tabindex");
      expect(within(row).getAllByRole("cell")[5].textContent).toBe(
        amountsIn(language).join(""),
      );
      const emptyRow = within(table)
        .getByRole("button", { name: "Assets:Empty" })
        .closest("tr")!;
      expect(within(emptyRow).getAllByRole("cell")[5].textContent).toBe("-");
      expect(
        within(table).getAllByText(
          language === "fa" ? "محاسبه نشده" : "Not computed",
        ),
      ).toHaveLength(2);
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

function compactBalance(row: HTMLElement) {
  const accountCell = within(row).getAllByRole("cell")[0];
  const compact = [...accountCell.querySelectorAll<HTMLElement>("*")].find(
    (element) => element.classList.contains("@xl:hidden"),
  );
  expect(
    compact,
    "balance under the account name below the @xl container breakpoint",
  ).toBeDefined();
  expect(compact?.tagName).toBe("DL");
  const value = compact?.querySelector("dd");
  expect(value).not.toBeNull();
  return value!;
}

describe("compact Accounts balances", () => {
  it.each(["en", "fa"] as const)(
    "keeps every %s balance below its account name and retains the desktop balance column",
    async (language) => {
      const { table, row, account } = await setup(language);
      expect(table.closest(".\\@container")).not.toBeNull();
      const compact = compactBalance(row);
      expect(compact.parentElement?.querySelector("dt")).toHaveTextContent(
        language === "fa" ? "موجودی" : "Balance",
      );
      expect(compact.textContent).toBe(amountsIn(language).join(""));
      expect(
        account.compareDocumentPosition(compact) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      const desktop = within(row).getAllByRole("cell")[5];
      expect(desktop).toHaveClass("hidden", "@xl:table-cell");
      expect(desktop.textContent).toBe(amountsIn(language).join(""));
      for (const text of amountsIn(language)) {
        const compactAmount = within(compact).getByText(text);
        expect(compactAmount.closest('bdi[dir="ltr"]')?.textContent).toBe(text);
      }
      for (const [name, text] of [
        ["Assets:Empty", "-"],
        ["Assets:Zero", `${formatSourceDecimal("0.00", true, language)} USD`],
        ["Income:Salary", language === "fa" ? "محاسبه نشده" : "Not computed"],
      ]) {
        const stateRow = within(table)
          .getByRole("button", { name })
          .closest("tr")!;
        expect(compactBalance(stateRow).textContent).toBe(text);
        expect(within(stateRow).getAllByRole("cell")[5].textContent).toBe(text);
      }
    },
  );

  it.each(["en", "fa"] as const)(
    "preserves %s status, row action focus, and account-prefix keyboard navigation",
    async (language) => {
      const { router, table, row, requests } = await setup(language);
      expect(within(row).getAllByRole("cell")[1]).toHaveTextContent(
        language === "fa" ? "باز" : "Open",
      );
      const emptyRow = within(table)
        .getByRole("button", { name: "Assets:Empty" })
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
      const close = await screen.findByRole("menuitem", {
        name: language === "fa" ? "بستن" : "Close",
      });
      await waitFor(() => expect(close).toHaveFocus());
      await user.keyboard("{Escape}");
      await waitFor(() => expect(trigger).toHaveFocus());
      const prefix = within(row).getByRole("button", { name: "Assets:بانک" });
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
