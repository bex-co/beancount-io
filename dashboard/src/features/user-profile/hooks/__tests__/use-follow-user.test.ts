import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFollowUser } from "../use-follow-user";

// Use vi.hoisted to ensure mocks are available before imports
const { mockToast, mockMutate, mockMutationResult, capturedCallbacks } =
  vi.hoisted(() => {
    const capturedCallbacks = {
      onCompleted: null as any,
      onError: null as any,
    };
    const mockMutate = vi.fn();
    const mockMutationResult = {
      data: null as null | {
        followUser: { success: boolean; message: string | null };
      },
      loading: false,
      error: null as Error | null,
    };

    return {
      mockToast: {
        success: vi.fn(),
        error: vi.fn(),
      },
      mockMutate,
      mockMutationResult,
      capturedCallbacks,
    };
  });

vi.mock("sonner", () => ({
  toast: mockToast,
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn((_query: unknown, options: any) => {
    capturedCallbacks.onCompleted = options?.onCompleted;
    capturedCallbacks.onError = options?.onError;
    return [mockMutate, mockMutationResult];
  }),
}));

vi.mock("@/graphql/definitions", () => ({
  FollowUserDocument: "FOLLOW_USER",
  GetUserProfileDocument: "GET_USER_PROFILE",
  GetUserFollowersDocument: "GET_USER_FOLLOWERS",
  GetUserFollowingDocument: "GET_USER_FOLLOWING",
}));

describe("useFollowUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationResult.data = null;
    mockMutationResult.loading = false;
    mockMutationResult.error = null;
  });

  describe("Hook initialization", () => {
    it("should return followUser function and loading state", () => {
      const { result } = renderHook(() => useFollowUser());
      expect(result.current).toHaveProperty("followUser");
      expect(result.current).toHaveProperty("loading");
    });

    it("should start with loading as false", () => {
      const { result } = renderHook(() => useFollowUser());
      expect(result.current.loading).toBe(false);
    });

    it("should expose followUser as a function", () => {
      const { result } = renderHook(() => useFollowUser());
      expect(typeof result.current.followUser).toBe("function");
    });
  });

  describe("Success scenarios", () => {
    it("should show success toast with username on successful follow", async () => {
      mockMutate.mockImplementation(async (_opts: any) => {
        await Promise.resolve();
        const data = {
          followUser: { success: true, message: null },
        };
        capturedCallbacks.onCompleted?.(data, {
          variables: { username: "alice" },
        });
        return { data };
      });

      const { result } = renderHook(() => useFollowUser());
      await result.current.followUser({ variables: { username: "alice" } });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it("should show custom success message when provided", async () => {
      mockMutate.mockImplementation(async (_opts: any) => {
        await Promise.resolve();
        const data = {
          followUser: { success: true, message: "You are now following alice" },
        };
        capturedCallbacks.onCompleted?.(data, {
          variables: { username: "alice" },
        });
        return { data };
      });

      const { result } = renderHook(() => useFollowUser());
      await result.current.followUser({ variables: { username: "alice" } });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "You are now following alice",
        );
      });
    });
  });

  describe("Failure scenarios", () => {
    it("should show error toast when success is false", async () => {
      mockMutate.mockImplementation(async (_opts: any) => {
        await Promise.resolve();
        const data = {
          followUser: { success: false, message: "Cannot follow yourself" },
        };
        capturedCallbacks.onCompleted?.(data, {
          variables: { username: "self" },
        });
        return { data };
      });

      const { result } = renderHook(() => useFollowUser());
      await result.current.followUser({ variables: { username: "self" } });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Cannot follow yourself");
      });
    });

    it("should show error toast on mutation error", async () => {
      const error = new Error("Network error");
      mockMutate.mockImplementation(async () => {
        await Promise.resolve();
        capturedCallbacks.onError?.(error);
        throw error;
      });

      const { result } = renderHook(() => useFollowUser());

      try {
        await result.current.followUser({ variables: { username: "bob" } });
      } catch {
        // Expected to throw
      }

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });
  });

  describe("Loading state", () => {
    it("should reflect loading state from mutation", () => {
      mockMutationResult.loading = true;

      const { result } = renderHook(() => useFollowUser());
      expect(result.current.loading).toBe(true);
    });
  });
});
