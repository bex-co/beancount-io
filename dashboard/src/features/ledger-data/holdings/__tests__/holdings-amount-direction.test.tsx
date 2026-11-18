import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
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
import { downloadCSV } from "@/common/lib/utils/csv-export";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { DatasetTable } from "../holdings-table";
import { holdingsStatementByAccount } from "../holdings-statement";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
// Keep rendering, query delivery, CSV serialization, and navigation real;
// capture only the final browser download boundary.
vi.mock("@/common/lib/utils/csv-export", () => ({ downloadCSV: vi.fn() }));

const accountName = "Assets:کارگزاری";
const rows = [
  [
    accountName,
    { VACHR: "-13", ETH: "-0.0000000000000000000123456789", ACME: "+4.0000" },
    { USD: "-33.71", EUR: "100.2500" },
    "9007199254740993.0000000001",
    "-0.004",
  ],
];
const headers = ["account", "units", "market_value", "price", "quantity"];
const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
  vi.clearAllMocks();
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
          if (operation.operationName !== "QueryShell") {
            observer.error(
              new Error(`Unexpected operation: ${operation.operationName}`),
            );
            return;
          }
          observer.next({
            data: {
              queryShell: {
                __typename: "QueryResult",
                resultType: "table",
                text: null,
                table: {
                  __typename: "QueryResultTable",
                  t: null,
                  types: headers.map((name) => ({
                    __typename: "QueryColumn",
                    name,
                    dtype:
                      name === "account"
                        ? "str"
                        : name === "units" || name === "market_value"
                          ? "Inventory"
                          : "Decimal",
                  })),
                  rows,
                },
              },
            },
          });
          observer.complete();
        }),
    ),
  });
  clients.push(client);
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const root = createRootRoute({ component: () => <Outlet /> });
  const holdingsRoute = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/holdings",
    component: () => (
      <DatasetTable
        query={holdingsStatementByAccount}
        ledgerId="alice/books"
        ariaLabel={localization.i18n.t("page.holdings.holdingsByAccount")}
      />
    ),
  });
  const accountRoute = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
    component: () => <h1>Account detail</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([holdingsRoute, accountRoute]),
    history: createMemoryHistory({
      initialEntries: ["/ledger/alice/books/holdings"],
    }),
  });
  await router.load();
  render(
    <LocalizationProvider localization={localization}>
      <ApolloProvider client={client}>
        <div dir={localization.i18n.dir()} data-testid="reading-context">
          <RouterProvider router={router} />
        </div>
      </ApolloProvider>
    </LocalizationProvider>,
  );
  const table = await screen.findByRole("table", {
    name: language === "fa" ? "دارایی‌ها بر اساس حساب" : "Holdings by Account",
  });
  const account = within(table).getByRole("button", { name: accountName });
  const row = account.closest("tr")!;
  return { router, table, row, account, requests };
}

describe("holdings amount reading direction", () => {
  it.each(["fa", "en"] as const)(
    "isolates %s multi-unit and scalar quantities while leaving account names in their reading context",
    async (language) => {
      const { table, row, account } = await setup(language);
      const context = screen.getByTestId("reading-context");
      expect(context).toHaveAttribute("dir", language === "fa" ? "rtl" : "ltr");
      for (const [amount, unit] of [
        ["-13", "VACHR"],
        ["-0.0000000000000000000123456789", "ETH"],
        ["+4.0000", "ACME"],
        ["-33.71", "USD"],
        ["100.2500", "EUR"],
      ]) {
        const quantity = within(row).getByText(amount);
        expect(quantity.textContent).toBe(amount);
        const isolated = quantity.closest('bdi[dir="ltr"]');
        expect(isolated).not.toBeNull();
        expect(isolated).toContainElement(within(row).getByText(unit));
        // Existing spacing is CSS margin, not an inserted character.
        expect(isolated?.textContent).toBe(`${amount}${unit}`);
      }
      for (const text of ["9007199254740993.0000000001", "-0.004"]) {
        const amount = within(row).getByText(text);
        const isolated = amount.closest('bdi[dir="ltr"]');
        expect(isolated).not.toBeNull();
        expect(isolated?.textContent).toBe(text);
      }
      expect(account.closest("[dir]")).toBe(context);
      expect(row).not.toHaveAttribute("dir");
      expect(table).not.toHaveAttribute("dir");
    },
  );

  it.each(["fa", "en"] as const)(
    "preserves %s native cells, lossless CSV values, and keyboard account navigation",
    async (language) => {
      const { router, table, row, account, requests } = await setup(language);
      expect(within(table).getAllByRole("row")).toHaveLength(2);
      expect(within(row).getAllByRole("cell")).toHaveLength(5);
      expect(row).not.toHaveAttribute("role");
      expect(row).not.toHaveAttribute("tabindex");
      expect(
        within(row)
          .getAllByRole("cell")
          .map((cell) => cell.textContent),
      ).toEqual([
        accountName,
        "-13VACHR-0.0000000000000000000123456789ETH+4.0000ACME",
        "-33.71USD100.2500EUR",
        "9007199254740993.0000000001",
        "-0.004",
      ]);
      const user = userEvent.setup();
      await user.click(
        screen.getByRole("button", {
          name: language === "fa" ? "خروجی CSV" : "Export CSV",
        }),
      );
      // Amount cells that open with a sign are not plain numbers, so the
      // shared CSV writer neutralizes them against formula evaluation
      // (CWE-1236); signed plain numbers stay numeric cells.
      expect(downloadCSV).toHaveBeenCalledExactlyOnceWith(
        '"account","units","market_value","price","quantity"\n"Assets:کارگزاری","\'-13 VACHR\r\n-0.0000000000000000000123456789 ETH\r\n+4.0000 ACME","\'-33.71 USD\r\n100.2500 EUR","9007199254740993.0000000001","-0.004"',
        expect.stringMatching(/^holdings-export-\d{4}-\d{2}-\d{2}\.csv$/),
      );
      account.focus();
      await user.keyboard("{Enter}");
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
          name: "QueryShell",
          variables: {
            ledgerId: "alice/books",
            query: holdingsStatementByAccount,
          },
        },
      ]);
    },
  );
});
