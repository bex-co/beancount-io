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
  fireEvent,
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
import de from "@/i18n/locales/de";
import { LocalizationProvider } from "@/i18n/provider";
import CommitsSplitView from "../commits-split-view";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

vi.mock("../commit-detail", () => ({
  CommitDetail: ({ commitSha }: { commitSha: string }) => (
    <output aria-label="Synthetic commit detail">{commitSha}</output>
  ),
}));

interface CommitRequest {
  name: string;
  variables: ListCommitsQueryVariables;
  resolve: (data: ListCommitsQuery) => void;
  reject: () => void;
}

const clients: ApolloClient[] = [];

afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

function sha(index: number, prefix = "a") {
  return `${prefix}${String(index).padStart(3, "0")}${"0".repeat(36)}`;
}

function page(start: number, count: number, prefix = "a"): ListCommitsQuery {
  return {
    listCommits: Array.from({ length: count }, (_, offset) => {
      const index = start + offset;
      return {
        __typename: "CommitListItem",
        sha: sha(index, prefix),
        shortSha: sha(index, prefix).slice(0, 7),
        message: `Synthetic ${prefix} change ${index}\nAdditional commit detail`,
        author: {
          __typename: "CommitAuthor",
          name: "Ada",
          email: "ada@example.com",
          date: "2026-09-01T12:00:00.000Z",
        },
      };
    }),
  };
}

