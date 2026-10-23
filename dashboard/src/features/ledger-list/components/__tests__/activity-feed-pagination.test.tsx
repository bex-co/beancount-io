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
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FeedSource,
  type GetFeedQuery,
  type GetFeedQueryVariables,
} from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import en from "@/i18n/locales/en";
import de from "@/i18n/locales/de";
import { LocalizationProvider } from "@/i18n/provider";
import { ActivityFeed } from "../activity-feed";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

interface FeedRequest {
  name: string;
  variables: GetFeedQueryVariables;
  resolve: (data: GetFeedQuery) => void;
  reject: () => void;
}

const clients: ApolloClient[] = [];

afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

function feedPage(offset: number, hasMore = true): GetFeedQuery {
  return feedItems(
    Array.from({ length: 10 }, (_, index) => offset + index),
    hasMore,
  );
}

/** A page holding exactly these activity numbers, in order. */
function feedItems(numbers: number[], hasMore = true): GetFeedQuery {
  return {
    getFeed: {
      __typename: "FeedResponse",
      total: 30,
      hasMore,
      items: numbers.map((number) => ({
        __typename: "FeedItem",
        id: `activity-${number}`,
        title: `Ledger change ${number}`,
        summary: `Recorded transaction ${number}`,
        link: "/ledger/alice/books",
        publishedAt: "2026-09-01T12:00:00Z",
        author: "alice",
        authorAvatar: null,
        source: FeedSource.LedgerRss,
      })),
    },
  };
}

async function mountFeed(language: "en" | "de" = "en") {
  const requests: FeedRequest[] = [];
  // Only the network boundary is controlled. Apollo useQuery/fetchMore,
  // updateQuery, the real cards, router links, and locale catalogs all run.
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            name: operation.operationName,
            variables: { ...operation.variables },
            resolve: (data) => {
              observer.next({ data });
              observer.complete();
            },
            reject: () => observer.error(new Error("Feed network unavailable")),
          });
        }),
    ),
  });
  clients.push(client);
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const rootRoute = createRootRoute({ component: Outlet });
  const activityRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger",
    component: ActivityFeed,
  });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    component: Outlet,
  });
  const commitsRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/commits",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      activityRoute,
      ledgerRoute.addChildren([commitsRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: ["/ledger"] }),
  });
  await router.load();
  const { container } = render(
    <LocalizationProvider localization={localization}>
      <ApolloProvider client={client}>
        <RouterProvider router={router} />
      </ApolloProvider>
    </LocalizationProvider>,
  );
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0]).toMatchObject({
    name: "GetFeed",
    variables: { offset: 0, limit: 10, source: "LEDGER_RSS", locale: language },
  });
  return { container, requests, localization, router };
}

async function resolvePage(
  request: FeedRequest,
  offset: number,
  hasMore = true,
) {
  await act(async () => request.resolve(feedPage(offset, hasMore)));
}

function expectCards(count: number) {
  const cards = screen.getAllByRole("article");
  expect(cards).toHaveLength(count);
  cards.forEach((card, index) => {
    expect(within(card).getByText(`Ledger change ${index}`)).toBeVisible();
    expect(
      within(card).getByText(`Recorded transaction ${index}`),
    ).toBeVisible();
    expect(within(card).getByRole("link", { name: "books" })).toHaveAttribute(
      "href",
      "/ledger/alice/books",
    );
  });
}

