import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfileTabs } from "../user-profile-tabs";
import type {
  UserActivityFeedItem,
  UserRepository,
} from "@/graphql/definitions";

// Mock TanStack Router
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, ...props }: any) => (
    <a
      href={`${to}/${params?.ledgerOwner || params?.username || ""}/${params?.ledgerName || ""}`}
      {...props}
    >
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  // The ledger collection reads its list state (q/sort/show) from the profile
  // route's search params.
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

describe("UserProfileTabs", () => {
  const mockActivities: UserActivityFeedItem[] = [
    {
      id: "1",
      content: "Created a new ledger",
      repoName: "my-ledger",
      createdAt: new Date("2024-01-15T10:00:00Z").toISOString(),
    },
  ];

  const mockRepositories: UserRepository[] = [
    {
      name: "my-ledger",
      fullName: "testuser/my-ledger",
      description: "Personal finance tracking",
      isPrivate: false,
      updatedAt: new Date("2024-01-15T10:00:00Z").toISOString(),
      starsCount: 5,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFollowersResult.followers = [];
    mockFollowersResult.total = 0;
    mockFollowersResult.loading = false;
    mockFollowersResult.loadingMore = false;
    mockFollowersResult.hasMore = false;
    mockFollowersResult.error = null;
    mockFollowersResult.loadMoreError = null;

    mockFollowingResult.following = [];
    mockFollowingResult.total = 0;
    mockFollowingResult.loading = false;
    mockFollowingResult.loadingMore = false;
    mockFollowingResult.hasMore = false;
    mockFollowingResult.error = null;
    mockFollowingResult.loadMoreError = null;

    mockStarredReposResult.starredRepos = [];
    mockStarredReposResult.total = 0;
    mockStarredReposResult.loading = false;
    mockStarredReposResult.loadingMore = false;
    mockStarredReposResult.hasMore = false;
    mockStarredReposResult.error = null;
    mockStarredReposResult.loadMoreError = null;
  });

  describe("Tab Rendering", () => {
    it("should render all tabs", () => {
      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={10}
          followingCount={20}
          starredReposCount={5}
        />,
      );

      expect(screen.getByRole("tab", { name: "Ledgers" })).toBeInTheDocument();
      expect(screen.getByText(/Followers \(10\)/)).toBeInTheDocument();
      expect(screen.getByText(/Following \(20\)/)).toBeInTheDocument();
      expect(screen.getByText(/Starred \(5\)/)).toBeInTheDocument();
    });

    it("should show overview tab by default", () => {
      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /^Ledgers/ }),
      ).toBeInTheDocument();
    });

    it("should display counts in tab labels", () => {
      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={42}
          followingCount={128}
          starredReposCount={15}
        />,
      );

      expect(screen.getByText(/Followers \(42\)/)).toBeInTheDocument();
      expect(screen.getByText(/Following \(128\)/)).toBeInTheDocument();
      expect(screen.getByText(/Starred \(15\)/)).toBeInTheDocument();
    });
  });

  describe("Tab Switching", () => {
    it("should switch to followers tab when clicked", async () => {
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const followersTab = screen.getByText(/Followers/);
      await user.click(followersTab);

      await waitFor(() => {
        expect(screen.getByText("No followers yet")).toBeInTheDocument();
      });
    });

    it("should switch to following tab when clicked", async () => {
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const followingTab = screen.getByText(/Following/);
      await user.click(followingTab);

      await waitFor(() => {
        expect(
          screen.getByText("Not following anyone yet"),
        ).toBeInTheDocument();
      });
    });

    it("should switch to starred tab when clicked", async () => {
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const starredTab = screen.getByText(/Starred/);
      await user.click(starredTab);

      await waitFor(() => {
        expect(screen.getByText("No starred repositories")).toBeInTheDocument();
      });
    });
  });

  describe("Overview Tab", () => {
    it("should display recent activities", () => {
      render(
        <UserProfileTabs
          username="testuser"
          activities={mockActivities}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      expect(
        screen.getByRole("link", { name: "Created a new ledger" }),
      ).toHaveAttribute("href", expect.stringContaining("testuser/my-ledger"));
    });

    it("should display repositories", () => {
      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={mockRepositories}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      expect(screen.getByText("my-ledger")).toBeInTheDocument();
      expect(screen.getByText("Personal finance tracking")).toBeInTheDocument();
    });

    it("should show empty state when no activities", () => {
      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      expect(screen.getByText("No recent activity")).toBeInTheDocument();
    });

    it("should show empty state when no repositories", () => {
      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      expect(screen.getByText("No repositories")).toBeInTheDocument();
    });

    it("should let visitors reveal repositories beyond the first page", async () => {
      const user = userEvent.setup();
      const manyRepos: UserRepository[] = Array.from(
        { length: 15 },
        (_, i) => ({
          name: `repo-${i}`,
          fullName: `testuser/repo-${i}`,
          description: `Repo ${i}`,
          isPrivate: false,
          updatedAt: new Date().toISOString(),
          starsCount: i,
        }),
      );

      const { container } = render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={manyRepos}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      expect(container.querySelectorAll('a[href*="/ledger/"]')).toHaveLength(
        12,
      );
      await user.click(
        screen.getByRole("button", { name: "userProfile.showMoreLedgers" }),
      );

      // The revealed count is profile URL state (so Back restores it), so the
      // reveal is a replace navigation rather than local state. The rendered
      // result of that navigation is covered in ledger-collection.test.tsx.
      const navigation = mockNavigate.mock.calls.at(-1)?.[0];
      expect(navigation).toMatchObject({ to: ".", replace: true });
      expect(navigation.search({ tab: "overview" })).toEqual({
        tab: "overview",
        show: 24,
      });
    });
  });

  it("keeps activity compact and lets visitors expand and collapse the timeline", async () => {
    const user = userEvent.setup();
    const activities = Array.from({ length: 7 }, (_, index) => ({
      id: String(index),
      type: "commit_repo",
      content: `Update ${index}`,
      repoName: "shared",
      repoFullName: "another-owner/shared",
      createdAt: `2026-01-0${index + 1}T00:00:00Z`,
    }));
    render(
      <UserProfileTabs
        username="testuser"
        activities={activities}
        repositories={[]}
        followersCount={0}
        followingCount={0}
        starredReposCount={0}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.queryByText("Update 0")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Update 6" })).toHaveAttribute(
      "href",
      expect.stringContaining("another-owner/shared"),
    );
    await user.click(
      screen.getByRole("button", { name: "userProfile.showAllActivity" }),
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(
      screen.getByRole("button", { name: "userProfile.showLessActivity" }),
    ).toHaveAttribute("aria-expanded", "true");
    await user.click(
      screen.getByRole("button", { name: "userProfile.showLessActivity" }),
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  describe("Followers Tab", () => {
    it("should show loading state", async () => {
      mockFollowersResult.loading = true;
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const followersTab = screen.getByText(/Followers/);
      await user.click(followersTab);

      await waitFor(() => {
        const spinner = document.querySelector(".animate-spin");
        expect(spinner).toBeInTheDocument();
      });
    });

    it("should show empty state when no followers", async () => {
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const followersTab = screen.getByText(/Followers/);
      await user.click(followersTab);

      await waitFor(() => {
        expect(screen.getByText("No followers yet")).toBeInTheDocument();
      });
    });

    it("should display followers when loaded", async () => {
      mockFollowersResult.followers = [
        {
          username: "follower1",
          fullName: "Follower One",
          avatarUrl: "https://example.com/avatar.jpg",
          bio: "Test bio",
        },
      ];

      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={1}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const followersTab = screen.getByText(/Followers/);
      await user.click(followersTab);

      await waitFor(() => {
        expect(screen.getByText("Follower One")).toBeInTheDocument();
        expect(screen.getByText("@follower1")).toBeInTheDocument();
      });
    });
  });

  describe("Following Tab", () => {
    it("should show loading state", async () => {
      mockFollowingResult.loading = true;
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const followingTab = screen.getByText(/Following/);
      await user.click(followingTab);

      await waitFor(() => {
        const spinner = document.querySelector(".animate-spin");
        expect(spinner).toBeInTheDocument();
      });
    });

    it("should show empty state when not following anyone", async () => {
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const followingTab = screen.getByText(/Following/);
      await user.click(followingTab);

      await waitFor(() => {
        expect(
          screen.getByText("Not following anyone yet"),
        ).toBeInTheDocument();
      });
    });

    it("should display following users when loaded", async () => {
      mockFollowingResult.following = [
        {
          username: "following1",
          fullName: "Following One",
          avatarUrl: "https://example.com/avatar.jpg",
          bio: "Test bio",
        },
      ];

      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={1}
          starredReposCount={0}
        />,
      );

      const followingTab = screen.getByText(/Following/);
      await user.click(followingTab);

      await waitFor(() => {
        expect(screen.getByText("Following One")).toBeInTheDocument();
        expect(screen.getByText("@following1")).toBeInTheDocument();
      });
    });
  });

  describe("Starred Tab", () => {
    it("should show loading state", async () => {
      mockStarredReposResult.loading = true;
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const starredTab = screen.getByText(/Starred/);
      await user.click(starredTab);

      await waitFor(() => {
        const spinner = document.querySelector(".animate-spin");
        expect(spinner).toBeInTheDocument();
      });
    });

    it("should show empty state when no starred repos", async () => {
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const starredTab = screen.getByText(/Starred/);
      await user.click(starredTab);

      await waitFor(() => {
        expect(screen.getByText("No starred repositories")).toBeInTheDocument();
      });
    });

    it("should display starred repos when loaded", async () => {
      mockStarredReposResult.starredRepos = [
        {
          name: "starred-repo",
          fullName: "owner/starred-repo",
          description: "A starred repository",
          isPrivate: false,
          updatedAt: new Date("2024-01-15T10:00:00Z").toISOString(),
          starsCount: 42,
        },
      ];

      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={1}
        />,
      );

      const starredTab = screen.getByText(/Starred/);
      await user.click(starredTab);

      await waitFor(() => {
        expect(screen.getByText("starred-repo")).toBeInTheDocument();
        expect(screen.getByText("A starred repository")).toBeInTheDocument();
      });
    });
  });

  describe("Grid Layouts", () => {
    it("should use correct grid layout for overview", () => {
      const { container } = render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const overviewGrid = container.querySelector(
        ".grid.grid-cols-1.items-start",
      );
      expect(overviewGrid).toBeInTheDocument();
    });

    it("should use correct grid layout for followers", async () => {
      mockFollowersResult.followers = [
        {
          username: "follower1",
          fullName: "Follower One",
          avatarUrl: null,
          bio: null,
        },
      ];

      const user = userEvent.setup();
      const { container } = render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={1}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const followersTab = screen.getByText(/Followers/);
      await user.click(followersTab);

      await waitFor(() => {
        const grid = container.querySelector(
          ".grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3",
        );
        expect(grid).toBeInTheDocument();
      });
    });

    it("should use correct grid layout for starred", async () => {
      mockStarredReposResult.starredRepos = [
        {
          name: "repo1",
          fullName: "user/repo1",
          description: "Test",
          isPrivate: false,
          updatedAt: new Date().toISOString(),
          starsCount: 1,
        },
      ];

      const user = userEvent.setup();
      const { container } = render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={1}
        />,
      );

      const starredTab = screen.getByText(/Starred/);
      await user.click(starredTab);

      await waitFor(() => {
        const grid = container.querySelector(
          ".grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3",
        );
        expect(grid).toBeInTheDocument();
      });
    });
  });

  describe("URL Navigation Integration", () => {
    it("should respect initialTab prop and show starred tab", () => {
      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
          initialTab="starred"
        />,
      );

      // Should show starred tab content immediately
      expect(screen.getByText("No starred repositories")).toBeInTheDocument();
    });

    it("should respect initialTab prop and show followers tab", () => {
      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
          initialTab="followers"
        />,
      );

      // Should show followers tab content immediately
      expect(screen.getByText("No followers yet")).toBeInTheDocument();
    });

    it("should respect initialTab prop and show following tab", () => {
      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
          initialTab="following"
        />,
      );

      // Should show following tab content immediately
      expect(screen.getByText("Not following anyone yet")).toBeInTheDocument();
    });

    it("should default to overview tab when initialTab is not provided", () => {
      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      // Should show overview tab content
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /^Ledgers/ }),
      ).toBeInTheDocument();
    });

    it("should call navigate with correct params when clicking starred tab", async () => {
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const starredTab = screen.getByText(/Starred/);
      await user.click(starredTab);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: ".",
          search: { tab: "starred" },
          replace: true,
        });
      });
    });

    it("should call navigate with correct params when clicking followers tab", async () => {
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const followersTab = screen.getByText(/Followers/);
      await user.click(followersTab);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: ".",
          search: { tab: "followers" },
          replace: true,
        });
      });
    });

    it("should call navigate with correct params when clicking following tab", async () => {
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const followingTab = screen.getByText(/Following/);
      await user.click(followingTab);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: ".",
          search: { tab: "following" },
          replace: true,
        });
      });
    });

    it("should call navigate with correct params when clicking overview tab", async () => {
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
          initialTab="starred"
        />,
      );

      const overviewTab = screen.getByRole("tab", { name: "Ledgers" });
      await user.click(overviewTab);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: ".",
          search: { tab: "overview" },
          replace: true,
        });
      });
    });

    it("should update active tab when initialTab prop changes", () => {
      const { rerender } = render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
          initialTab="overview"
        />,
      );

      // Initially shows overview
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();

      // Update initialTab prop (simulating URL change)
      rerender(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
          initialTab="starred"
        />,
      );

      // Should now show starred tab
      expect(screen.getByText("No starred repositories")).toBeInTheDocument();
    });

    it("should use replace: true to avoid polluting browser history", async () => {
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const starredTab = screen.getByText(/Starred/);
      await user.click(starredTab);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.objectContaining({
            replace: true,
          }),
        );
      });
    });

    it("should navigate to correct route with relative path", async () => {
      const user = userEvent.setup();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
        />,
      );

      const followingTab = screen.getByText(/Following/);
      await user.click(followingTab);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.objectContaining({
            to: ".",
          }),
        );
      });
    });

    it("should not call navigate on initial render", () => {
      mockNavigate.mockClear();

      render(
        <UserProfileTabs
          username="testuser"
          activities={[]}
          repositories={[]}
          followersCount={0}
          followingCount={0}
          starredReposCount={0}
          initialTab="starred"
        />,
      );

      // Navigate should not be called on mount, only on tab clicks
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
