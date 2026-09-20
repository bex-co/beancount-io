import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfileTabs } from "../user-profile-tabs";

/**
 * A failed first read is not an empty list. Each social tab must say the list
 * could not be loaded and offer a working retry, and must keep its "nothing
 * here yet" message for a read that genuinely succeeded with no rows.
 */

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => (
    <a href={`${to}/${params?.username ?? ""}`} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useRouter: () => ({
    state: {
      matches: [
        { routeId: "/ledger/$username", params: { username: "testuser" } },
      ],
      pendingMatches: undefined,
    },
  }),
  useSearch: () => ({}),
}));

const followers = {
  followers: [] as Array<{
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    bio: string | null;
  }>,
  total: 0,
  loading: false,
  loadingMore: false,
  hasMore: false,
  error: null as Error | null,
  loadMoreError: null as Error | null,
  loadMore: vi.fn(),
  retryLoadMore: vi.fn(),
  refetch: vi.fn(),
};
const following = { ...followers, following: followers.followers };
const starred = {
  ...followers,
  starredRepos: [] as Array<{
    name: string;
    fullName: string;
    description: string | null;
    isPrivate: boolean;
    updatedAt: string;
    starsCount: number | null;
  }>,
};

vi.mock("../../hooks/use-user-followers", () => ({
  useUserFollowers: () => followers,
}));
vi.mock("../../hooks/use-user-following", () => ({
  useUserFollowing: () => following,
}));
vi.mock("../../hooks/use-user-starred-repos", () => ({
  useUserStarredRepos: () => starred,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) =>
      ({
        "userProfile.tabs.overview": "Ledgers",
        "userProfile.tabs.followers": "Followers",
        "userProfile.tabs.following": "Following",
        "userProfile.tabs.starred": "Starred",
        "userProfile.noFollowers": "No followers yet",
        "userProfile.noFollowing": "Not following anyone yet",
        "userProfile.noStarredRepos": "No starred repositories",
        "userProfile.listLoadError": "Could not load this list.",
        "userProfile.loadMoreError": "Could not load more results.",
        "common.tryAgain": "Try again",
      })[key] ?? key,
  }),
}));

function reset<T extends Record<string, unknown>>(
  target: T,
  rows: unknown[] = [],
) {
  Object.assign(target, {
    total: 0,
    loading: false,
    loadingMore: false,
    hasMore: false,
    error: null,
    loadMoreError: null,
  });
  if ("followers" in target) target.followers = rows;
  if ("following" in target) target.following = rows;
  if ("starredRepos" in target) target.starredRepos = rows;
}

beforeEach(() => {
  vi.clearAllMocks();
  reset(followers);
  reset(following);
  reset(starred);
});

function renderTabs(tab: string) {
  return render(
    <UserProfileTabs
      username="testuser"
      activities={[]}
      repositories={[]}
      followersCount={142}
      followingCount={1}
      starredReposCount={0}
      initialTab={tab}
    />,
  );
}

const cases = [
  {
    tab: "followers",
    state: followers,
    rowsKey: "followers" as const,
    empty: "No followers yet",
    row: {
      username: "alice",
      fullName: "Alice",
      avatarUrl: null,
      bio: null,
    },
  },
  {
    tab: "following",
    state: following,
    rowsKey: "following" as const,
    empty: "Not following anyone yet",
    row: { username: "bob", fullName: "Bob", avatarUrl: null, bio: null },
  },
  {
    tab: "starred",
    state: starred,
    rowsKey: "starredRepos" as const,
    empty: "No starred repositories",
    row: {
      name: "books",
      fullName: "carol/books",
      description: null,
      isPrivate: false,
      updatedAt: new Date("2026-01-01T00:00:00Z").toISOString(),
      starsCount: 1,
    },
  },
];

describe.each(cases)("$tab tab first-page failure", (testCase) => {
  it("reports the failure instead of an empty list", () => {
    (testCase.state as Record<string, unknown>).error = new Error("network");
    renderTabs(testCase.tab);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load this list.",
    );
    expect(screen.queryByText(testCase.empty)).not.toBeInTheDocument();
  });

  it("retries the same list and then shows the rows", async () => {
    const user = userEvent.setup();
    const state = testCase.state as Record<string, unknown>;
    state.error = new Error("network");
    const { rerender } = renderTabs(testCase.tab);

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(testCase.state.refetch).toHaveBeenCalledTimes(1);

    // The retry succeeds.
    state.error = null;
    (state as Record<string, unknown>)[testCase.rowsKey] = [testCase.row];
    rerender(
      <UserProfileTabs
        username="testuser"
        activities={[]}
        repositories={[]}
        followersCount={142}
        followingCount={1}
        starredReposCount={0}
        initialTab={testCase.tab}
      />,
    );

    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(testCase.empty)).not.toBeInTheDocument();
  });

  it("keeps the empty message for a read that succeeded with no rows", () => {
    renderTabs(testCase.tab);

    expect(screen.getByText(testCase.empty)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("can be retried from the keyboard", async () => {
    const user = userEvent.setup();
    (testCase.state as Record<string, unknown>).error = new Error("network");
    renderTabs(testCase.tab);

    const retry = screen.getByRole("button", { name: "Try again" });
    retry.focus();
    expect(retry).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(testCase.state.refetch).toHaveBeenCalledTimes(1);
  });

  it("still reports a continuation failure separately", () => {
    const state = testCase.state as Record<string, unknown>;
    state[testCase.rowsKey] = [testCase.row];
    state.loadMoreError = new Error("network");
    renderTabs(testCase.tab);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load more results.",
    );
  });
});
