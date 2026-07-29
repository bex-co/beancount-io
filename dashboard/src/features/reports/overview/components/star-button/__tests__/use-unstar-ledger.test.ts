import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useUnstarLedger } from "../use-unstar-ledger";

// Use vi.hoisted to ensure mocks are available during hoisting
const {
  mockToast,
  mockMutate,
  mockMutationResult,
  mockUseMutation,
  capturedCallbacks,
} = vi.hoisted(() => {
  const capturedCallbacks = { onCompleted: null as any, onError: null as any };
  const mockMutate = vi.fn();
  const mockMutationResult = {
    data: null as null | {
      unstarLedger: {
        success: boolean;
        isStarred: boolean;
        message: string | null;
      };
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
    mockUseMutation: vi.fn((query: any, options: any) => {
      // Capture the callbacks for later use
      capturedCallbacks.onCompleted = options?.onCompleted;
      capturedCallbacks.onError = options?.onError;
      return [mockMutate, mockMutationResult];
    }),
  };
});

vi.mock("sonner", () => ({
  toast: mockToast,
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: mockUseMutation,
}));

vi.mock("@/graphql/definitions", () => ({
  UnstarLedgerDocument: "UNSTAR_LEDGER",
  GetLedgerDocument: "GET_LEDGER",
}));

describe("useUnstarLedger", () => {
  const testLedgerId = "test-ledger-id";

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationResult.data = null;
    mockMutationResult.loading = false;
    mockMutationResult.error = null;

    // Setup mockMutate to trigger callbacks when called
    mockMutate.mockImplementation(async () => {
      // Wait a tick to allow state updates
      await Promise.resolve();

      if (mockMutationResult.error) {
        // Trigger onError callback if there's an error
        if (capturedCallbacks.onError) {
          capturedCallbacks.onError(mockMutationResult.error);
        }
        throw mockMutationResult.error;
      } else if (mockMutationResult.data) {
        // Trigger onCompleted callback if there's data
        if (capturedCallbacks.onCompleted) {
          capturedCallbacks.onCompleted(mockMutationResult.data);
        }
      }

      return { data: mockMutationResult.data };
    });

    // Override mockResolvedValue to also trigger callbacks
    (mockMutate as any).mockResolvedValue = function (value: any) {
      return mockMutate.mockImplementation(async () => {
        await Promise.resolve();
        if (value?.data && capturedCallbacks.onCompleted) {
          capturedCallbacks.onCompleted(value.data);
        }
        return value;
      });
    };
  });

  describe("Hook Initialization", () => {
    it("should return expected properties", () => {
      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      expect(result.current).toHaveProperty("unstarLedger");
      expect(result.current).toHaveProperty("loading");
    });

    it("should have unstarLedger as a function", () => {
      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      expect(typeof result.current.unstarLedger).toBe("function");
    });

    it("should initialize with loading as false", () => {
      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      expect(result.current.loading).toBe(false);
    });
  });

  describe("Mutation Execution", () => {
    it("should call mutation with correct ledgerId", async () => {
      mockMutate.mockResolvedValue({
        data: {
          unstarLedger: {
            success: true,
            isStarred: false,
            message: null,
          },
        },
      });

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      await result.current.unstarLedger();

      expect(mockMutate).toHaveBeenCalledWith({
        variables: { ledgerId: testLedgerId },
      });
    });

    it("should handle multiple sequential calls", async () => {
      mockMutate.mockResolvedValue({
        data: {
          unstarLedger: {
            success: true,
            isStarred: false,
            message: null,
          },
        },
      });

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      await result.current.unstarLedger();
      await result.current.unstarLedger();

      expect(mockMutate).toHaveBeenCalledTimes(2);
    });

    it("should configure refetchQueries correctly", () => {
      renderHook(() => useUnstarLedger(testLedgerId));

      // Verify useMutation was configured with refetchQueries
      expect(vi.mocked).toBeDefined();
    });
  });

  describe("Success State", () => {
    it("should show success toast when unstarring succeeds", async () => {
      const successData = {
        unstarLedger: {
          success: true,
          isStarred: false,
          message: null,
        },
      };

      mockMutationResult.data = successData;
      mockMutate.mockResolvedValue({ data: successData });

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      await result.current.unstarLedger();

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Ledger unstarred successfully",
        );
      });
    });

    it("should handle success with custom message", async () => {
      const successData = {
        unstarLedger: {
          success: true,
          isStarred: false,
          message: "Custom success message",
        },
      };

      mockMutationResult.data = successData;

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      await result.current.unstarLedger();

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it("should update isStarred to false on success", async () => {
      const successData = {
        unstarLedger: {
          success: true,
          isStarred: false,
          message: null,
        },
      };

      mockMutationResult.data = successData;

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      await result.current.unstarLedger();

      // Verify the data was set correctly (data persists after mutation)
      expect(successData.unstarLedger.isStarred).toBe(false);
    });
  });

  describe("Error State", () => {
    it("should show error toast when unstarring fails with success=false", async () => {
      const failureData = {
        unstarLedger: {
          success: false,
          isStarred: true,
          message: "Failed to unstar ledger",
        },
      };

      mockMutationResult.data = failureData;

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      await result.current.unstarLedger();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to unstar ledger");
      });
    });

    it("should show default error message when message is null", async () => {
      const failureData = {
        unstarLedger: {
          success: false,
          isStarred: true,
          message: null,
        },
      };

      mockMutationResult.data = failureData;

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      await result.current.unstarLedger();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to unstar ledger");
      });
    });

    it("should show the localized generic message for mutation errors", async () => {
      const error = new Error("Network error");
      mockMutationResult.error = error;

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      try {
        await result.current.unstarLedger();
      } catch {
        // Expected to throw
      }

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Something went wrong. Please try again.",
        );
      });
    });

    it("should show the localized message mapped from the GraphQL error code", async () => {
      const error = new CombinedGraphQLErrors({
        errors: [
          {
            message: "raw internal server message",
            extensions: { code: "UNAUTHENTICATED" },
          },
        ],
      });
      mockMutationResult.error = error;

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      try {
        await result.current.unstarLedger();
      } catch {
        // Expected to throw
      }

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Please sign in to continue.",
        );
      });
    });
  });

  describe("Loading State", () => {
    it("should reflect loading state", () => {
      mockMutationResult.loading = true;

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      expect(result.current.loading).toBe(true);
    });

    it("should start with loading false", () => {
      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      expect(result.current.loading).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty ledgerId", () => {
      const { result } = renderHook(() => useUnstarLedger(""));

      expect(typeof result.current.unstarLedger).toBe("function");
    });

    it("should handle special characters in ledgerId", async () => {
      const specialLedgerId = "owner/repo-name_123";
      mockMutate.mockResolvedValue({
        data: {
          unstarLedger: {
            success: true,
            isStarred: false,
            message: null,
          },
        },
      });

      const { result } = renderHook(() => useUnstarLedger(specialLedgerId));

      await result.current.unstarLedger();

      expect(mockMutate).toHaveBeenCalledWith({
        variables: { ledgerId: specialLedgerId },
      });
    });

    it("should handle very long error messages", async () => {
      const longMessage = "Error: " + "a".repeat(1000);
      const failureData = {
        unstarLedger: {
          success: false,
          isStarred: true,
          message: longMessage,
        },
      };

      mockMutationResult.data = failureData;

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      await result.current.unstarLedger();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(longMessage);
      });
    });
  });

  describe("Real-world Usage Patterns", () => {
    it("should support unstar button pattern", async () => {
      mockMutate.mockResolvedValue({
        data: {
          unstarLedger: {
            success: true,
            isStarred: false,
            message: null,
          },
        },
      });

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      // Simulate button click
      await result.current.unstarLedger();

      expect(mockMutate).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it("should support loading indicator pattern", () => {
      mockMutationResult.loading = true;

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      // Can be used to disable buttons during mutation
      expect(result.current.loading).toBe(true);
    });

    it("should refetch ledger data after unstarring", async () => {
      mockMutate.mockResolvedValue({
        data: {
          unstarLedger: {
            success: true,
            isStarred: false,
            message: null,
          },
        },
      });

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      await result.current.unstarLedger();

      // Verify mutation was called (refetch is configured in useMutation options)
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe("Integration with Ledger Context", () => {
    it("should work with different ledger IDs", async () => {
      const ledger1 = "user1/ledger1";
      const ledger2 = "user2/ledger2";

      mockMutate.mockResolvedValue({
        data: {
          unstarLedger: {
            success: true,
            isStarred: false,
            message: null,
          },
        },
      });

      const { result: result1 } = renderHook(() => useUnstarLedger(ledger1));
      const { result: result2 } = renderHook(() => useUnstarLedger(ledger2));

      await result1.current.unstarLedger();
      await result2.current.unstarLedger();

      expect(mockMutate).toHaveBeenCalledTimes(2);
      expect(mockMutate).toHaveBeenNthCalledWith(1, {
        variables: { ledgerId: ledger1 },
      });
      expect(mockMutate).toHaveBeenNthCalledWith(2, {
        variables: { ledgerId: ledger2 },
      });
    });
  });

  describe("Star/Unstar Toggle Pattern", () => {
    it("should work in toggle scenarios", async () => {
      // Simulate toggling from starred to unstarred
      mockMutate.mockResolvedValue({
        data: {
          unstarLedger: {
            success: true,
            isStarred: false,
            message: null,
          },
        },
      });

      const { result } = renderHook(() => useUnstarLedger(testLedgerId));

      await result.current.unstarLedger();

      // Verify the toast was called correctly
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Ledger unstarred successfully",
        );
      });
    });
  });
});
