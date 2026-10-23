import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
  type Operation,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FieldNode, OperationDefinitionNode } from "graphql";
import type { ComponentType, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import LedgerAccountsPage from "@/features/ledger-data/accounts";
import LedgerBudgetPage from "@/features/ledger-data/budget";
import LedgerDocumentsPage from "@/features/ledger-data/documents";
import LedgerErrorsPage from "@/features/ledger-data/errors";
import LedgerEventsPage from "@/features/ledger-data/events";
import LedgerSettingsPage from "@/features/ledger-data/settings";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "demo", ledgerName: "books" }),
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
  // The Open Account dialog checks writes against a router it may lack.
  useRouter: () => undefined,
  useHydrated: () => true,
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerName: "Demo Books",
    ledgerData: {
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
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));
vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { account: "", filter: "", time: "2016" },
  }),
}));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

/** Every root field of a read, answered `null`. */
function emptyAnswer(operation: Operation) {
  const definition = operation.query.definitions.find(
    (d): d is OperationDefinitionNode => d.kind === "OperationDefinition",
  )!;
  return Object.fromEntries(
    definition.selectionSet.selections.map((s) => {
      const field = s as FieldNode;
      return [(field.alias ?? field.name).value, null];
    }),
  );
}

/**
 * Fails every `target` read until `hold()`, then holds each one until the
 * test settles it, and answers every other read empty. Accounts' Open Account
 * dialog watches the same read, so more than one may fail before the retry.
 */
function readClient(target: string) {
  const reads: Record<string, unknown>[] = [];
  const held: ((ok: boolean) => void)[] = [];
  let holding = false;
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          if (operation.operationName !== target) {
            observer.next({ data: emptyAnswer(operation) });
            observer.complete();
            return;
          }
          reads.push(operation.variables);
          const settle = (ok: boolean) => {
            if (!ok) return observer.error(new TypeError("Failed to fetch"));
            observer.next({ data: emptyAnswer(operation) });
            observer.complete();
          };
          if (holding) held.push(settle);
          else settle(false);
        }),
    ),
  });
  return {
    client,
    reads,
    hold: () => {
      holding = true;
    },
    settle: (ok: boolean) => held.shift()?.(ok),
  };
}

/**
 * The ledger-data pages left without an in-place retry by m50, and Budget,
 * whose retry did not return its read (w4/983).
 */
describe.each<[string, ComponentType, string]>([
  ["Settings", LedgerSettingsPage, "GetLedger"],
  ["Accounts", LedgerAccountsPage, "GetLedgerAccountDirectives"],
  ["Errors", LedgerErrorsPage, "GetLedgerErrors"],
  ["Documents", LedgerDocumentsPage, "GetLedgerDocuments"],
  ["Events", LedgerEventsPage, "GetLedgerEvents"],
  // Budget's first journal page; its retry now returns the read.
  ["Budget", LedgerBudgetPage, "GetLedgerJournal"],
])("%s read failure", (_name, Page, target) => {
  it("retries its own read in place until it succeeds", async () => {
    const user = userEvent.setup();
    const { client, reads, hold, settle } = readClient(target);
    render(
      <ApolloProvider client={client}>
        <Page />
      </ApolloProvider>,
    );

    const retry = await screen.findByRole("button", { name: "Try Again" });
    const failed = reads.length;
    hold();
    retry.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(reads).toHaveLength(failed + 1));
    // A pending retry stays where it was, busy, and starts nothing more.
    expect(retry).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(reads).toHaveLength(failed + 1);

    // Another rejection is handled and offers the retry again.
    settle(false);
    await waitFor(() => expect(retry).toBeEnabled());
    await waitFor(() => expect(retry).toHaveFocus());

    await user.keyboard("{Enter}");
    await waitFor(() => expect(reads).toHaveLength(failed + 2));
    settle(true);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Try Again" })).toBeNull(),
    );
    // Every retry asked for the same requested scope.
    expect(reads[failed]).toEqual(reads[0]);
    expect(reads[failed + 1]).toEqual(reads[0]);
  });
});
