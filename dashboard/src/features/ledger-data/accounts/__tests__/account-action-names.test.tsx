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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountsActionSearchSchema } from "@/common/lib/ledger-action-search";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import LedgerAccountsPage from "../index";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

const permission = vi.hoisted(() => ({ canWrite: true }));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerName: "books",
    ledgerData: {
      permissions: { pull: true, push: permission.canWrite },
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
vi.mock("@/common/hooks/use-theme", () => ({ useIsDarkTheme: () => false }));
// Account creation and the Monaco runtime are outside the row-action journey.
vi.mock("../open-account-dialog", () => ({ OpenAccountDialog: () => null }));
vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: ({ value }: { value: string }) => <pre>{value}</pre>,
}));

const accounts = ["Assets:Checking", "Assets:Savings"].map(
  (account, index) => ({
    __typename: "LedgerAccountItem" as const,
    account,
    openedAt: "2025-01-01",
    closedAt: null,
    entryCount: 0,
    balance: {},
    entryHash: `open-${index}`,
    closeEntryHash: null,
  }),
);

beforeEach(() => {
  permission.canWrite = true;
});
afterEach(cleanup);

async function setup(language: "en" | "de" = "en", referenceCount = 0) {
  const operations: string[] = [];
  const mutations: Record<string, unknown>[] = [];
  let currentAccounts = accounts.map((row, index) => ({
    ...row,
    referenceCount: index === 0 ? referenceCount : 0,
  }));
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          operations.push(operation.operationName);
          if (operation.operationName === "GetLedgerAccountDirectives") {
            observer.next({
              data: { getLedgerAccountDirectives: currentAccounts },
            });
          } else if (operation.operationName === "GetLedgerEntryContext") {
            const account = accounts.find(
              (item) => item.entryHash === operation.variables.entryHash,
            )!;
            observer.next({
              data: {
                getLedgerEntryContext: {
                  __typename: "EntryContext",
                  slice: `2025-01-01 open ${account.account} USD`,
                  sha256sum: "synthetic-sha",
                  entry: { meta: { filename: "main.bean", lineno: 1 } },
                  balances_before: null,
                  balances_after: null,
                  managed_source: null,
                },
              },
            });
          } else if (
            operation.operationName === "DeleteMultipleLedgerEntrySourceSlices"
          ) {
            mutations.push(operation.variables);
            const entries = operation.variables.input.entries as Array<{
              entryHash: string;
            }>;
            currentAccounts = currentAccounts.filter(
              (account) =>
                !entries.some((entry) => entry.entryHash === account.entryHash),
            );
            observer.next({
              data: {
                deleteMultipleLedgerEntrySourceSlices: {
                  __typename: "DeleteMultiSourceSlicesResponse",
                  message: "Deleted",
                  deletedCount: entries.length,
                },
              },
            });
          } else {
            observer.error(
              new Error(`Unexpected operation: ${operation.operationName}`),
            );
            return;
          }
          observer.complete();
        }),
    ),
  });
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const root = createRootRoute({ component: () => <Outlet /> });
  const route = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/accounts",
    validateSearch: (search) => accountsActionSearchSchema.parse(search),
    component: LedgerAccountsPage,
  });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({
      initialEntries: ["/ledger/alice/books/accounts"],
    }),
    defaultHashScrollIntoView: false,
  });
  await router.load();
  const view = render(
    <LocalizationProvider localization={localization}>
      <ApolloProvider client={client}>
        <RouterProvider router={router} />
      </ApolloProvider>
    </LocalizationProvider>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("link", { name: "Assets:Savings" }),
    ).toBeInTheDocument(),
  );
  return { ...view, operations, mutations, router };
}

