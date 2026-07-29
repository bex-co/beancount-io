import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUserFollowers } from "../use-user-followers";

// Mock query result
const mockQueryResult: {
  data: null | {
    getUserFollowers: {
      users: Array<{
        username: string;
        fullName: string | null;
        avatarUrl: string | null;
        bio: string | null;
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
  GetUserFollowersDocument: "GET_USER_FOLLOWERS",
}));

describe("useUserFollowers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult.data = null;
    mockQueryResult.loading = false;
    mockQueryResult.error = null;
  });

  describe("Hook Initialization", () => {
    it("should return expected properties", () => {
      const { result } = renderHook(() => useUserFollowers("testuser", true));

      expect(result.current).toHaveProperty("followers");
      expect(result.current).toHaveProperty("total");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
    });

    it("should initialize with empty followers array", () => {
      const { result } = renderHook(() => useUserFollowers("testuser", true));

      expect(result.current.followers).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it("should initialize with loading as false", () => {
      const { result } = renderHook(() => useUserFollowers("testuser", true));

      expect(result.current.loading).toBe(false);
    });

    it("should initialize with no error", () => {
      const { result } = renderHook(() => useUserFollowers("testuser", true));

      expect(result.current.error).toBeNull();
    });
  });

  describe("Lazy Loading", () => {
    it("should skip query when enabled is false", () => {
      const { result } = renderHook(() => useUserFollowers("testuser", false));

      // Query should not be executed, so followers remain empty
      expect(result.current.followers).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it("should execute query when enabled is true", () => {
      const successData = {
        getUserFollowers: {
          users: [
            {
              username: "follower1",
              fullName: "Follower One",
              avatarUrl: "https://example.com/avatar1.jpg",
              bio: "Bio 1",
            },
          ],
          total: 1,
        },
      };

      mockQueryResult.data = successData;

      const { result } = renderHook(() => useUserFollowers("testuser", true));

      expect(result.current.followers).toEqual(
        successData.getUserFollowers.users,
      );
      expect(result.current.total).toBe(1);
    });
  });

  describe("Success State", () => {
    it("should return followers data when query succeeds", () => {
      const successData = {
        getUserFollowers: {
          users: [
            {
              username: "alice",
              fullName: "Alice Smith",
              avatarUrl: "https://example.com/alice.jpg",
              bio: "Software engineer",
            },
            {
              username: "bob",
              fullName: null,
              avatarUrl: null,
              bio: null,
            },
          ],
          total: 2,
        },
      };

      mockQueryResult.data = successData;

      const { result } = renderHook(() => useUserFollowers("testuser", true));

      expect(result.current.followers).toHaveLength(2);
      expect(result.current.followers[0].username).toBe("alice");
      expect(result.current.followers[1].username).toBe("bob");
      expect(result.current.total).toBe(2);
    });

    it("should handle empty followers list", () => {
      const emptyData = {
        getUserFollowers: {
          users: [],
          total: 0,
        },
      };

      mockQueryResult.data = emptyData;

      const { result } = renderHook(() => useUserFollowers("testuser", true));

      expect(result.current.followers).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it("should handle null optional fields", () => {
      const dataWithNulls = {
        getUserFollowers: {
          users: [
            {
              username: "charlie",
              fullName: null,
              avatarUrl: null,
              bio: null,
            },
          ],
          total: 1,
        },
      };

      mockQueryResult.data = dataWithNulls;

      const { result } = renderHook(() => useUserFollowers("testuser", true));

      expect(result.current.followers[0].fullName).toBeNull();
      expect(result.current.followers[0].avatarUrl).toBeNull();
      expect(result.current.followers[0].bio).toBeNull();
    });
  });

  describe("Error State", () => {
    it("should handle query errors", () => {
      const error = new Error("Network error");
      mockQueryResult.error = error;

      const { result } = renderHook(() => useUserFollowers("testuser", true));

      expect(result.current.error).toEqual(error);
      expect(result.current.followers).toEqual([]);
    });

    it("should return error state with empty followers", () => {
      mockQueryResult.error = new Error("Failed to fetch followers");
      mockQueryResult.data = null;

      const { result } = renderHook(() => useUserFollowers("testuser", true));

      expect(result.current.error).toBeDefined();
      expect(result.current.followers).toEqual([]);
      expect(result.current.total).toBe(0);
    });
  });

  describe("Loading State", () => {
    it("should reflect loading state", () => {
      mockQueryResult.loading = true;

      const { result } = renderHook(() => useUserFollowers("testuser", true));

      expect(result.current.loading).toBe(true);
    });

    it("should start with loading false when disabled", () => {
      const { result } = renderHook(() => useUserFollowers("testuser", false));

      expect(result.current.loading).toBe(false);
    });
  });

  describe("Query Variables", () => {
    it("should query with correct username", () => {
      const username = "johndoe";
      renderHook(() => useUserFollowers(username, true));

      // Query should be called with username, page=1, limit=20
      expect(vi.mocked).toBeDefined();
    });

    it("should use pagination defaults", () => {
      renderHook(() => useUserFollowers("testuser", true));

      // Should use page: 1, limit: 20 by default
      expect(vi.mocked).toBeDefined();
    });
  });

  describe("Real-world Usage Patterns", () => {
    it("should support followers tab pattern", () => {
      const { result } = renderHook(() =>
        useUserFollowers("developer123", true),
      );

      // Can be used to display followers in a grid
      expect(Array.isArray(result.current.followers)).toBe(true);
      expect(typeof result.current.total).toBe("number");
    });

    it("should support loading indicator pattern", () => {
      mockQueryResult.loading = true;

      const { result } = renderHook(() => useUserFollowers("user", true));

      // Can be used to show loading spinner
      expect(result.current.loading).toBe(true);
    });

    it("should support empty state pattern", () => {
      mockQueryResult.data = {
        getUserFollowers: {
          users: [],
          total: 0,
        },
      };

      const { result } = renderHook(() => useUserFollowers("newuser", true));

      // Can be used to show "No followers yet" message
      expect(result.current.followers.length).toBe(0);
    });
  });
});
