import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserProfileTabs } from "../user-profile-tabs";

/**
 * Try Again on a failed first page of Followers, Following or Starred stays
 * mounted and busy while it runs, and keeps focus when it fails again
 * (w4/1041). The spinner used to replace the error and its button, so focus
 * fell to the page and a second Enter did nothing. The real tabs, wrapper
 * hooks and Apollo observers run; only the network answers are scripted.
 */
vi.mock("@tanstack/react-router", () => ({
  useHydrated: () => true,
  Link: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useRouter: () => ({
    state: {
      matches: [
        { routeId: "/ledger/$username", params: { username: "open_ledger" } },
      ],
      pendingMatches: undefined,
    },
  }),
  useSearch: () => ({}),
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) =>
      ({
        "userProfile.noFollowers": "No followers yet",
        "userProfile.noFollowing": "Not following anyone yet",
        "userProfile.noStarredRepos": "No starred repositories",
        "userProfile.listLoadError": "Could not load this list.",
        "common.tryAgain": "Try again",
      })[key] ?? key,
  }),
}));

type Request = {
  operation: string;
  variables: Record<string, unknown>;
  resolve: (data: unknown) => void;
  reject: () => void;
};

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

const person = (username: string) => ({
  __typename: "UserListItem",
  username,
  fullName: `QA ${username}`,
  avatarUrl: null,
  bio: null,
});

const lists = [
  {
    tab: "followers",
    operation: "GetUserFollowers",
    page: () => ({
      getUserFollowers: {
        __typename: "UserListResponse",
        total: 1,
        users: [person("qa-follower")],
      },
    }),
    shows: "QA qa-follower",
  },
  {
    tab: "following",
    operation: "GetUserFollowing",
    page: () => ({
      getUserFollowing: {
        __typename: "UserListResponse",
        total: 1,
        users: [person("qa-followed")],
      },
    }),
    shows: "QA qa-followed",
  },
  {
    tab: "starred",
    operation: "GetUserStarredRepos",
    // A genuinely empty list, which must read as empty and not as failed.
    page: () => ({
      getUserStarredRepos: {
        __typename: "RepositoryListResponse",
        total: 0,
        repositories: [],
      },
    }),
    shows: "No starred repositories",
  },
];

function setup(tab: string) {
  const requests: Request[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            operation: operation.operationName ?? "",
            variables: { ...operation.variables },
            resolve: (data) => {
              observer.next({ data: data as Record<string, unknown> });
              observer.complete();
            },
            reject: () => observer.error(new TypeError("Failed to fetch")),
          });
        }),
    ),
  });
  clients.push(client);
  const tabs = (username: string) => (
    <ApolloProvider client={client}>
      <UserProfileTabs
        username={username}
        activities={[]}
        repositories={[]}
        followersCount={473}
        followingCount={1}
        starredReposCount={0}
        initialTab={tab}
      />
    </ApolloProvider>
  );
  const view = render(tabs("open_ledger"));
  const tryAgain = () => screen.getByRole("button", { name: "Try again" });
  const failed = () => screen.queryByText("Could not load this list.");
  return {
    requests,
    tryAgain,
    failed,
    user: userEvent.setup(),
    showProfile: (username: string) => view.rerender(tabs(username)),
  };
}

describe.each(lists)("$tab first-page retry", (list) => {
  it("keeps a busy Try Again through a held retry, then keeps focus and recovers", async () => {
    const { requests, tryAgain, failed, user } = setup(list.tab);
    await waitFor(() => expect(requests).toHaveLength(1));
    await act(async () => requests[0].reject());
    expect(failed()).toBeInTheDocument();

    tryAgain().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(requests).toHaveLength(2));
    // Held: the explanation and its busy button stay; Enter sends nothing.
    expect(failed()).toBeInTheDocument();
    expect(tryAgain()).toHaveAttribute("aria-busy", "true");
    await user.keyboard("{Enter}");
    expect(requests).toHaveLength(2);

    await act(async () => requests[1].reject());
    await waitFor(() => expect(tryAgain()).toBeEnabled());
    expect(tryAgain()).toHaveFocus();
    expect(failed()).toBeInTheDocument();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(requests).toHaveLength(3));
    await act(async () => requests[2].resolve(list.page()));
    expect(await screen.findByText(list.shows)).toBeInTheDocument();
    expect(failed()).toBeNull();

    // Every attempt read the same list, profile and first page.
    for (const request of requests) {
      expect(request.operation).toBe(list.operation);
      expect(request.variables).toEqual({
        username: "open_ledger",
        page: 1,
        limit: 20,
      });
    }
  });

  it("drops the old failure when the profile changes during a retry", async () => {
    const { requests, tryAgain, failed, user, showProfile } = setup(list.tab);
    await waitFor(() => expect(requests).toHaveLength(1));
    await act(async () => requests[0].reject());
    await user.click(tryAgain());
    await waitFor(() => expect(requests).toHaveLength(2));

    showProfile("qa-other");
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2].variables).toEqual({
      username: "qa-other",
      page: 1,
      limit: 20,
    });
    expect(failed()).toBeNull();

    // The abandoned retry settling says nothing about the new profile.
    await act(async () => requests[1].reject());
    expect(failed()).toBeNull();
    await act(async () => requests[2].resolve(list.page()));
    expect(await screen.findByText(list.shows)).toBeInTheDocument();
  });
});
