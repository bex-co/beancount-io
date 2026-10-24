import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
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
import { journalActionSearchSchema } from "@/common/lib/ledger-action-search";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params";
import { LedgerSearchParamsProvider } from "@/common/providers/ledger-search-params-provider";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import LedgerJournalPage from "../journal-page";

/**
 * A failed Journal read offers Try Again in place (w4/1037). The error said
 * to try again but gave no way to, so a reader had to reload or change a
 * filter. The real page, Apollo observer, router and translations run; only
 * the network answers are scripted.
 */
vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => null, report: async () => false }),
}));
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => false,
}));
vi.mock("@/common/providers/ledger-provider", () => ({
  useLedger: () => ({
    ledgerName: "Synthetic books",
    ledgerData: {
      options: { renderCommas: true },
      fava_options: {},
      permissions: { pull: true },
    },
  }),
}));

const clients: ApolloClient[] = [];
beforeEach(() => {
  vi.mocked(localStorage.getItem).mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

type Request = {
  operation: string;
  variables: Record<string, unknown>;
  resolve: () => void;
  reject: () => void;
};

const SEARCH =
  "?time=2016-04&account=Assets%3AQaCash&filter=%23trip-los-angeles-2016";

async function setup() {
  const requests: Request[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            operation: operation.operationName ?? "",
            variables: structuredClone(operation.variables),
            reject: () => observer.error(new TypeError("Failed to fetch")),
            resolve: () => {
              observer.next({
                data: {
                  getLedgerJournal: {
                    __typename: "JournalResponse",
                    total: 2,
                    is_empty: false,
                    data: ["Hotel", "Flight"].map((payee) => ({
                      directive_type: "Transaction",
                      date: "2016-04-12",
                      flag: "*",
                      payee: `qa-20261023 ${payee}`,
                      narration: "Trip",
                      postings: [],
                      tags: ["trip-los-angeles-2016"],
                      links: [],
                      meta: {},
                    })),
                  },
                },
              });
              observer.complete();
            },
          });
        }),
    ),
  });
  clients.push(client);
  const localization = createLocalization();
  await localization.changeLanguage("en");
  const root = createRootRoute({ component: () => <Outlet /> });
  const ledger = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    component: () => (
      <LedgerSearchParamsProvider>
        <Outlet />
      </LedgerSearchParamsProvider>
    ),
  });
  const journal = createRoute({
    getParentRoute: () => ledger,
    path: "/journal",
    validateSearch: (search) => journalActionSearchSchema.parse(search),
    component: LedgerJournalPage,
  });
  const router = createRouter({
    routeTree: root.addChildren([ledger.addChildren([journal])]),
    history: createMemoryHistory({
      initialEntries: [`/ledger/alice/books/journal${SEARCH}`],
    }),
  });
  await router.load();
  render(
    <LocalizationProvider localization={localization}>
      <ApolloProvider client={client}>
        <RouterProvider router={router} />
      </ApolloProvider>
    </LocalizationProvider>,
  );
  await waitFor(() => expect(requests).toHaveLength(1));
  const t = localization.i18n.t.bind(localization.i18n);
  const tryAgain = () =>
    screen.getByRole("button", { name: t("common.tryAgain") });
  const failed = () =>
    screen.queryByText(new RegExp(t("journal.errorLoadingJournalEntries")));
  return { requests, router, t, tryAgain, failed, user: userEvent.setup() };
}

describe("Journal read failure", () => {
  it("retries the same read in place, one attempt at a time, and recovers", async () => {
    const { requests, router, t, tryAgain, failed, user } = await setup();
    await act(async () => requests[0].reject());
    expect(failed()).toHaveTextContent(t("common.errors.network"));

    await user.click(tryAgain());
    await waitFor(() => expect(requests).toHaveLength(2));
    // The error and its busy Try Again stay while the retry runs; a second
    // press sends nothing.
    expect(failed()).toBeInTheDocument();
    expect(tryAgain()).toHaveAttribute("aria-busy", "true");
    expect(tryAgain()).toBeDisabled();
    await user.click(tryAgain());
    expect(requests).toHaveLength(2);

    // Another failure keeps the explanation and hands focus back.
    await act(async () => requests[1].reject());
    await waitFor(() => expect(tryAgain()).toBeEnabled());
    expect(failed()).toBeInTheDocument();
    expect(tryAgain()).toHaveFocus();

    await user.click(tryAgain());
    await waitFor(() => expect(requests).toHaveLength(3));
    await act(async () => requests[2].resolve());
    expect(await screen.findByText("qa-20261023 Hotel")).toBeInTheDocument();
    expect(failed()).toBeNull();

    // Every attempt asked for exactly the journal the reader requested.
    expect(requests.map((request) => request.operation)).toEqual([
      "GetLedgerJournal",
      "GetLedgerJournal",
      "GetLedgerJournal",
    ]);
    expect(requests[0].variables).toMatchObject({
      ledgerId: "alice/books",
      query: {
        time: "2016-04",
        account: "Assets:QaCash",
        filter: "#trip-los-angeles-2016",
        offset: 0,
        limit: 60,
      },
    });
    expect(requests[1].variables).toEqual(requests[0].variables);
    expect(requests[2].variables).toEqual(requests[0].variables);
    expect(router.state.location.searchStr).toBe(SEARCH);
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });
});
