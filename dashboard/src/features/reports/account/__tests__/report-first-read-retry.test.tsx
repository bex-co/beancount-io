import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AccountPage from "../index";

/**
 * A failed first Account Report read offers Try Again in place (w4/1045).
 * The page said "Connection problem" with no action, so a reader had to
 * reload it. The real page and Apollo observers run; the router, shared
 * filters and charts are replaced, and the network answers are scripted.
 */
const params = vi.hoisted(() => ({
  ledgerOwner: "open_ledger",
  ledgerName: "example",
  accountName: "Assets:US:Vanguard:RGAGX",
}));
vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ...params }),
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
  useRouter: () => ({}),
  useBlocker: () => ({ status: "idle", reset: vi.fn(), proceed: vi.fn() }),
}));
vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { account: "", filter: "", time: "2016-04" },
  }),
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    primaryCurrency: "USD",
    ledgerName: "Example",
    ledgerData: {},
  }),
}));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));
vi.mock("@/features/reports/balance-sheet/line-chart", () => ({
  LineChart: () => <div data-testid="line-chart" />,
}));
vi.mock("@/features/reports/income-statement/date-balance-chart", () => ({
  DateBalanceChart: () => <div data-testid="date-balance-chart" />,
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

type Request = {
  variables: Record<string, unknown>;
  resolve: () => void;
  reject: () => void;
};

const clients: ApolloClient[] = [];
beforeEach(() => {
  vi.mocked(localStorage.getItem).mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
  params.accountName = "Assets:US:Vanguard:RGAGX";
});

const series = [
  {
    __typename: "DateAndBalance",
    date: "2016-04-30",
    balance: { USD: "24839.78584" },
  },
];

function setup() {
  const reports: Request[] = [];
  let journalReads = 0;
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          if (operation.operationName === "GetLedgerAccountJournal") {
            journalReads += 1;
            observer.next({
              data: {
                getLedgerAccountJournal: {
                  __typename: "AccountJournalResponse",
                  with_children: true,
                  total: 0,
                  account: String(operation.variables.accountName),
                  items: [],
                },
              },
            });
            observer.complete();
            return;
          }
          reports.push({
            variables: { ...operation.variables },
            resolve: () => {
              observer.next({
                data: {
                  getLedgerAccountReport: {
                    __typename: "AccountReport",
                    linechartData: series,
                    intervalTotalsData: series,
                    accountBalanceData: series,
                  },
                },
              });
              observer.complete();
            },
            reject: () => observer.error(new TypeError("Failed to fetch")),
          });
        }),
    ),
  });
  clients.push(client);
  const page = () => (
    <ApolloProvider client={client}>
      <AccountPage />
    </ApolloProvider>
  );
  const view = render(page());
  const tryAgain = () =>
    screen.getByRole("button", { name: "common.tryAgain" });
  const failed = () => screen.queryAllByText("common.errors.network");
  return {
    reports,
    journalReads: () => journalReads,
    tryAgain,
    failed,
    user: userEvent.setup(),
    showAccount: (accountName: string) => {
      params.accountName = accountName;
      view.rerender(page());
    },
  };
}

describe("Account Report first-read retry", () => {
  it("re-reads only the report, one attempt at a time, keeps focus, and recovers", async () => {
    const { reports, journalReads, tryAgain, failed, user } = setup();
    await waitFor(() => expect(reports).toHaveLength(1));
    await act(async () => reports[0].reject());
    expect(failed().length).toBeGreaterThan(0);

    tryAgain().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(reports).toHaveLength(2));
    expect(failed().length).toBeGreaterThan(0);
    expect(tryAgain()).toHaveAttribute("aria-busy", "true");
    await user.keyboard("{Enter}");
    expect(reports).toHaveLength(2);

    await act(async () => reports[1].reject());
    await waitFor(() => expect(tryAgain()).toBeEnabled());
    expect(tryAgain()).toHaveFocus();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(reports).toHaveLength(3));
    // Retrying read the report alone; the journal waits for a report.
    expect(journalReads()).toBe(0);
    await act(async () => reports[2].resolve());
    expect((await screen.findAllByTestId("line-chart")).length).toBeGreaterThan(
      0,
    );
    expect(failed()).toHaveLength(0);
    await waitFor(() => expect(journalReads()).toBe(1));
    for (const report of reports) {
      expect(report.variables).toEqual(reports[0].variables);
    }
    expect(reports[0].variables).toMatchObject({
      accountName: "Assets:US:Vanguard:RGAGX",
      ledgerId: "open_ledger/example",
      time: "2016-04",
    });
  });

  it("keeps no old failure for another account opened during a retry", async () => {
    const { reports, tryAgain, failed, user, showAccount } = setup();
    await waitFor(() => expect(reports).toHaveLength(1));
    await act(async () => reports[0].reject());
    await user.click(tryAgain());
    await waitFor(() => expect(reports).toHaveLength(2));

    showAccount("Assets:US:Vanguard:Cash");
    await waitFor(() => expect(reports).toHaveLength(3));
    expect(reports[2].variables).toMatchObject({
      accountName: "Assets:US:Vanguard:Cash",
    });
    expect(failed()).toHaveLength(0);

    await act(async () => reports[1].reject());
    expect(failed()).toHaveLength(0);
    await act(async () => reports[2].resolve());
    expect((await screen.findAllByTestId("line-chart")).length).toBeGreaterThan(
      0,
    );
  });
});