async function mountHistory({
  language = "en",
  selected = sha(0),
}: {
  language?: "en" | "de";
  selected?: string;
} = {}) {
  const requests: CommitRequest[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            name: operation.operationName,
            variables: { ...operation.variables } as ListCommitsQueryVariables,
            resolve: (data) => {
              observer.next({ data });
              observer.complete();
            },
            reject: () =>
              observer.error(new Error("History network unavailable")),
          });
        }),
    ),
  });
  clients.push(client);
  const localization = createLocalization();
  await localization.changeLanguage(language);

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
  const commitRoute = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/commit/$commitSha",
    component: () => null,
  });
  const router = createRouter({
    routeTree: root.addChildren([commitRoute]),
    history: createMemoryHistory({
      initialEntries: [`/ledger/alice/books/commit/${selected}`],
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
  expect(requests[0]).toMatchObject({
    name: "ListCommits",
    variables: { ledgerId: "alice/books", branch: "main", page: 1, limit: 30 },
  });
  return { requests, router, client, user: userEvent.setup() };
}

async function resolve(request: CommitRequest, data: ListCommitsQuery) {
  await act(async () => request.resolve(data));
}

function expectHistory(count: number, prefix = "a") {
  const links = screen.getAllByTestId("commit-list-item");
  expect(links).toHaveLength(count);
  links.forEach((link, index) => {
    expect(link).toHaveTextContent(`Synthetic ${prefix} change ${index}`);
    expect(link).toHaveAttribute(
      "href",
      `/ledger/alice/${prefix === "a" ? "books" : "other"}/commit/${sha(index, prefix)}`,
    );
  });
  return links;
}

/** Page 1 after a newer commit lands: the new head, then a000–a028. */
function refreshedFirstPage(): ListCommitsQuery {
  return {
    listCommits: [...page(0, 1, "n").listCommits, ...page(0, 29).listCommits],
  };
}

function historyShas() {
  return screen
    .getAllByTestId("commit-list-item")
    .map((link) => link.getAttribute("href")!.split("/").at(-1));
}

describe("commit history pagination through Apollo", () => {
  it("appends 30/30/7 commits, resolves the deep-link warning, and retains keyboard focus", async () => {
    const selected = sha(66);
    const { requests, router, user } = await mountHistory({ selected });
    expect(
      screen.getByRole("status", { name: "Synthetic commit detail" }),
    ).toHaveTextContent(selected);
    await resolve(requests[0], page(0, 30));
    await waitFor(() => expectHistory(30));
    const firstLinks = screen.getAllByTestId("commit-list-item");
    expect(
      screen.getByText(en["commits.selectedOutsideHistory"]),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { current: "page" }),
    ).not.toBeInTheDocument();

    const load = screen.getByRole("button", { name: en["commits.loadOlder"] });
    act(() => load.focus());
    await user.keyboard("{Enter}");
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1].variables).toEqual({
      ledgerId: "alice/books",
      branch: "main",
      page: 2,
      limit: 30,
    });
    expect(load).toBeEnabled();
    expect(load).toHaveAttribute("aria-disabled", "true");
    expect(load).toHaveFocus();
    await resolve(requests[1], page(30, 30));
    await waitFor(() => expectHistory(60));
    expect(screen.getAllByTestId("commit-list-item").slice(0, 30)).toEqual(
      firstLinks,
    );
    expect(load).toHaveFocus();
    expect(load).toBeEnabled();
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
      "Loaded 30 older commits",
    );
    expect(
      screen.getByText(en["commits.selectedOutsideHistory"]),
    ).toBeVisible();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2].variables.page).toBe(3);
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
      en["common.loading"],
    );
    await resolve(requests[2], page(60, 7));
    await waitFor(() => expectHistory(67));
    expect(
      screen.queryByRole("button", { name: en["commits.loadOlder"] }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(en["commits.selectedOutsideHistory"]),
    ).not.toBeInTheDocument();
    const links = screen.getAllByTestId("commit-list-item");
    expect(links[60]).toHaveFocus();
    expect(links[66]).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
      "Loaded 7 older commits",
    );
    expect(router.state.location.pathname).toBe(
      `/ledger/alice/books/commit/${selected}`,
    );

    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/ledger/alice/books/commit/${sha(60)}`,
      ),
    );
    expect(links[60]).toHaveAttribute("aria-current", "page");
    expect(links[66]).not.toHaveAttribute("aria-current");
    expect(requests).toHaveLength(3);
  });

  it("keeps existing rows on a failed page and retries that same page with localized guidance", async () => {
    const { requests, user } = await mountHistory({ language: "de" });
    await resolve(requests[0], page(0, 30));
    await waitFor(() => expectHistory(30));
    const originalLinks = screen.getAllByTestId("commit-list-item");
    const load = screen.getByRole("button", { name: de["commits.loadOlder"] });
    await user.click(load);
    await waitFor(() => expect(requests).toHaveLength(2));
    await act(async () => requests[1].reject());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      de["common.failedToLoadData"],
    );
    expectHistory(30);
    expect(screen.getAllByTestId("commit-list-item")).toEqual(originalLinks);
    expect(load).toBeEnabled();
    expect(load).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2].variables).toEqual(requests[1].variables);
    expect(requests[2].variables.page).toBe(2);
    await resolve(requests[2], page(30, 7));
    await waitFor(() => expectHistory(37));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: de["commits.loadOlder"] }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
      "7 ältere Commits geladen",
    );
    expect(screen.getAllByTestId("commit-list-item")[30]).toHaveFocus();
  });

  it("deduplicates overlapping SHAs while advancing by fetched pages and blocking duplicate activation", async () => {
    const { requests, user } = await mountHistory();
    await resolve(requests[0], page(0, 30));
    await waitFor(() => expectHistory(30));
    const load = screen.getByRole("button", { name: en["commits.loadOlder"] });
    await user.click(load);
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(load).toBeEnabled();
    expect(load).toHaveAttribute("aria-disabled", "true");
    expect(load).toHaveFocus();
    fireEvent.click(load);
    await user.keyboard("{Enter}");
    expect(requests).toHaveLength(2);
    await resolve(requests[1], page(29, 30));
    await waitFor(() => expectHistory(59));
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
      "Loaded 29 older commits",
    );
    expect(load).toBeEnabled();

    await user.click(load);
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests.map((request) => request.variables.page)).toEqual([
      1, 2, 3,
    ]);
    await resolve(requests[2], page(59, 7));
    await waitFor(() => expectHistory(66));
    expect(
      new Set(
        screen
          .getAllByTestId("commit-list-item")
          .map((link) => link.getAttribute("href")),
      ).size,
    ).toBe(66);
    expect(
      screen.queryByRole("button", { name: en["commits.loadOlder"] }),
    ).not.toBeInTheDocument();
  });

  it("does not move focus to a new commit after the reader tabs away", async () => {
    const { requests, user } = await mountHistory();
    await resolve(requests[0], page(0, 30));
    const load = screen.getByRole("button", { name: en["commits.loadOlder"] });
    act(() => load.focus());
    await user.keyboard("{Enter}{Shift>}{Tab}{/Shift}");
    const destination = screen.getAllByTestId("commit-list-item")[29];
    expect(destination).toHaveFocus();
    await resolve(requests[1], page(30, 7));
    await waitFor(() => expectHistory(37));
    expect(destination).toHaveFocus();
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
      "No more results",
    );
  });

  it("isolates an old ledger's pending page and resets pagination when changing ledgers", async () => {
    const { requests, router, user } = await mountHistory();
    await resolve(requests[0], page(0, 30));
    await waitFor(() => expectHistory(30));
    await user.click(
      screen.getByRole("button", { name: en["commits.loadOlder"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(2));
    await resolve(requests[1], page(30, 30));
    await waitFor(() => expectHistory(60));
    await user.click(
      screen.getByRole("button", { name: en["commits.loadOlder"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(3));
    const oldPage = requests[2];
    expect(oldPage.variables.page).toBe(3);

    await act(async () => {
      await router.navigate({
        to: "/ledger/$ledgerOwner/$ledgerName/commit/$commitSha",
        params: {
          ledgerOwner: "alice",
          ledgerName: "other",
          commitSha: sha(0, "b"),
        },
      });
    });
    await waitFor(() => expect(requests).toHaveLength(4));
    expect(requests[3].variables).toEqual({
      ledgerId: "alice/other",
      branch: "main",
      page: 1,
      limit: 30,
    });
    expect(screen.queryByTestId("commit-list-item")).not.toBeInTheDocument();
    await resolve(requests[3], page(0, 30, "b"));
    await waitFor(() => expectHistory(30, "b"));

    await user.click(
      screen.getByRole("button", { name: en["commits.loadOlder"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(5));
    expect(requests[4].variables).toEqual({
      ledgerId: "alice/other",
      branch: "main",
      page: 2,
      limit: 30,
    });
    await resolve(requests[4], page(30, 7, "b"));
    await waitFor(() => expectHistory(37, "b"));
    expect(
      screen.queryByRole("button", { name: en["commits.loadOlder"] }),
    ).not.toBeInTheDocument();

    await act(async () => {
      await router.navigate({
        to: "/ledger/$ledgerOwner/$ledgerName/commit/$commitSha",
        params: {
          ledgerOwner: "alice",
          ledgerName: "books",
          commitSha: sha(0),
        },
      });
    });
    await waitFor(() => expect(requests).toHaveLength(6));
    expect(requests[5].variables).toEqual(requests[0].variables);
    await resolve(requests[5], page(0, 30));
    await waitFor(() => expectHistory(30));
    // A stopped workspace's fetchMore must not merge into this fresh cache entry.
    await resolve(oldPage, page(60, 7));
    expectHistory(30);
    expect(screen.queryByText("Synthetic a change 60")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "" })).toBeEmptyDOMElement();
    const history = screen.getByRole("navigation", {
      name: en["commits.versionHistory"],
    });
    expect(
      within(history).getByRole("link", { current: "page" }),
    ).toHaveAttribute("href", `/ledger/alice/books/commit/${sha(0)}`);
    await user.click(
      screen.getByRole("button", { name: en["commits.loadOlder"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(7));
    expect(requests[6].variables).toEqual(requests[1].variables);
    await resolve(requests[6], page(30, 30));
    await waitFor(() => expectHistory(60));
    await user.click(
      screen.getByRole("button", { name: en["commits.loadOlder"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(8));
    expect(requests[7].variables).toEqual(oldPage.variables);
    await resolve(requests[7], page(60, 7));
    await waitFor(() => expectHistory(67));
  });

  it("continues from page 2 after Refresh replaces two pages with a fresh first page (w4/1095)", async () => {
    const { requests, client, user } = await mountHistory();
    await resolve(requests[0], page(0, 30));
    await waitFor(() => expectHistory(30));
    await user.click(
      screen.getByRole("button", { name: en["commits.loadOlder"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(2));
    await resolve(requests[1], page(30, 30));
    await waitFor(() => expectHistory(60));

    // Out of date → Refresh evicts the root query, as useApolloCacheClear does.
    act(() => {
      client.cache.evict({ id: "ROOT_QUERY" });
    });
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2].variables.page).toBe(1);
    await resolve(requests[2], refreshedFirstPage());
    await waitFor(() => expect(historyShas()).toHaveLength(30));

    await user.click(
      screen.getByRole("button", { name: en["commits.loadOlder"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(4));
    expect(requests[3].variables.page).toBe(2);
    await resolve(requests[3], page(29, 30));
    await waitFor(() => expect(historyShas()).toHaveLength(60));
    expect(historyShas()).toEqual([
      sha(0, "n"),
      ...Array.from({ length: 59 }, (_, index) => sha(index)),
    ]);
  });

  it("drops a continuation that was pending when Refresh replaced the list (w4/1095)", async () => {
    const { requests, client, user } = await mountHistory();
    await resolve(requests[0], page(0, 30));
    await waitFor(() => expectHistory(30));
    await user.click(
      screen.getByRole("button", { name: en["commits.loadOlder"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(2));
    await resolve(requests[1], page(30, 30));
    await waitFor(() => expectHistory(60));
    await user.click(
      screen.getByRole("button", { name: en["commits.loadOlder"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(3));
    const stale = requests[2];
    expect(stale.variables.page).toBe(3);

    act(() => {
      client.cache.evict({ id: "ROOT_QUERY" });
    });
    // The old generation's page 3 lands after the eviction; it must not be
    // merged into whatever list replaces the evicted one.
    await resolve(stale, page(60, 30));
    await waitFor(() => expect(requests).toHaveLength(4));
    expect(requests[3].variables.page).toBe(1);
    await resolve(requests[3], refreshedFirstPage());
    await waitFor(() => expect(historyShas()).toHaveLength(30));
    expect(historyShas()[0]).toBe(sha(0, "n"));
    expect(screen.queryByText("Synthetic a change 60")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: en["commits.loadOlder"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(5));
    expect(requests[4].variables.page).toBe(2);
  });
});