describe("Activity feed pagination through Apollo", () => {
  it.each([
    ["en", en],
    ["de", de],
  ] as const)(
    "retains cards and retries the failed offset once with localized %s guidance",
    async (language, messages) => {
      const { requests } = await mountFeed(language);
      const user = userEvent.setup();
      await resolvePage(requests[0], 0);
      await waitFor(() => expectCards(10));
      const initialCards = screen.getAllByRole("article");

      await user.click(
        screen.getByRole("button", {
          name: messages["page.dashboard.showMore"],
        }),
      );
      await waitFor(() => expect(requests).toHaveLength(2));
      expect(requests[1].variables).toEqual({
        offset: 10,
        limit: 10,
        source: "LEDGER_RSS",
        locale: language,
      });
      const pendingButton = screen.getByRole("button", {
        name: messages["page.dashboard.showMore"],
      });
      expect(pendingButton).toBeEnabled();
      expect(pendingButton).toHaveAttribute("aria-disabled", "true");
      expect(pendingButton).toHaveFocus();
      fireEvent.click(pendingButton);
      expect(requests).toHaveLength(2);

      await act(async () => requests[1].reject());
      expect(await screen.findByRole("alert")).toHaveTextContent(
        messages["page.dashboard.feedError"],
      );
      expectCards(10);
      expect(screen.getAllByRole("article")).toEqual(initialCards);
      const retry = screen.getByRole("button", {
        name: messages["page.dashboard.retry"],
      });
      expect(retry).toBeEnabled();

      await user.click(retry);
      await waitFor(() => expect(requests).toHaveLength(3));
      expect(requests[2].variables).toEqual(requests[1].variables);
      expect(retry).toBeEnabled();
      expect(retry).toHaveAttribute("aria-disabled", "true");
      expect(retry).toHaveFocus();
      expect(screen.getByRole("alert")).toHaveTextContent(
        messages["page.dashboard.feedError"],
      );
      fireEvent.click(retry);
      expect(requests).toHaveLength(3);

      await resolvePage(requests[2], 10);
      await waitFor(() => expectCards(20));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: messages["page.dashboard.retry"],
        }),
      ).not.toBeInTheDocument();
      const showMore = screen.getByRole("button", {
        name: messages["page.dashboard.showMore"],
      });
      expect(showMore).toBeEnabled();
      expect(showMore).toHaveFocus();
      expect(screen.getByRole("status")).toHaveTextContent(
        language === "en"
          ? "Loaded 10 more items"
          : "10 weitere Einträge geladen",
      );
      expect(requests.map((request) => request.variables.offset)).toEqual([
        0, 10, 10,
      ]);

      // Advancing only after success also keeps the next page and terminal state correct.
      await user.click(showMore);
      await waitFor(() => expect(requests).toHaveLength(4));
      expect(requests[3].variables.offset).toBe(20);
      await resolvePage(requests[3], 20, false);
      await waitFor(() => expectCards(30));
      expect(screen.getByRole("status")).toHaveFocus();
      expect(screen.getByRole("status")).toHaveTextContent(
        language === "en" ? "No more results" : "Keine weiteren Ergebnisse",
      );
      expect(
        screen.queryByRole("button", {
          name: messages["page.dashboard.showMore"],
        }),
      ).not.toBeInTheDocument();
    },
  );

  it("keeps focus on a card when the reader leaves the pending control", async () => {
    const { requests } = await mountFeed();
    const user = userEvent.setup();
    await resolvePage(requests[0], 0);
    const more = screen.getByRole("button", {
      name: en["page.dashboard.showMore"],
    });
    act(() => more.focus());
    await user.keyboard("{Enter}{Shift>}{Tab}{/Shift}");
    const destination = document.activeElement;
    expect(destination?.tagName).toBe("A");
    await resolvePage(requests[1], 10, false);
    await waitFor(() => expectCards(20));
    expect(destination).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("No more results");
  });

  it("resets the locale's offset and ignores its abandoned in-flight page", async () => {
    const { requests, localization } = await mountFeed();
    const user = userEvent.setup();
    await resolvePage(requests[0], 0);
    await user.click(
      screen.getByRole("button", { name: en["page.dashboard.showMore"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(2));
    const abandoned = requests[1];
    await act(async () => {
      await localization.changeLanguage("de");
    });
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2].variables).toEqual({
      offset: 0,
      limit: 10,
      source: "LEDGER_RSS",
      locale: "de",
    });
    await resolvePage(requests[2], 0);
    await waitFor(() => expectCards(10));
    await resolvePage(abandoned, 10, false);
    expectCards(10);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await user.click(
      screen.getByRole("button", { name: de["page.dashboard.showMore"] }),
    );
    await waitFor(() => expect(requests).toHaveLength(4));
    expect(requests[3].variables).toEqual({
      offset: 10,
      limit: 10,
      source: "LEDGER_RSS",
      locale: "de",
    });
  });

  it("keeps the initial loading and read-error recovery behavior on offset zero", async () => {
    const { container, requests } = await mountFeed();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    await act(async () => requests[0].reject());
    expect(
      await screen.findByText(en["page.dashboard.feedError"]),
    ).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: en["page.dashboard.retry"] }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1].variables).toEqual(requests[0].variables);
    await resolvePage(requests[1], 0);
    await waitFor(() => expectCards(10));
    expect(
      screen.queryByText(en["page.dashboard.feedError"]),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: en["page.dashboard.showMore"] }),
    ).toBeEnabled();
  });

  it("keeps cached cards through a failed refresh on return and retries it in place (w4/984)", async () => {
    const { requests, router } = await mountFeed();
    const user = userEvent.setup();
    await resolvePage(requests[0], 0);
    await waitFor(() => expectCards(10));

    // Open a card's ledger, then come back: the cached cards show at once
    // while the cache-and-network refresh is pending.
    await user.click(screen.getAllByRole("link", { name: "books" })[0]!);
    await waitFor(() => expect(screen.queryByRole("article")).toBeNull());
    await act(async () => router.history.back());
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1].variables).toEqual(requests[0].variables);
    expectCards(10);

    // The refresh fails: the cards stay, with a notice and the read's retry.
    await act(async () => requests[1].reject());
    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent(
      en["page.dashboard.activityRefreshFailed"],
    );
    expect(screen.queryByText(en["page.dashboard.feedError"])).toBeNull();
    expectCards(10);

    const retry = within(notice).getByRole("button", {
      name: en["page.dashboard.retry"],
    });
    retry.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2].variables).toEqual(requests[0].variables);
    // Pending, the notice and its busy retry stay and start nothing more.
    expect(retry).toBeDisabled();
    expect(notice).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(requests).toHaveLength(3);
    // A browser drops focus from the disabled control; jsdom keeps it.
    const away = document.createElement("button");
    document.body.appendChild(away);
    away.focus();
    away.remove();

    await act(async () => requests[2].reject());
    await waitFor(() => expect(retry).toHaveFocus());
    expectCards(10);

    await user.keyboard("{Enter}");
    await waitFor(() => expect(requests).toHaveLength(4));
    await resolvePage(requests[3], 0);
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expectCards(10);
  });

  it("keeps a successful empty initial feed free of pagination controls", async () => {
    const { requests } = await mountFeed();
    await act(async () =>
      requests[0].resolve({
        getFeed: {
          __typename: "FeedResponse",
          total: 0,
          hasMore: false,
          items: [],
        },
      }),
    );
    expect(
      await screen.findByText(en["page.dashboard.activityEmpty"]),
    ).toBeVisible();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  /**
   * Newer activity moves the server's offset boundary, so the next page can
   * repeat cards already on screen; the raw append rendered them twice under
   * the same key (w4/302).
   */
  describe("when newer activity shifts the next page", () => {
    const titles = () =>
      screen
        .getAllByRole("article")
        .map((card) => within(card).getByText(/^Ledger change /).textContent);
    const showMore = () =>
      screen.getByRole("button", { name: en["page.dashboard.showMore"] });

    it("appends only unseen cards and keeps advancing by whole pages", async () => {
      const { requests } = await mountFeed();
      const user = userEvent.setup();
      await resolvePage(requests[0], 0);
      await waitFor(() => expectCards(10));
      const firstCards = screen.getAllByRole("article");

      await user.click(showMore());
      await waitFor(() => expect(requests).toHaveLength(2));
      // Two cards slid over the boundary, and one id repeats within the page.
      await act(async () =>
        requests[1].resolve(feedItems([8, 9, 10, 11, 11, 12, 13, 14, 15, 16])),
      );
      await waitFor(() =>
        expect(screen.getAllByRole("article")).toHaveLength(17),
      );
      expect(new Set(titles()).size).toBe(17);
      expect(screen.getAllByRole("article").slice(0, 10)).toEqual(firstCards);
      expect(screen.getByRole("status")).toHaveTextContent(
        "Loaded 7 more items",
      );
      expect(showMore()).toHaveFocus();

      await user.click(showMore());
      await waitFor(() => expect(requests).toHaveLength(3));
      expect(requests[2].variables.offset).toBe(20);
      await act(async () =>
        requests[2].resolve(feedItems([18, 19, 20, 21], false)),
      );
      await waitFor(() =>
        expect(screen.getAllByRole("article")).toHaveLength(21),
      );
      expect(new Set(titles()).size).toBe(21);
      expect(screen.getByRole("status")).toHaveFocus();
      expect(screen.getByRole("status")).toHaveTextContent("No more results");
    });

    it("keeps Show More usable when a page adds nothing new", async () => {
      const { requests } = await mountFeed();
      const user = userEvent.setup();
      await resolvePage(requests[0], 0);
      await waitFor(() => expectCards(10));

      await user.click(showMore());
      await waitFor(() => expect(requests).toHaveLength(2));
      await act(async () => requests[1].resolve(feedItems([5, 6, 7, 8, 9])));
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(
          "Loaded 0 more items",
        ),
      );
      expectCards(10);
      expect(showMore()).toBeEnabled();
      expect(showMore()).toHaveFocus();

      await user.click(showMore());
      await waitFor(() => expect(requests).toHaveLength(3));
      expect(requests[2].variables.offset).toBe(20);
    });

    it("shows exactly the refreshed list when an overlapped feed revalidates", async () => {
      const { requests } = await mountFeed();
      const user = userEvent.setup();
      await resolvePage(requests[0], 0);
      await waitFor(() => expectCards(10));
      await user.click(showMore());
      await waitFor(() => expect(requests).toHaveLength(2));
      await act(async () =>
        requests[1].resolve(feedItems([8, 9, 10, 11, 12, 13, 14, 15, 16, 17])),
      );
      await waitFor(() =>
        expect(screen.getAllByRole("article")).toHaveLength(18),
      );

      // A revalidation (Back to the dashboard) replaces the accumulated list.
      await act(async () => {
        void clients[0]!.refetchQueries({ include: "active" });
      });
      await waitFor(() => expect(requests).toHaveLength(3));
      expect(requests[2].variables.offset).toBe(0);
      await act(async () =>
        requests[2].resolve(feedItems([20, 21, 0, 1, 2, 3, 4, 5, 6, 7])),
      );
      await waitFor(() =>
        expect(screen.getAllByRole("article")).toHaveLength(10),
      );
      expect(new Set(titles()).size).toBe(10);
    });
  });
});
