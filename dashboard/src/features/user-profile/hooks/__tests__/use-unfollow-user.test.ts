import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useUnfollowUser } from "../use-unfollow-user";

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
        unfollowUser: { success: boolean; message: string | null };
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
  UnfollowUserDocument: "UNFOLLOW_USER",
  GetUserProfileDocument: "GET_USER_PROFILE",
  GetUserFollowersDocument: "GET_USER_FOLLOWERS",
  GetUserFollowingDocument: "GET_USER_FOLLOWING",
}));

describe("useUnfollowUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationResult.data = null;
    mockMutationResult.loading = false;
    mockMutationResult.error = null;
  });

  describe("Hook initialization", () => {
    it("should return unfollowUser function and loading state", () => {
      const { result } = renderHook(() => useUnfollowUser());
      expect(result.current).toHaveProperty("unfollowUser");
      expect(result.current).toHaveProperty("loading");
    });

    it("should start with loading as false", () => {
      const { result } = renderHook(() => useUnfollowUser());
      expect(result.current.loading).toBe(false);
    });

    it("should expose unfollowUser as a function", () => {
      const { result } = renderHook(() => useUnfollowUser());
      expect(typeof result.current.unfollowUser).toBe("function");
    });
  });

  describe("Success scenarios", () => {
    it("should show success toast on successful unfollow", async () => {
      mockMutate.mockImplementation(async (_opts: any) => {
        await Promise.resolve();
        const data = {
          unfollowUser: { success: true, message: null },
        };
        capturedCallbacks.onCompleted?.(data, {
          variables: { username: "alice" },
        });
        return { data };
      });

      const { result } = renderHook(() => useUnfollowUser());
      await result.current.unfollowUser({ variables: { username: "alice" } });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it("should show custom success message when provided", async () => {
      mockMutate.mockImplementation(async (_opts: any) => {
        await Promise.resolve();
        const data = {
          unfollowUser: {
            success: true,
            message: "You have unfollowed alice",
          },
        };
        capturedCallbacks.onCompleted?.(data, {
          variables: { username: "alice" },
        });
        return { data };
      });

      const { result } = renderHook(() => useUnfollowUser());
      await result.current.unfollowUser({ variables: { username: "alice" } });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "You have unfollowed alice",
        );
      });
    });
  });

  describe("Failure scenarios", () => {
    it("should show error toast when success is false", async () => {
      mockMutate.mockImplementation(async (_opts: any) => {
        await Promise.resolve();
        const data = {
          unfollowUser: {
            success: false,
            message: "User not found",
          },
        };
        capturedCallbacks.onCompleted?.(data, {
          variables: { username: "ghost" },
        });
        return { data };
      });

      const { result } = renderHook(() => useUnfollowUser());
      await result.current.unfollowUser({ variables: { username: "ghost" } });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("User not found");
      });
    });

    it("should show error toast on mutation error", async () => {
      const error = new Error("Network error");
      mockMutate.mockImplementation(async () => {
        await Promise.resolve();
        capturedCallbacks.onError?.(error);
        throw error;
      });

      const { result } = renderHook(() => useUnfollowUser());

      try {
        await result.current.unfollowUser({ variables: { username: "bob" } });
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

      const { result } = renderHook(() => useUnfollowUser());
      expect(result.current.loading).toBe(true);
    });
  });
});
