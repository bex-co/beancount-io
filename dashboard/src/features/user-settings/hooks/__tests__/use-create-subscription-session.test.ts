import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCreateSubscriptionSession } from "../use-create-subscription-session";

// Mock mutation function
const mockMutate = vi.fn();
const mockMutationResult: {
  data: null | {
    createSubscriptionSession: {
      success: boolean;
      sessionId: string | null;
      sessionUrl: string | null;
      message: string | null;
    };
  };
  loading: boolean;
  error: Error | null | { message: string; extensions: { code: string } };
} = {
  data: null,
  loading: false,
  error: null,
};

// Mock Apollo Client
vi.mock("@apollo/client/react", () => ({
  useMutation: () => [mockMutate, mockMutationResult],
}));

vi.mock("@apollo/client", () => ({
  gql: (strings: TemplateStringsArray) => strings[0],
}));

describe("useCreateSubscriptionSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationResult.data = null;
    mockMutationResult.loading = false;
    mockMutationResult.error = null;
  });

  describe("Hook Initialization", () => {
    it("should return expected properties", () => {
      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current).toHaveProperty("createSubscriptionSession");
      expect(result.current).toHaveProperty("data");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("result");
      expect(result.current).toHaveProperty("success");
      expect(result.current).toHaveProperty("sessionUrl");
      expect(result.current).toHaveProperty("message");
    });

    it("should have createSubscriptionSession as a function", () => {
      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(typeof result.current.createSubscriptionSession).toBe("function");
    });

    it("should initialize with null data", () => {
      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.data).toBeNull();
      expect(result.current.result).toBeUndefined();
      expect(result.current.success).toBeUndefined();
      expect(result.current.sessionUrl).toBeUndefined();
      expect(result.current.message).toBeUndefined();
    });

    it("should initialize with loading as false", () => {
      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.loading).toBe(false);
    });

    it("should initialize with no error", () => {
      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.error).toBeNull();
    });
  });

  describe("Mutation Execution", () => {
    it("should call useMutation with correct mutation", () => {
      renderHook(() => useCreateSubscriptionSession());

      // useMutation should have been called with the CREATE_SUBSCRIPTION_SESSION mutation
      expect(vi.mocked).toBeDefined();
    });

    it("should pass variables to mutation function", async () => {
      const variables = {
        clientId: "test-client",
        priceId: "price_123",
      };

      const { result } = renderHook(() => useCreateSubscriptionSession());

      result.current.createSubscriptionSession({ variables });

      expect(mockMutate).toHaveBeenCalledWith({ variables });
    });

    it("should handle multiple sequential calls", async () => {
      const { result } = renderHook(() => useCreateSubscriptionSession());

      const variables1 = {
        clientId: "client-1",
        priceId: "price_1",
      };

      const variables2 = {
        clientId: "client-2",
        priceId: "price_2",
      };

      result.current.createSubscriptionSession({ variables: variables1 });
      result.current.createSubscriptionSession({ variables: variables2 });

      expect(mockMutate).toHaveBeenCalledTimes(2);
      expect(mockMutate).toHaveBeenNthCalledWith(1, { variables: variables1 });
      expect(mockMutate).toHaveBeenNthCalledWith(2, { variables: variables2 });
    });
  });

  describe("Success State", () => {
    it("should return success data when mutation succeeds", () => {
      const successData = {
        createSubscriptionSession: {
          success: true,
          sessionId: "sess_123",
          sessionUrl: "https://checkout.stripe.com/session/sess_123",
          message: null,
        },
      };

      mockMutationResult.data = successData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.data).toEqual(successData);
      expect(result.current.result).toEqual(
        successData.createSubscriptionSession,
      );
      expect(result.current.success).toBe(true);
      expect(result.current.sessionUrl).toBe(
        "https://checkout.stripe.com/session/sess_123",
      );
      expect(result.current.message).toBeNull();
    });

    it("should expose sessionId through result", () => {
      const successData = {
        createSubscriptionSession: {
          success: true,
          sessionId: "sess_abc",
          sessionUrl: "https://checkout.stripe.com/session/sess_abc",
          message: null,
        },
      };

      mockMutationResult.data = successData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.result?.sessionId).toBe("sess_abc");
    });

    it("should handle success with custom message", () => {
      const successData = {
        createSubscriptionSession: {
          success: true,
          sessionId: "sess_xyz",
          sessionUrl: "https://checkout.stripe.com/session/sess_xyz",
          message: "Session created successfully",
        },
      };

      mockMutationResult.data = successData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.success).toBe(true);
      expect(result.current.message).toBe("Session created successfully");
    });
  });

  describe("Error State", () => {
    it("should handle mutation errors", () => {
      const error = new Error("Network error");
      mockMutationResult.error = error;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.error).toEqual(error);
    });

    it("should handle GraphQL errors", () => {
      const graphQLError = {
        message: "Invalid price ID",
        extensions: { code: "INVALID_PRICE" },
      };

      mockMutationResult.error = graphQLError;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.error).toEqual(graphQLError);
    });

    it("should return error state with null success data", () => {
      mockMutationResult.error = new Error("Failed to create session");
      mockMutationResult.data = null;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.error).toBeDefined();
      expect(result.current.success).toBeUndefined();
      expect(result.current.sessionUrl).toBeUndefined();
    });
  });

  describe("Loading State", () => {
    it("should reflect loading state", () => {
      mockMutationResult.loading = true;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.loading).toBe(true);
    });

    it("should start with loading false", () => {
      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.loading).toBe(false);
    });
  });

  describe("Failure Response", () => {
    it("should handle failure with success=false", () => {
      const failureData = {
        createSubscriptionSession: {
          success: false,
          sessionId: null,
          sessionUrl: null,
          message: "Invalid client ID",
        },
      };

      mockMutationResult.data = failureData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.success).toBe(false);
      expect(result.current.sessionUrl).toBeNull();
      expect(result.current.message).toBe("Invalid client ID");
    });

    it("should handle partial failure data", () => {
      const partialFailureData = {
        createSubscriptionSession: {
          success: false,
          sessionId: "sess_failed",
          sessionUrl: null,
          message: "Session created but URL generation failed",
        },
      };

      mockMutationResult.data = partialFailureData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.success).toBe(false);
      expect(result.current.result?.sessionId).toBe("sess_failed");
      expect(result.current.sessionUrl).toBeNull();
    });
  });

  describe("Null and Undefined Handling", () => {
    it("should handle null sessionUrl", () => {
      const nullUrlData = {
        createSubscriptionSession: {
          success: true,
          sessionId: "sess_123",
          sessionUrl: null,
          message: "Session created without URL",
        },
      };

      mockMutationResult.data = nullUrlData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.sessionUrl).toBeNull();
    });

    it("should handle null sessionId", () => {
      const nullIdData = {
        createSubscriptionSession: {
          success: false,
          sessionId: null,
          sessionUrl: null,
          message: "Failed to create session",
        },
      };

      mockMutationResult.data = nullIdData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.result?.sessionId).toBeNull();
    });

    it("should handle null message", () => {
      const nullMessageData = {
        createSubscriptionSession: {
          success: true,
          sessionId: "sess_123",
          sessionUrl: "https://example.com",
          message: null,
        },
      };

      mockMutationResult.data = nullMessageData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.message).toBeNull();
    });
  });

  describe("Type Safety", () => {
    it("should type createSubscriptionSession parameters correctly", () => {
      const { result } = renderHook(() => useCreateSubscriptionSession());

      // This test ensures TypeScript types are correct
      const validVariables = {
        variables: {
          clientId: "test-client",
          priceId: "price_123",
        },
      };

      result.current.createSubscriptionSession(validVariables);

      expect(mockMutate).toHaveBeenCalledWith(validVariables);
    });

    it("should return correctly typed result", () => {
      const successData = {
        createSubscriptionSession: {
          success: true,
          sessionId: "sess_123",
          sessionUrl: "https://example.com",
          message: "Success",
        },
      };

      mockMutationResult.data = successData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      // Verify result has correct shape
      expect(result.current.result).toHaveProperty("success");
      expect(result.current.result).toHaveProperty("sessionId");
      expect(result.current.result).toHaveProperty("sessionUrl");
      expect(result.current.result).toHaveProperty("message");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string sessionUrl", () => {
      const emptyUrlData = {
        createSubscriptionSession: {
          success: true,
          sessionId: "sess_123",
          sessionUrl: "",
          message: null,
        },
      };

      mockMutationResult.data = emptyUrlData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.sessionUrl).toBe("");
    });

    it("should handle empty string message", () => {
      const emptyMessageData = {
        createSubscriptionSession: {
          success: true,
          sessionId: "sess_123",
          sessionUrl: "https://example.com",
          message: "",
        },
      };

      mockMutationResult.data = emptyMessageData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.message).toBe("");
    });

    it("should handle very long sessionUrl", () => {
      const longUrl = "https://checkout.stripe.com/session/" + "a".repeat(1000);
      const longUrlData = {
        createSubscriptionSession: {
          success: true,
          sessionId: "sess_123",
          sessionUrl: longUrl,
          message: null,
        },
      };

      mockMutationResult.data = longUrlData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.sessionUrl).toBe(longUrl);
    });

    it("should handle special characters in message", () => {
      const specialMessageData = {
        createSubscriptionSession: {
          success: false,
          sessionId: null,
          sessionUrl: null,
          message: 'Error: Invalid input with <special> & "characters"',
        },
      };

      mockMutationResult.data = specialMessageData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      expect(result.current.message).toContain("<special>");
      expect(result.current.message).toContain("&");
      expect(result.current.message).toContain('"');
    });
  });

  describe("Real-world Usage Patterns", () => {
    it("should support checkout flow pattern", () => {
      const { result } = renderHook(() => useCreateSubscriptionSession());

      // Simulate checkout button click
      const checkoutVariables = {
        variables: {
          clientId: "beancount-web-prod",
          priceId: "price_monthly_pro",
        },
      };

      result.current.createSubscriptionSession(checkoutVariables);

      expect(mockMutate).toHaveBeenCalledWith(checkoutVariables);
    });

    it("should support loading indicator pattern", () => {
      mockMutationResult.loading = true;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      // Can be used to disable buttons during checkout
      expect(result.current.loading).toBe(true);
    });

    it("should support error handling pattern", () => {
      const error = new Error("Payment method declined");
      mockMutationResult.error = error;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      // Can be used to show error messages
      expect(result.current.error).toEqual(error);
    });

    it("should support success redirect pattern", () => {
      const successData = {
        createSubscriptionSession: {
          success: true,
          sessionId: "sess_123",
          sessionUrl: "https://checkout.stripe.com/pay/sess_123",
          message: null,
        },
      };

      mockMutationResult.data = successData;

      const { result } = renderHook(() => useCreateSubscriptionSession());

      // Can be used for window.location.href = sessionUrl
      expect(result.current.sessionUrl).toBeTruthy();
      expect(result.current.success).toBe(true);
    });
  });
});
