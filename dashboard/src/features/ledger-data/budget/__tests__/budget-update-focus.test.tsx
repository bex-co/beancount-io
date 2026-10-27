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
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LedgerProvider } from "@/common/providers/ledger-provider";
import type {
  BulkEntriesMutationVariables,
  GetLedgerQuery,
} from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import LedgerBudgetPage from "../index";
import type { BudgetEntry } from "../types";

/**
 * w4/1110: after a successful card Update, the page's list refresh replaced
 * the cards — and the dialog's own trigger — with the loading skeleton, so
 * focus fell to BODY and an immediate Enter did nothing. This drives the
 * real page, card and dialog over a real Apollo cache whose journal reads
 * and write acknowledgement are controlled separately.
 */

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

vi.mock("@/common/hooks/use-root-context", () => ({
  useRootContext: () => ({ userProfile: { username: "alice" } }),
}));
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: () => null,
}));
vi.mock("@/common/hooks/use-date-locale", async () => {
  const { enUS } = await import("react-day-picker/locale/en-US");
  return { useDateLocale: () => enUS };
});

const ACCOUNT = "Expenses:Groceries";
const UPDATE_NAME = `Update budget for ${ACCOUNT} (USD)`;

const ledgerData = {
  id: "alice/books",
  name: "books",
  permissions: { admin: true, push: true, pull: true },
  options: { operatingCurrency: ["USD"], renderCommas: true },
} as GetLedgerQuery["getLedger"];

function entry(date: string, number: string): BudgetEntry {
  return {
    date,
    entry_hash: `budget-${date}-${number}`,
    directive_type: "custom",
    type: "budget",
    values: [ACCOUNT, "monthly", { number, currency: "USD" }],
  };
}

function setup({ refreshFails = false } = {}) {
  const writes: BulkEntriesMutationVariables[] = [];
  let entries = [entry("2026-10-01", "100")];
  let reads = 0;
  let releaseRefresh: (() => void) | null = null;
  let holdRefresh = false;

  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          const respond = (data: Record<string, unknown>) => {
            observer.next({ data });
            observer.complete();
          };
          switch (operation.operationName) {
            case "BulkEntries": {
              const variables =
                operation.variables as BulkEntriesMutationVariables;
              writes.push(variables);
              const budget = variables.entries[0]!.budget!;
              entries = [...entries, entry(budget.date, budget.amount.number)];
              holdRefresh = true;
              respond({
                bulkEntries: {
                  __typename: "AddLedgerEntryResponse",
                  success: true,
                  message: "Added 1 entry successfully",
                },
              });
              return;
            }
            case "GetLedgerJournal": {
              reads += 1;
              const answer = () => {
                if (refreshFails && reads > 1) {
                  observer.error(new Error("Failed to fetch"));
                  return;
                }
                respond({
                  getLedgerJournal: {
                    __typename: "JournalResult",
                    total: entries.length,
                    data: entries,
                  },
                });
              };
              if (holdRefresh && reads > 1) {
                releaseRefresh = answer;
              } else {
                answer();
              }
              return;
            }
            case "GetLedgerIntervalTotals":
              respond({ getLedgerIntervalTotals: [] });
              return;
            case "GetLedgerCurrencies":
              respond({ getLedgerCurrencies: ["USD"] });
              return;
            case "GetLedgerAccounts":
              respond({ getLedgerAccounts: [ACCOUNT] });
              return;
            default:
              observer.error(
                new Error(`unexpected ${operation.operationName}`),
              );
          }
        }),
    ),
  });

  return {
    client,
    writes,
    releaseRefresh: () => releaseRefresh?.(),
  };
}

async function mountPage(client: ApolloClient) {
  const localization = createLocalization();
  await localization.changeLanguage("en");
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    component: () => (
      <LedgerProvider
        ledgerOwner="alice"
        ledgerName="books"
        ledgerData={ledgerData}
      >
        <Outlet />
      </LedgerProvider>
    ),
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
    <ApolloProvider client={client}>
      <LocalizationProvider localization={localization}>
        <RouterProvider router={router} />
      </LocalizationProvider>
    </ApolloProvider>,
  );
  return screen.findByRole("button", { name: UPDATE_NAME });
}

afterEach(cleanup);

describe("Budget Update focus across the list refresh (w4/1110)", () => {
  it("returns focus to the replacement Update action after a saved update", async () => {
    const { client, writes, releaseRefresh } = setup();
    const user = userEvent.setup();
    const opener = await mountPage(client);

    // Cancel control: the still-mounted trigger keeps its restore.
    opener.focus();
    await user.keyboard("{Enter}");
    let dialog = await screen.findByRole("dialog", { name: "Add Budget" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(opener).toHaveFocus());
    expect(writes).toHaveLength(0);

    // Successful update: 150 dated today by the form's default.
    await user.keyboard("{Enter}");
    dialog = await screen.findByRole("dialog", { name: "Add Budget" });
    await user.type(
      within(dialog).getByRole("spinbutton", { name: /amount/i }),
      "150",
    );
    const submit = within(dialog).getByRole("button", { name: "Add Budget" });
    await waitFor(() => expect(submit).toBeEnabled());
    submit.focus();
    await user.keyboard("{Enter}");

    // The acknowledged write closes the dialog; the held refresh replaces
    // the card (and the old trigger) with the skeleton.
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(writes).toHaveLength(1);
    await waitFor(() => expect(opener.isConnected).toBe(false));
    expect(screen.queryByRole("button", { name: UPDATE_NAME })).toBeNull();

    releaseRefresh();
    const replacement = await screen.findByRole("button", {
      name: UPDATE_NAME,
    });
    expect(replacement).not.toBe(opener);
    await waitFor(() => expect(replacement).toHaveFocus());

    // Immediate Enter from the restored position opens the intended form.
    await user.keyboard("{Enter}");
    dialog = await screen.findByRole("dialog", { name: "Add Budget" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(replacement).toHaveFocus());
    expect(writes).toHaveLength(1);
  });

  it("does not steal focus the user moved while the refresh was pending", async () => {
    const { client, releaseRefresh } = setup();
    const user = userEvent.setup();
    const opener = await mountPage(client);
    opener.focus();
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Add Budget" });
    await user.type(
      within(dialog).getByRole("spinbutton", { name: /amount/i }),
      "150",
    );
    const submit = within(dialog).getByRole("button", { name: "Add Budget" });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);
    await waitFor(() => expect(opener.isConnected).toBe(false));

    // While the list is replaced, the user deliberately moves to the
    // persistent header action; the settled refresh must not take it back.
    const headerAdd = screen.getByRole("button", { name: /add budget/i });
    headerAdd.focus();
    releaseRefresh();
    await screen.findByRole("button", { name: UPDATE_NAME });
    await waitFor(() => expect(headerAdd).toHaveFocus());
  });

  it("falls back to the persistent header action when the refresh fails", async () => {
    const { client, writes, releaseRefresh } = setup({ refreshFails: true });
    const user = userEvent.setup();
    const opener = await mountPage(client);
    opener.focus();
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Add Budget" });
    await user.type(
      within(dialog).getByRole("spinbutton", { name: /amount/i }),
      "150",
    );
    const submit = within(dialog).getByRole("button", { name: "Add Budget" });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    // The saved write still finishes once (w4/m41); the failed read is the
    // page's own error state, and focus lands on a connected fallback.
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(writes).toHaveLength(1);
    releaseRefresh();
    const headerAdd = screen.getByRole("button", { name: /add budget/i });
    await waitFor(() => expect(headerAdd).toHaveFocus());
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
    expect(writes).toHaveLength(1);
  });
});
