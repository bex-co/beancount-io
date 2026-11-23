import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LedgerStatisticsPage from "../index";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "open_ledger", ledgerName: "books" }),
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { time: "2025", filter: "", account: "" },
    setSearchParams: vi.fn(),
  }),
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "Books", ledgerData: { options: {} } }),
}));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

const RESULTS: Record<string, object> = {
  GetLedgerAccounts: { getLedgerAccounts: ["Assets:Cash"] },
  GetLedgerPostingsPerAccount: {
    getLedgerPostingsPerAccount: [
      { __typename: "PostingsPerAccount", account: "Assets:Cash", count: 3 },
    ],
  },
  GetLedgerAccountLastEntries: {
    getLedgerAccountLastEntries: [
      {
        __typename: "AccountLastEntry",
        date: "2025-12-31",
        balance: { USD: "10.00" },
        account: "Assets:Cash",
      },
    ],
  },
  GetLedgerEntriesCountPerType: {
    getLedgerEntriesCountPerType: [
      { __typename: "EntriesByType", type: "Transaction", number: 4 },
    ],
  },
};

type Read = {
  operation: string;
  variables: Record<string, unknown>;
  settle: (ok: boolean) => void;
};

/**
 * The three section reads, settled by the network after the request. The
 * first read of `failing` fails; its later reads wait in `held`.
 */
function mountStatistics(failing: string) {
  const reads: Read[] = [];
  const held: Read[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          const read: Read = {
            operation: operation.operationName,
            variables: operation.variables,
            settle: (ok) => {
              setTimeout(() => {
                if (!ok) {
                  observer.error(new TypeError("Failed to fetch"));
                  return;
                }
                observer.next({ data: RESULTS[operation.operationName] });
                observer.complete();
              });
            },
          };
          const earlier = reads.filter((r) => r.operation === read.operation);
          reads.push(read);
          if (read.operation !== failing) read.settle(true);
          else if (earlier.length === 0) read.settle(false);
          else held.push(read);
        }),
    ),
  });
  clients.push(client);
  render(
    <ApolloProvider client={client}>
      <LedgerStatisticsPage />
    </ApolloProvider>,
  );
  return { reads, held };
}

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

/** A failed Statistics section retries its own read in place (w4/338). */
describe("Statistics section read failure", () => {
  it.each([
    ["GetLedgerPostingsPerAccount", "Failed to load postings data"],
    ["GetLedgerAccountLastEntries", "Failed to load account entries"],
    ["GetLedgerEntriesCountPerType", "Failed to load entries statistics"],
  ])(
    "retries only %s by keyboard, keeping its siblings' tables",
    async (failing, description) => {
      const user = userEvent.setup();
      const { reads, held } = mountStatistics(failing);

      expect(await screen.findByText(description)).toBeInTheDocument();
      expect(screen.getByText(/Connection problem/)).toBeInTheDocument();
      await waitFor(() => expect(screen.getAllByRole("table")).toHaveLength(2));

      const retry = screen.getByRole("button", { name: "Try Again" });
      retry.focus();
      await user.keyboard("{Enter}");
      await waitFor(() => expect(held).toHaveLength(1));
      // Pending: the section keeps its error view, busy; Enter sends nothing.
      expect(retry).toBeDisabled();
      expect(screen.getByText(description)).toBeInTheDocument();
      await user.keyboard("{Enter}");
      expect(held).toHaveLength(1);

      held.shift()!.settle(false);
      await waitFor(() => expect(retry).toHaveFocus());
      expect(screen.getByText(description)).toBeInTheDocument();
      expect(screen.getAllByRole("table")).toHaveLength(2);

      await user.keyboard("{Enter}");
      await waitFor(() => expect(held).toHaveLength(1));
      held.shift()!.settle(true);
      await waitFor(() => expect(screen.getAllByRole("table")).toHaveLength(3));
      expect(screen.queryByText(description)).toBeNull();
      expect(screen.queryByRole("button", { name: "Try Again" })).toBeNull();

      // Three attempts of the failed section's read, all for the current
      // scope; each sibling was read once and never again.
      const attempts = reads.filter((read) => read.operation === failing);
      expect(attempts).toHaveLength(3);
      for (const attempt of attempts) {
        expect(attempt.variables).toEqual({
          ledgerId: "open_ledger/books",
          time: "2025",
          filter: "",
          account: "",
        });
      }
      const accounts = reads.filter(
        (read) => read.operation === "GetLedgerAccounts",
      );
      expect(accounts).toMatchObject([
        { variables: { ledgerId: "open_ledger/books" } },
      ]);
      expect(
        reads.filter(
          (read) =>
            read.operation !== failing &&
            read.operation !== "GetLedgerAccounts",
        ),
      ).toHaveLength(2);
    },
  );
});
