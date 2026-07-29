import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUserProfile } from "../use-user-profile";
import { NetworkStatus } from "@apollo/client";

// Mock query result state
const mockQueryResult: {
  data: null | {
    getUserProfile: {
      isFollowing: boolean | null;
      profile: { username: string; fullName: string | null } | null;
      activities: unknown[];
      repositories: unknown[];
    } | null;
  };
  loading: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
  networkStatus: NetworkStatus;
} = {
  data: null,
  loading: false,
  error: null,
  refetch: vi.fn(),
  networkStatus: NetworkStatus.ready,
};

vi.mock("@apollo/client/react", () => ({
  useQuery: () => mockQueryResult,
}));

vi.mock("@apollo/client", () => ({
  NetworkStatus: {
    loading: 1,
    refetch: 4,
    ready: 7,
  },
}));

vi.mock("@/graphql/definitions", () => ({
  GetUserProfileDocument: "GET_USER_PROFILE",
}));

describe("useUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult.data = null;
    mockQueryResult.loading = false;
    mockQueryResult.error = null;
    mockQueryResult.networkStatus = NetworkStatus.ready;
    mockQueryResult.refetch = vi.fn();
  });

  describe("Hook initialization", () => {
    it("should return expected properties", () => {
      const { result } = renderHook(() => useUserProfile("testuser"));
      expect(result.current).toHaveProperty("profile");
      expect(result.current).toHaveProperty("isFollowing");
      expect(result.current).toHaveProperty("activities");
      expect(result.current).toHaveProperty("repositories");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("isInitialLoading");
      expect(result.current).toHaveProperty("isRefetching");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("refetch");
    });

    it("should return null profile when no data", () => {
      const { result } = renderHook(() => useUserProfile("testuser"));
      expect(result.current.profile).toBeNull();
    });

    it("should return empty arrays when no data", () => {
      const { result } = renderHook(() => useUserProfile("testuser"));
      expect(result.current.activities).toEqual([]);
      expect(result.current.repositories).toEqual([]);
    });

    it("should return undefined isFollowing when no data", () => {
      const { result } = renderHook(() => useUserProfile("testuser"));
      expect(result.current.isFollowing).toBeUndefined();
    });
  });

  describe("Success state", () => {
    it("should return profile data when available", () => {
      mockQueryResult.data = {
        getUserProfile: {
          isFollowing: false,
          profile: { username: "alice", fullName: "Alice Smith" },
          activities: [],
          repositories: [],
        },
      };

      const { result } = renderHook(() => useUserProfile("alice"));
      expect(result.current.profile).toEqual({
        username: "alice",
        fullName: "Alice Smith",
      });
    });

    it("should return isFollowing=true when following", () => {
      mockQueryResult.data = {
        getUserProfile: {
          isFollowing: true,
          profile: { username: "bob", fullName: null },
          activities: [],
          repositories: [],
        },
      };

      const { result } = renderHook(() => useUserProfile("bob"));
      expect(result.current.isFollowing).toBe(true);
    });

    it("should return isFollowing=false when not following", () => {
      mockQueryResult.data = {
        getUserProfile: {
          isFollowing: false,
          profile: { username: "charlie", fullName: null },
          activities: [],
          repositories: [],
        },
      };

      const { result } = renderHook(() => useUserProfile("charlie"));
      expect(result.current.isFollowing).toBe(false);
    });

    it("should return undefined isFollowing when null", () => {
      mockQueryResult.data = {
        getUserProfile: {
          isFollowing: null,
          profile: null,
          activities: [],
          repositories: [],
        },
      };

      const { result } = renderHook(() => useUserProfile("dave"));
      expect(result.current.isFollowing).toBeUndefined();
    });

    it("should return activities when present", () => {
      const activities = [{ id: "1" }, { id: "2" }];
      mockQueryResult.data = {
        getUserProfile: {
          isFollowing: false,
          profile: null,
          activities,
          repositories: [],
        },
      };

      const { result } = renderHook(() => useUserProfile("user"));
      expect(result.current.activities).toEqual(activities);
    });

    it("should return repositories when present", () => {
      const repos = [{ id: "repo-1", name: "my-ledger" }];
      mockQueryResult.data = {
        getUserProfile: {
          isFollowing: false,
          profile: null,
          activities: [],
          repositories: repos,
        },
      };

      const { result } = renderHook(() => useUserProfile("user"));
      expect(result.current.repositories).toEqual(repos);
    });
  });

  describe("Error state", () => {
    it("should return error when query fails", () => {
      const error = new Error("Failed to fetch profile");
      mockQueryResult.error = error;

      const { result } = renderHook(() => useUserProfile("testuser"));
      expect(result.current.error).toEqual(error);
    });
  });

  describe("Loading state", () => {
    it("should reflect loading state", () => {
      mockQueryResult.loading = true;

      const { result } = renderHook(() => useUserProfile("testuser"));
      expect(result.current.loading).toBe(true);
    });

    it("should detect initial loading from NetworkStatus.loading", () => {
      mockQueryResult.networkStatus = NetworkStatus.loading;

      const { result } = renderHook(() => useUserProfile("testuser"));
      expect(result.current.isInitialLoading).toBe(true);
      expect(result.current.isRefetching).toBe(false);
    });

    it("should detect refetching from NetworkStatus.refetch", () => {
      mockQueryResult.networkStatus = NetworkStatus.refetch;

      const { result } = renderHook(() => useUserProfile("testuser"));
      expect(result.current.isRefetching).toBe(true);
      expect(result.current.isInitialLoading).toBe(false);
    });

    it("should have neither isInitialLoading nor isRefetching when ready", () => {
      mockQueryResult.networkStatus = NetworkStatus.ready;

      const { result } = renderHook(() => useUserProfile("testuser"));
      expect(result.current.isInitialLoading).toBe(false);
      expect(result.current.isRefetching).toBe(false);
    });
  });

  describe("refetch function", () => {
    it("should expose the refetch function", () => {
      const { result } = renderHook(() => useUserProfile("testuser"));
      expect(typeof result.current.refetch).toBe("function");
    });
  });

  describe("Empty username handling", () => {
    it("should not crash with empty username", () => {
      expect(() => renderHook(() => useUserProfile(""))).not.toThrow();
    });
  });
});
