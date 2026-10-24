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
  RouterProvider,
  useParams,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ListCommitsQuery,
  ListCommitsQueryVariables,
} from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import en from "@/i18n/locales/en";
import { LocalizationProvider } from "@/i18n/provider";
import CommitsSplitView from "../commits-split-view";

/**
 * A failed first read of Version History offers Try Again in place
 * (w4/1043). The error said to check the connection with no action, so a
 * reader had to reload the page. The real split view, router and Apollo
 * observer run; only the network answers are scripted.
 */
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.mock("../commit-detail", () => ({
  CommitDetail: ({ commitSha }: { commitSha: string }) => (
    <output aria-label="Synthetic commit detail">{commitSha}</output>
  ),
}));

interface CommitRequest {
  variables: ListCommitsQueryVariables;
  resolve: (data: ListCommitsQuery) => void;
  reject: () => void;
}

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

const sha = (index: number) =>
  `c${String(index).padStart(3, "0")}${"0".repeat(36)}`;
const history = (count: number): ListCommitsQuery => ({
  listCommits: Array.from({ length: count }, (_, index) => ({
    __typename: "CommitListItem",
    sha: sha(index),
    shortSha: sha(index).slice(0, 7),
    message: `qa-20261023 change ${index}`,
    author: {
      __typename: "CommitAuthor",
      name: "Ada",
      email: "ada@example.com",
      date: "2026-10-01T12:00:00.000Z",
    },
  })),
});

async function mount(path: string) {
  const requests: CommitRequest[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            variables: { ...operation.variables } as ListCommitsQueryVariables,
            resolve: (data) => {
              observer.next({ data });
              observer.complete();
            },
            reject: () => observer.error(new TypeError("Failed to fetch")),
          });
        }),
    ),
  });
  clients.push(client);
  const localization = createLocalization();
  await localization.changeLanguage("en");

  function History() {
    const { ledgerOwner, ledgerName, commitSha } = useParams({ strict: false });
    return (
      <CommitsSplitView
        ledgerId={`${ledgerOwner}/${ledgerName}`}
        selectedCommitSha={commitSha}
      />
    );
  }
  const root = createRootRoute({ component: History });
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({
        getParentRoute: () => root,
        path: "/ledger/$ledgerOwner/$ledgerName/commits",
        component: () => null,
      }),
      createRoute({
        getParentRoute: () => root,
        path: "/ledger/$ledgerOwner/$ledgerName/commit/$commitSha",
        component: () => null,
      }),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
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
  return { requests, router, user: userEvent.setup() };
}

const FIRST_PAGE = {
  ledgerId: "alice/books",
  branch: "main",
  page: 1,
  limit: 30,
};
const offline = () => screen.queryAllByText(en["common.errors.network"]);

describe("Version History first-page retry", () => {
  it("keeps a busy Try Again, keeps focus after another failure, then loads", async () => {
    const { requests, router, user } = await mount(
      "/ledger/alice/books/commits",
    );
    await act(async () => requests[0].reject());
    const tryAgain = () =>
      screen.getByRole("button", { name: en["common.tryAgain"] });

    tryAgain().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(offline()).toHaveLength(1);
    expect(tryAgain()).toHaveAttribute("aria-busy", "true");
    await user.keyboard("{Enter}");
    expect(requests).toHaveLength(2);

    await act(async () => requests[1].reject());
    await waitFor(() => expect(tryAgain()).toBeEnabled());
    expect(tryAgain()).toHaveFocus();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(requests).toHaveLength(3));
    await act(async () => requests[2].resolve(history(30)));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/ledger/alice/books/commit/${sha(0)}`,
      ),
    );
    expect(screen.getAllByTestId("commit-list-item").length).toBeGreaterThan(0);
    expect(offline()).toHaveLength(0);
    for (const request of requests) {
      expect(request.variables).toEqual(FIRST_PAGE);
    }
  });

  it("says a retried ledger with no commits has none", async () => {
    const { requests, user } = await mount("/ledger/alice/books/commits");
    await act(async () => requests[0].reject());
    await user.click(
      screen.getByRole("button", { name: en["common.tryAgain"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(2));
    await act(async () => requests[1].resolve(history(0)));

    expect(await screen.findByText(en["commits.noCommits"])).toBeVisible();
    expect(offline()).toHaveLength(0);
  });

  it("leaves a drawer closed during its retry closed and unfocused", async () => {
    const { requests, user } = await mount(
      `/ledger/alice/books/commit/${sha(3)}`,
    );
    await act(async () => requests[0].reject());
    const versionHistory = screen.getByRole("button", {
      name: en["commits.versionHistory"],
    });
    await user.click(versionHistory);
    const drawer = await screen.findByRole("dialog");
    await user.click(
      within(drawer).getByRole("button", { name: en["common.tryAgain"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(2));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(versionHistory).toHaveFocus();

    await act(async () => requests[1].reject());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(versionHistory).toHaveFocus();
    // The selected commit's detail was never re-read or replaced.
    expect(
      screen.getByRole("status", { name: "Synthetic commit detail" }),
    ).toHaveTextContent(sha(3));
  });
});
