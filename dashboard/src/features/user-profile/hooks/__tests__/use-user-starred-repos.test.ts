import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUserStarredRepos } from "../use-user-starred-repos";

// Mock query result
const mockQueryResult: {
  data: null | {
    getUserStarredRepos: {
      repositories: Array<{
        name: string;
        fullName: string;
        description: string | null;
        isPrivate: boolean;
        updatedAt: string;
        starsCount: number | null;
      }>;
      total: number;
    };
  };
  loading: boolean;
  error: Error | null;
} = {
  data: null,
  loading: false,
  error: null,
};

// Mock Apollo Client
vi.mock("@apollo/client/react", () => ({
  useQuery: () => mockQueryResult,
}));

vi.mock("@/graphql/definitions", () => ({
  GetUserStarredReposDocument: "GET_USER_STARRED_REPOS",
}));

describe("useUserStarredRepos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult.data = null;
    mockQueryResult.loading = false;
    mockQueryResult.error = null;
  });

  describe("Hook Initialization", () => {
    it("should return expected properties", () => {
      const { result } = renderHook(() =>
        useUserStarredRepos("testuser", true),
      );

      expect(result.current).toHaveProperty("starredRepos");
      expect(result.current).toHaveProperty("total");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
    });

    it("should initialize with empty starredRepos array", () => {
      const { result } = renderHook(() =>
        useUserStarredRepos("testuser", true),
      );

      expect(result.current.starredRepos).toEqual([]);
      expect(result.current.total).toBe(0);
    });
  });

  describe("Lazy Loading", () => {
    it("should skip query when enabled is false", () => {
      const { result } = renderHook(() =>
        useUserStarredRepos("testuser", false),
      );

      expect(result.current.starredRepos).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it("should execute query when enabled is true", () => {
      const successData = {
        getUserStarredRepos: {
          repositories: [
            {
              name: "awesome-repo",
              fullName: "owner/awesome-repo",
              description: "An awesome repository",
              isPrivate: false,
              updatedAt: "2024-01-15T10:00:00Z",
              starsCount: 42,
            },
          ],
          total: 1,
        },
      };

      mockQueryResult.data = successData;

      const { result } = renderHook(() =>
        useUserStarredRepos("testuser", true),
      );

      expect(result.current.starredRepos).toEqual(
        successData.getUserStarredRepos.repositories,
      );
      expect(result.current.total).toBe(1);
    });
  });

  describe("Success State", () => {
    it("should return starred repositories when query succeeds", () => {
      const successData = {
        getUserStarredRepos: {
          repositories: [
            {
              name: "beancount",
              fullName: "beancount/beancount",
              description: "Double-Entry Accounting from Text Files",
              isPrivate: false,
              updatedAt: "2024-01-20T15:30:00Z",
              starsCount: 1500,
            },
            {
              name: "private-repo",
              fullName: "user/private-repo",
              description: null,
              isPrivate: true,
              updatedAt: "2024-01-19T12:00:00Z",
              starsCount: null,
            },
          ],
          total: 2,
        },
      };

      mockQueryResult.data = successData;

      const { result } = renderHook(() =>
        useUserStarredRepos("testuser", true),
      );

      expect(result.current.starredRepos).toHaveLength(2);
      expect(result.current.starredRepos[0].name).toBe("beancount");
      expect(result.current.starredRepos[0].isPrivate).toBe(false);
      expect(result.current.starredRepos[1].isPrivate).toBe(true);
      expect(result.current.total).toBe(2);
    });

    it("should handle empty starred repos list", () => {
      const emptyData = {
        getUserStarredRepos: {
          repositories: [],
          total: 0,
        },
      };

      mockQueryResult.data = emptyData;

      const { result } = renderHook(() =>
        useUserStarredRepos("testuser", true),
      );

      expect(result.current.starredRepos).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it("should handle null optional fields", () => {
      const dataWithNulls = {
        getUserStarredRepos: {
          repositories: [
            {
              name: "minimal-repo",
              fullName: "user/minimal-repo",
              description: null,
              isPrivate: false,
              updatedAt: "2024-01-15T10:00:00Z",
              starsCount: null,
            },
          ],
          total: 1,
        },
      };

      mockQueryResult.data = dataWithNulls;

      const { result } = renderHook(() =>
        useUserStarredRepos("testuser", true),
      );

      expect(result.current.starredRepos[0].description).toBeNull();
      expect(result.current.starredRepos[0].starsCount).toBeNull();
    });
  });

  describe("Error State", () => {
    it("should handle query errors", () => {
      const error = new Error("Failed to fetch starred repos");
      mockQueryResult.error = error;

      const { result } = renderHook(() =>
        useUserStarredRepos("testuser", true),
      );

      expect(result.current.error).toEqual(error);
      expect(result.current.starredRepos).toEqual([]);
    });

    it("should return error state with empty repos", () => {
      mockQueryResult.error = new Error("Network error");
      mockQueryResult.data = null;

      const { result } = renderHook(() =>
        useUserStarredRepos("testuser", true),
      );

      expect(result.current.error).toBeDefined();
      expect(result.current.starredRepos).toEqual([]);
      expect(result.current.total).toBe(0);
    });
  });

  describe("Loading State", () => {
    it("should reflect loading state", () => {
      mockQueryResult.loading = true;

      const { result } = renderHook(() =>
        useUserStarredRepos("testuser", true),
      );

      expect(result.current.loading).toBe(true);
    });
  });

  describe("Repository Data", () => {
    it("should correctly handle public repositories", () => {
      const publicRepoData = {
        getUserStarredRepos: {
          repositories: [
            {
              name: "public-repo",
              fullName: "org/public-repo",
              description: "A public repository",
              isPrivate: false,
              updatedAt: "2024-01-15T10:00:00Z",
              starsCount: 100,
            },
          ],
          total: 1,
        },
      };

      mockQueryResult.data = publicRepoData;

      const { result } = renderHook(() =>
        useUserStarredRepos("testuser", true),
      );

      expect(result.current.starredRepos[0].isPrivate).toBe(false);
    });

    it("should correctly handle private repositories", () => {
      const privateRepoData = {
        getUserStarredRepos: {
          repositories: [
            {
              name: "secret-repo",
              fullName: "user/secret-repo",
              description: "Private repository",
              isPrivate: true,
              updatedAt: "2024-01-15T10:00:00Z",
              starsCount: 5,
            },
          ],
          total: 1,
        },
      };

      mockQueryResult.data = privateRepoData;

      const { result } = renderHook(() =>
        useUserStarredRepos("testuser", true),
      );

      expect(result.current.starredRepos[0].isPrivate).toBe(true);
    });

    it("should handle repos with various star counts", () => {
      const reposData = {
        getUserStarredRepos: {
          repositories: [
            {
              name: "popular-repo",
              fullName: "org/popular-repo",
              description: "Very popular",
              isPrivate: false,
              updatedAt: "2024-01-15T10:00:00Z",
              starsCount: 10000,
            },
            {
              name: "new-repo",
              fullName: "org/new-repo",
              description: "New repo with no stars",
              isPrivate: false,
              updatedAt: "2024-01-15T10:00:00Z",
              starsCount: 0,
            },
          ],
          total: 2,
        },
      };

      mockQueryResult.data = reposData;

      const { result } = renderHook(() =>
        useUserStarredRepos("testuser", true),
      );

      expect(result.current.starredRepos[0].starsCount).toBe(10000);
      expect(result.current.starredRepos[1].starsCount).toBe(0);
    });
  });

  describe("Real-world Usage Patterns", () => {
    it("should support starred repos tab pattern", () => {
      const { result } = renderHook(() =>
        useUserStarredRepos("developer123", true),
      );

      expect(Array.isArray(result.current.starredRepos)).toBe(true);
      expect(typeof result.current.total).toBe("number");
    });

    it("should support loading indicator pattern", () => {
      mockQueryResult.loading = true;

      const { result } = renderHook(() => useUserStarredRepos("user", true));

      expect(result.current.loading).toBe(true);
    });

    it("should support empty state pattern", () => {
      mockQueryResult.data = {
        getUserStarredRepos: {
          repositories: [],
          total: 0,
        },
      };

      const { result } = renderHook(() => useUserStarredRepos("newuser", true));

      expect(result.current.starredRepos.length).toBe(0);
    });
  });
});
