import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUpgradeSubscription } from "../use-upgrade-subscription";

// Mock mutation function and captured options
const mockMutate = vi.fn();
let capturedOptions: Record<string, unknown> = {};
const mockMutationResult: {
  data: null | {
    upgradeSubscription: {
      success: boolean;
      message: string | null;
      clientSecret: string | null;
      subscriptionId: string | null;
      newTier: string | null;
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
  useMutation: (
    _doc: unknown,
    options: Record<string, unknown> = {},
  ): [typeof mockMutate, typeof mockMutationResult] => {
    capturedOptions = options;
    return [mockMutate, mockMutationResult];
  },
}));

vi.mock("@apollo/client", () => ({
  gql: (strings: TemplateStringsArray) => strings[0],
}));

describe("useUpgradeSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOptions = {};
    mockMutationResult.data = null;
    mockMutationResult.loading = false;
    mockMutationResult.error = null;
  });

  describe("Hook Initialization", () => {
    it("should return expected properties", () => {
      const { result } = renderHook(() => useUpgradeSubscription());

      expect(result.current).toHaveProperty("upgradeSubscription");
      expect(result.current).toHaveProperty("data");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("result");
      expect(result.current).toHaveProperty("success");
      expect(result.current).toHaveProperty("message");
      expect(result.current).toHaveProperty("clientSecret");
    });

    it("should have upgradeSubscription as a function", () => {
      const { result } = renderHook(() => useUpgradeSubscription());

      expect(typeof result.current.upgradeSubscription).toBe("function");
    });

    it("should initialize with null data", () => {
      const { result } = renderHook(() => useUpgradeSubscription());

      expect(result.current.data).toBeNull();
      expect(result.current.result).toBeUndefined();
      expect(result.current.success).toBeUndefined();
      expect(result.current.message).toBeUndefined();
      expect(result.current.clientSecret).toBeUndefined();
    });

    it("should initialize with loading as false", () => {
      const { result } = renderHook(() => useUpgradeSubscription());

      expect(result.current.loading).toBe(false);
    });

    it("should initialize with no error", () => {
      const { result } = renderHook(() => useUpgradeSubscription());

      expect(result.current.error).toBeNull();
    });
  });

  describe("Mutation Configuration", () => {
    it("should configure awaitRefetchQueries as true", () => {
      renderHook(() => useUpgradeSubscription());

      expect(capturedOptions.awaitRefetchQueries).toBe(true);
    });

    it("should configure refetchQueries with GetCurrentUser and GetSubscriptionStatus", () => {
      renderHook(() => useUpgradeSubscription());

      expect(capturedOptions.refetchQueries).toBeDefined();
      expect(Array.isArray(capturedOptions.refetchQueries)).toBe(true);
      expect(
        (capturedOptions.refetchQueries as Array<unknown>).length,
      ).toBeGreaterThanOrEqual(2);
    });

    it("should provide an update function for cache", () => {
      renderHook(() => useUpgradeSubscription());

      expect(typeof capturedOptions.update).toBe("function");
    });
  });

  describe("Cache Update Function", () => {
    it("should write new tier to cache on successful upgrade", () => {
      renderHook(() => useUpgradeSubscription());

      const mockCache = {
        readQuery: vi.fn().mockReturnValue({
          userProfile: {
            __typename: "UserProfileResponse",
            id: "user-1",
            tier: "FREE",
            email: "test@test.com",
            limits: {
              ledgersUsed: 1,
              ledgersMax: 3,
              collaboratorsPerLedgerMax: 3,
            },
          },
        }),
        writeQuery: vi.fn(),
      };

      const mutationData = {
        upgradeSubscription: {
          success: true,
          message: "Upgraded",
          clientSecret: null,
          subscriptionId: "sub_123",
          newTier: "GROWTH",
        },
      };

      const updateFn = capturedOptions.update as (
        cache: typeof mockCache,
        result: { data: typeof mutationData },
      ) => void;
      updateFn(mockCache, { data: mutationData });

      expect(mockCache.readQuery).toHaveBeenCalled();
      expect(mockCache.writeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userProfile: expect.objectContaining({
              tier: "GROWTH",
            }),
          },
        }),
      );
    });

    it("should not write to cache when mutation is unsuccessful", () => {
      renderHook(() => useUpgradeSubscription());

      const mockCache = {
        readQuery: vi.fn(),
        writeQuery: vi.fn(),
      };

      const mutationData = {
        upgradeSubscription: {
          success: false,
          message: "Payment failed",
          clientSecret: null,
          subscriptionId: null,
          newTier: null,
        },
      };

      const updateFn = capturedOptions.update as (
        cache: typeof mockCache,
        result: { data: typeof mutationData },
      ) => void;
      updateFn(mockCache, { data: mutationData });

      expect(mockCache.readQuery).not.toHaveBeenCalled();
      expect(mockCache.writeQuery).not.toHaveBeenCalled();
    });

    it("should not write to cache when newTier is null", () => {
      renderHook(() => useUpgradeSubscription());

      const mockCache = {
        readQuery: vi.fn(),
        writeQuery: vi.fn(),
      };

      const mutationData = {
        upgradeSubscription: {
          success: true,
          message: "Upgraded but no tier",
          clientSecret: null,
          subscriptionId: "sub_123",
          newTier: null,
        },
      };

      const updateFn = capturedOptions.update as (
        cache: typeof mockCache,
        result: { data: typeof mutationData },
      ) => void;
      updateFn(mockCache, { data: mutationData });

      expect(mockCache.readQuery).not.toHaveBeenCalled();
      expect(mockCache.writeQuery).not.toHaveBeenCalled();
    });

    it("should not write to cache when existing userProfile is null", () => {
      renderHook(() => useUpgradeSubscription());

      const mockCache = {
        readQuery: vi.fn().mockReturnValue({ userProfile: null }),
        writeQuery: vi.fn(),
      };

      const mutationData = {
        upgradeSubscription: {
          success: true,
          message: "Upgraded",
          clientSecret: null,
          subscriptionId: "sub_123",
          newTier: "GROWTH",
        },
      };

      const updateFn = capturedOptions.update as (
        cache: typeof mockCache,
        result: { data: typeof mutationData },
      ) => void;
      updateFn(mockCache, { data: mutationData });

      expect(mockCache.readQuery).toHaveBeenCalled();
      expect(mockCache.writeQuery).not.toHaveBeenCalled();
    });

    it("should preserve all existing userProfile fields when updating tier", () => {
      renderHook(() => useUpgradeSubscription());

      const existingProfile = {
        __typename: "UserProfileResponse",
        id: "user-1",
        tier: "PREMIUM",
        email: "test@test.com",
        firstName: "John",
        lastName: "Doe",
        locale: "en",
        username: "johndoe",
        emailReportStatus: null,
        limits: {
          __typename: "UserLimits",
          ledgersUsed: 2,
          ledgersMax: 5,
          collaboratorsPerLedgerMax: 5,
        },
      };

      const mockCache = {
        readQuery: vi.fn().mockReturnValue({ userProfile: existingProfile }),
        writeQuery: vi.fn(),
      };

      const mutationData = {
        upgradeSubscription: {
          success: true,
          message: "Upgraded",
          clientSecret: null,
          subscriptionId: "sub_123",
          newTier: "GROWTH",
        },
      };

      const updateFn = capturedOptions.update as (
        cache: typeof mockCache,
        result: { data: typeof mutationData },
      ) => void;
      updateFn(mockCache, { data: mutationData });

      expect(mockCache.writeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userProfile: {
              ...existingProfile,
              tier: "GROWTH",
            },
          },
        }),
      );
    });
  });

  describe("Mutation Execution", () => {
    it("should pass variables to mutation function", () => {
      const variables = {
        clientId: "test-client",
        priceId: "price_123",
      };

      const { result } = renderHook(() => useUpgradeSubscription());

      result.current.upgradeSubscription({ variables });

      expect(mockMutate).toHaveBeenCalledWith({ variables });
    });
  });

  describe("Success State", () => {
    it("should return success data when mutation succeeds", () => {
      mockMutationResult.data = {
        upgradeSubscription: {
          success: true,
          message: "Subscription upgraded",
          clientSecret: null,
          subscriptionId: "sub_123",
          newTier: "GROWTH",
        },
      };

      const { result } = renderHook(() => useUpgradeSubscription());

      expect(result.current.success).toBe(true);
      expect(result.current.message).toBe("Subscription upgraded");
      expect(result.current.clientSecret).toBeNull();
    });

    it("should return clientSecret when 3DS is required", () => {
      mockMutationResult.data = {
        upgradeSubscription: {
          success: false,
          message: null,
          clientSecret: "pi_secret_abc",
          subscriptionId: "sub_123",
          newTier: null,
        },
      };

      const { result } = renderHook(() => useUpgradeSubscription());

      expect(result.current.success).toBe(false);
      expect(result.current.clientSecret).toBe("pi_secret_abc");
    });
  });

  describe("Error State", () => {
    it("should handle mutation errors", () => {
      const error = new Error("Network error");
      mockMutationResult.error = error;

      const { result } = renderHook(() => useUpgradeSubscription());

      expect(result.current.error).toEqual(error);
    });
  });

  describe("Loading State", () => {
    it("should reflect loading state", () => {
      mockMutationResult.loading = true;

      const { result } = renderHook(() => useUpgradeSubscription());

      expect(result.current.loading).toBe(true);
    });
  });
});
