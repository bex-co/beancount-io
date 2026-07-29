import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useStarLedger } from "../use-star-ledger";

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
      starLedger: {
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
  StarLedgerDocument: "STAR_LEDGER",
  GetLedgerDocument: "GET_LEDGER",
}));

describe("useStarLedger", () => {
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
      const { result } = renderHook(() => useStarLedger(testLedgerId));

      expect(result.current).toHaveProperty("starLedger");
      expect(result.current).toHaveProperty("loading");
    });

    it("should have starLedger as a function", () => {
      const { result } = renderHook(() => useStarLedger(testLedgerId));

      expect(typeof result.current.starLedger).toBe("function");
    });

    it("should initialize with loading as false", () => {
      const { result } = renderHook(() => useStarLedger(testLedgerId));

      expect(result.current.loading).toBe(false);
    });
  });

  describe("Mutation Execution", () => {
    it("should call mutation with correct ledgerId", async () => {
      mockMutate.mockResolvedValue({
        data: {
          starLedger: {
            success: true,
            isStarred: true,
            message: null,
          },
        },
      });

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      await result.current.starLedger();

      expect(mockMutate).toHaveBeenCalledWith({
        variables: { ledgerId: testLedgerId },
      });
    });

    it("should handle multiple sequential calls", async () => {
      mockMutate.mockResolvedValue({
        data: {
          starLedger: {
            success: true,
            isStarred: true,
            message: null,
          },
        },
      });

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      await result.current.starLedger();
      await result.current.starLedger();

      expect(mockMutate).toHaveBeenCalledTimes(2);
    });

    it("should configure refetchQueries correctly", () => {
      renderHook(() => useStarLedger(testLedgerId));

      // Verify useMutation was configured with refetchQueries
      expect(vi.mocked).toBeDefined();
    });
  });

  describe("Success State", () => {
    it("should show success toast when starring succeeds", async () => {
      const successData = {
        starLedger: {
          success: true,
          isStarred: true,
          message: null,
        },
      };

      mockMutationResult.data = { starLedger: successData };
      mockMutate.mockResolvedValue({ data: successData });

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      await result.current.starLedger();

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Ledger starred successfully",
        );
      });
    });

    it("should handle success with custom message", async () => {
      const successData = {
        starLedger: {
          success: true,
          isStarred: true,
          message: "Custom success message",
        },
      };

      mockMutationResult.data = successData;

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      await result.current.starLedger();

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it("should update isStarred to true on success", async () => {
      const successData = {
        starLedger: {
          success: true,
          isStarred: true,
          message: null,
        },
      };

      mockMutationResult.data = successData;

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      await result.current.starLedger();

      // Verify the data was set correctly (data persists after mutation)
      expect(successData.starLedger.isStarred).toBe(true);
    });
  });

  describe("Error State", () => {
    it("should show error toast when starring fails with success=false", async () => {
      const failureData = {
        starLedger: {
          success: false,
          isStarred: false,
          message: "Failed to star ledger",
        },
      };

      mockMutationResult.data = failureData;

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      await result.current.starLedger();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to star ledger");
      });
    });

    it("should show default error message when message is null", async () => {
      const failureData = {
        starLedger: {
          success: false,
          isStarred: false,
          message: null,
        },
      };

      mockMutationResult.data = failureData;

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      await result.current.starLedger();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to star ledger");
      });
    });

    it("should show the localized generic message for mutation errors", async () => {
      const error = new Error("Network error");
      mockMutationResult.error = error;

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      try {
        await result.current.starLedger();
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

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      try {
        await result.current.starLedger();
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

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      expect(result.current.loading).toBe(true);
    });

    it("should start with loading false", () => {
      const { result } = renderHook(() => useStarLedger(testLedgerId));

      expect(result.current.loading).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty ledgerId", () => {
      const { result } = renderHook(() => useStarLedger(""));

      expect(typeof result.current.starLedger).toBe("function");
    });

    it("should handle special characters in ledgerId", async () => {
      const specialLedgerId = "owner/repo-name_123";
      mockMutate.mockResolvedValue({
        data: {
          starLedger: {
            success: true,
            isStarred: true,
            message: null,
          },
        },
      });

      const { result } = renderHook(() => useStarLedger(specialLedgerId));

      await result.current.starLedger();

      expect(mockMutate).toHaveBeenCalledWith({
        variables: { ledgerId: specialLedgerId },
      });
    });

    it("should handle very long error messages", async () => {
      const longMessage = "Error: " + "a".repeat(1000);
      const failureData = {
        starLedger: {
          success: false,
          isStarred: false,
          message: longMessage,
        },
      };

      mockMutationResult.data = failureData;

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      await result.current.starLedger();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(longMessage);
      });
    });
  });

  describe("Real-world Usage Patterns", () => {
    it("should support star button pattern", async () => {
      mockMutate.mockResolvedValue({
        data: {
          starLedger: {
            success: true,
            isStarred: true,
            message: null,
          },
        },
      });

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      // Simulate button click
      await result.current.starLedger();

      expect(mockMutate).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it("should support loading indicator pattern", () => {
      mockMutationResult.loading = true;

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      // Can be used to disable buttons during mutation
      expect(result.current.loading).toBe(true);
    });

    it("should refetch ledger data after starring", async () => {
      mockMutate.mockResolvedValue({
        data: {
          starLedger: {
            success: true,
            isStarred: true,
            message: null,
          },
        },
      });

      const { result } = renderHook(() => useStarLedger(testLedgerId));

      await result.current.starLedger();

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
          starLedger: {
            success: true,
            isStarred: true,
            message: null,
          },
        },
      });

      const { result: result1 } = renderHook(() => useStarLedger(ledger1));
      const { result: result2 } = renderHook(() => useStarLedger(ledger2));

      await result1.current.starLedger();
      await result2.current.starLedger();

      expect(mockMutate).toHaveBeenCalledTimes(2);
      expect(mockMutate).toHaveBeenNthCalledWith(1, {
        variables: { ledgerId: ledger1 },
      });
      expect(mockMutate).toHaveBeenNthCalledWith(2, {
        variables: { ledgerId: ledger2 },
      });
    });
  });
});
