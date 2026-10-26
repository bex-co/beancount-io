import { act, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { UserProfileTabs } from "../user-profile-tabs";

/**
 * Profile tabs select from client state: a tab activated before hydration
 * attaches its handler stayed on Ledgers and was not replayed (w4/1107). The
 * tabs are disabled in server markup, keep the requested selection and its
 * content, and select on the first activation once hydrated. Real SSR markup,
 * real hydration.
 */

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  // The real useHydrated: false on the server and through hydration's first
  // pass, true once hydrated.
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#">{children}</a>
  ),
  useNavigate: () => mockNavigate,
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

// Mock hook results
const mockFollowersResult = {
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
  error: null,
  loadMoreError: null,
  loadMore: vi.fn(),
  retryLoadMore: vi.fn(),
};

const mockFollowingResult = {
  following: [] as Array<{
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    bio: string | null;
  }>,
  total: 0,
  loading: false,
  loadingMore: false,
  hasMore: false,
  error: null,
  loadMoreError: null,
  loadMore: vi.fn(),
  retryLoadMore: vi.fn(),
};

const mockStarredReposResult = {
  starredRepos: [] as Array<{
    name: string;
    fullName: string;
    description: string | null;
    isPrivate: boolean;
    updatedAt: string;
    starsCount: number | null;
  }>,
  total: 0,
  loading: false,
  loadingMore: false,
  hasMore: false,
  error: null,
  loadMoreError: null,
  loadMore: vi.fn(),
  retryLoadMore: vi.fn(),
};

// Mock hooks
vi.mock("../../hooks/use-user-followers", () => ({
  useUserFollowers: () => mockFollowersResult,
}));

vi.mock("../../hooks/use-user-following", () => ({
  useUserFollowing: () => mockFollowingResult,
}));

vi.mock("../../hooks/use-user-starred-repos", () => ({
  useUserStarredRepos: () => mockStarredReposResult,
}));

// Mock useTranslations hook
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "userProfile.tabs.overview": "Ledgers",
        "userProfile.tabs.followers": "Followers",
        "userProfile.tabs.following": "Following",
        "userProfile.tabs.starred": "Starred",
        "userProfile.recentActivity": "Recent Activity",
        "userProfile.noActivity": "No recent activity",
        "userProfile.repositories": "Ledgers",
        "userProfile.noRepositories": "No repositories",
        "userProfile.private": "Private",
        "userProfile.public": "Public",
        "userProfile.updated": "Updated",
        "userProfile.noFollowers": "No followers yet",
        "userProfile.noFollowing": "Not following anyone yet",
        "userProfile.noStarredRepos": "No starred repositories",
        "userProfile.showMore": "Show more",
        "userProfile.loadMoreError": "Could not load more results.",
        "common.tryAgain": "Try again",
      };
      return translations[key] || key;
    },
  }),
}));

describe("profile tabs before and after hydration", () => {
  it("are unavailable in server markup and select Followers once hydrated", async () => {
    const view = (
      <UserProfileTabs
        username="testuser"
        activities={[]}
        repositories={[]}
        followersCount={10}
        followingCount={20}
        starredReposCount={5}
      />
    );
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(view);
    const tabs = [
      ...container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ];
    const followers = tabs.find((tab) =>
      tab.textContent?.startsWith("Followers"),
    )!;

    expect(tabs).toHaveLength(4);
    tabs.forEach((tab) => expect(tab).toBeDisabled());
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    const recoverable = vi.fn();
    await act(async () => {
      hydrateRoot(container, view, { onRecoverableError: recoverable });
    });
    await waitFor(() => expect(followers).toBeEnabled());
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    // Radix tabs select on mousedown.
    await act(async () => {
      followers.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, button: 0 }),
      );
    });
    expect(followers).toHaveAttribute("aria-selected", "true");
    expect(mockNavigate).toHaveBeenCalled();
    expect(recoverable).not.toHaveBeenCalled();
    container.remove();
  });
});
