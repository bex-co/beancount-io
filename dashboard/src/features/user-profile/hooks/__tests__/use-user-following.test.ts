import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUserFollowing } from "../use-user-following";

// Mock query result
const mockQueryResult: {
  data: null | {
    getUserFollowing: {
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
  GetUserFollowingDocument: "GET_USER_FOLLOWING",
}));

describe("useUserFollowing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult.data = null;
    mockQueryResult.loading = false;
    mockQueryResult.error = null;
  });

  describe("Hook Initialization", () => {
    it("should return expected properties", () => {
      const { result } = renderHook(() => useUserFollowing("testuser", true));

      expect(result.current).toHaveProperty("following");
      expect(result.current).toHaveProperty("total");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
    });

    it("should initialize with empty following array", () => {
      const { result } = renderHook(() => useUserFollowing("testuser", true));

      expect(result.current.following).toEqual([]);
      expect(result.current.total).toBe(0);
    });
  });

  describe("Lazy Loading", () => {
    it("should skip query when enabled is false", () => {
      const { result } = renderHook(() => useUserFollowing("testuser", false));

      expect(result.current.following).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it("should execute query when enabled is true", () => {
      const successData = {
        getUserFollowing: {
          users: [
            {
              username: "following1",
              fullName: "Following One",
              avatarUrl: "https://example.com/avatar1.jpg",
              bio: "Bio 1",
            },
          ],
          total: 1,
        },
      };

      mockQueryResult.data = successData;

      const { result } = renderHook(() => useUserFollowing("testuser", true));

      expect(result.current.following).toEqual(
        successData.getUserFollowing.users,
      );
      expect(result.current.total).toBe(1);
    });
  });

  describe("Success State", () => {
    it("should return following data when query succeeds", () => {
      const successData = {
        getUserFollowing: {
          users: [
            {
              username: "dave",
              fullName: "Dave Johnson",
              avatarUrl: "https://example.com/dave.jpg",
              bio: "Product manager",
            },
          ],
          total: 1,
        },
      };

      mockQueryResult.data = successData;

      const { result } = renderHook(() => useUserFollowing("testuser", true));

      expect(result.current.following).toHaveLength(1);
      expect(result.current.following[0].username).toBe("dave");
      expect(result.current.total).toBe(1);
    });

    it("should handle empty following list", () => {
      const emptyData = {
        getUserFollowing: {
          users: [],
          total: 0,
        },
      };

      mockQueryResult.data = emptyData;

      const { result } = renderHook(() => useUserFollowing("testuser", true));

      expect(result.current.following).toEqual([]);
      expect(result.current.total).toBe(0);
    });
  });

  describe("Error State", () => {
    it("should handle query errors", () => {
      const error = new Error("Unauthorized");
      mockQueryResult.error = error;

      const { result } = renderHook(() => useUserFollowing("testuser", true));

      expect(result.current.error).toEqual(error);
      expect(result.current.following).toEqual([]);
    });
  });

  describe("Loading State", () => {
    it("should reflect loading state", () => {
      mockQueryResult.loading = true;

      const { result } = renderHook(() => useUserFollowing("testuser", true));

      expect(result.current.loading).toBe(true);
    });
  });

  describe("Real-world Usage Patterns", () => {
    it("should support following tab pattern", () => {
      const { result } = renderHook(() =>
        useUserFollowing("developer123", true),
      );

      expect(Array.isArray(result.current.following)).toBe(true);
      expect(typeof result.current.total).toBe("number");
    });

    it("should support empty state pattern", () => {
      mockQueryResult.data = {
        getUserFollowing: {
          users: [],
          total: 0,
        },
      };

      const { result } = renderHook(() => useUserFollowing("newuser", true));

      expect(result.current.following.length).toBe(0);
    });
  });
});
