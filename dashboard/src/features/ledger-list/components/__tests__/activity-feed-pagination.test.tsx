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
  return {
    getFeed: {
      __typename: "FeedResponse",
      total: 30,
      hasMore,
      items: Array.from({ length: 10 }, (_, index) => ({
        __typename: "FeedItem",
        id: `activity-${offset + index}`,
        title: `Ledger change ${offset + index}`,
        summary: `Recorded transaction ${offset + index}`,
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
  return { container, requests };
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
      expect(pendingButton).toBeDisabled();
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
      expect(retry).toBeDisabled();
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
      expect(requests.map((request) => request.variables.offset)).toEqual([
        0, 10, 10,
      ]);

      // Advancing only after success also keeps the next page and terminal state correct.
      await user.click(showMore);
      await waitFor(() => expect(requests).toHaveLength(4));
      expect(requests[3].variables.offset).toBe(20);
      await resolvePage(requests[3], 20, false);
      await waitFor(() => expectCards(30));
      expect(
        screen.queryByRole("button", {
          name: messages["page.dashboard.showMore"],
        }),
      ).not.toBeInTheDocument();
    },
  );

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
});