describe("account row action names", () => {
  it("keeps Delete disabled when another directive refers to an account with no postings", async () => {
    const { operations, mutations } = await setup("en", 1);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Actions for Assets:Checking" }),
    );
    const remove = await screen.findByRole("menuitem", { name: /^Delete/ });
    expect(remove).toHaveAttribute("aria-disabled", "true");
    expect(remove).toHaveTextContent(
      "An account can only be deleted if no other entry refers to it.",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(operations).toEqual(["GetLedgerAccountDirectives"]);
    expect(mutations).toEqual([]);
  });

  it.each([
    ["en", "Actions for Assets:Checking", "Actions for Assets:Savings"],
    ["de", "Aktionen für Assets:Checking", "Aktionen für Assets:Savings"],
  ] as const)(
    "labels both %s row triggers with their complete account targets",
    async (language, checking, savings) => {
      await setup(language);
      expect(screen.getByRole("button", { name: checking })).toHaveAttribute(
        "aria-haspopup",
        "menu",
      );
      expect(screen.getByRole("button", { name: savings })).toHaveAttribute(
        "aria-haspopup",
        "menu",
      );
    },
  );

  it("gives the repeated row menu triggers distinct accessible names", async () => {
    const { container } = await setup();
    const triggers = [
      ...container.querySelectorAll('button[aria-haspopup="menu"]'),
    ];
    expect(triggers).toHaveLength(2);
    // The trigger's only text is its sr-only accessible label beside the icon.
    expect(
      new Set(triggers.map((trigger) => trigger.textContent?.trim())).size,
    ).toBe(2);
    expect(triggers[0]).toHaveAccessibleName("Actions for Assets:Checking");
    expect(triggers[1]).toHaveAccessibleName("Actions for Assets:Savings");
  });

  it.each(["Assets:Checking", "Assets:Savings"])(
    "opens %s actions by keyboard and returns Escape to that same trigger",
    async (account) => {
      const user = userEvent.setup();
      const { router, operations } = await setup();
      const trigger = screen.getByRole("button", {
        name: `Actions for ${account}`,
      });
      trigger.focus();
      await user.keyboard("{ArrowDown}");
      await waitFor(() =>
        expect(
          screen.getByRole("menuitem", { name: "Open register" }),
        ).toHaveFocus(),
      );
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
      });
      expect(router.state.location.pathname).toBe(
        "/ledger/alice/books/accounts",
      );
      expect(operations).toEqual(["GetLedgerAccountDirectives"]);
    },
  );

  it.each([
    ["Close", "Escape", "Assets:Checking"],
    ["Close", "Cancel", "Assets:Savings"],
    ["Delete", "Escape", "Assets:Savings"],
    ["Delete", "Cancel", "Assets:Checking"],
  ] as const)(
    "returns %s %s to the persistent %s row trigger",
    async (action, dismissal, account) => {
      const user = userEvent.setup();
      const { router, operations } = await setup();
      const trigger = screen.getByRole("button", {
        name: `Actions for ${account}`,
      });
      trigger.focus();
      await user.keyboard("{ArrowDown}");
      await waitFor(() =>
        expect(
          screen.getByRole("menuitem", { name: "Open register" }),
        ).toHaveFocus(),
      );
      await user.keyboard(action === "Delete" ? "{End}" : "{ArrowDown}");
      expect(
        screen.getByRole("menuitem", {
          name: action === "Close" ? "Close Account" : action,
        }),
      ).toHaveFocus();
      await user.keyboard("{Enter}");
      const dialog = await screen.findByRole("dialog", {
        name: `${action} Account`,
      });
      expect(dialog).toHaveTextContent(account);
      if (action === "Delete") {
        await waitFor(() =>
          expect(
            within(dialog).getByRole("button", { name: "Delete", exact: true }),
          ).toBeEnabled(),
        );
      }
      if (dismissal === "Escape") await user.keyboard("{Escape}");
      else
        await user.click(
          within(dialog).getByRole("button", { name: "Cancel" }),
        );
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
      });
      expect(router.state.location.pathname).toBe(
        "/ledger/alice/books/accounts",
      );
      expect(operations).toEqual(
        action === "Delete"
          ? ["GetLedgerAccountDirectives", "GetLedgerEntryContext"]
          : ["GetLedgerAccountDirectives"],
      );
    },
  );

  it("keeps row actions unavailable to a reader through the real permission gate", async () => {
    permission.canWrite = false;
    const { container } = await setup();
    expect(
      container.querySelectorAll('button[aria-haspopup="menu"]'),
    ).toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: "Actions for Assets:Checking" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Actions for Assets:Savings" }),
    ).not.toBeInTheDocument();
  });

  it("falls back to Search accounts after a successful deletion removes the named trigger", async () => {
    const user = userEvent.setup();
    const { mutations } = await setup();
    const trigger = screen.getByRole("button", {
      name: "Actions for Assets:Checking",
    });
    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Delete Account",
    });
    const confirm = within(dialog).getByRole("button", {
      name: "Delete",
      exact: true,
    });
    await waitFor(() => expect(confirm).toBeEnabled());
    await user.click(confirm);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(trigger).not.toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: "Search accounts..." }),
      ).toHaveFocus();
    });
    expect(
      screen.getByRole("button", { name: "Actions for Assets:Savings" }),
    ).toBeInTheDocument();
    expect(mutations).toEqual([
      {
        ledgerId: "alice/books",
        input: {
          entries: [{ entryHash: "open-0", sha256sum: "synthetic-sha" }],
        },
      },
    ]);
  });
});
