import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUserLimits } from "../use-user-limits";
import { useQuery } from "@apollo/client/react";
import { GetCurrentUserDocument } from "@/graphql/definitions";
import type { GetCurrentUserQuery } from "@/graphql/definitions";

// Mock Apollo's useQuery
vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
}));

describe("useUserLimits", () => {
  const mockUseQuery = vi.mocked(useQuery);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("should return loading true when query is loading", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        loading: true,
        error: undefined,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useUserLimits());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.limits).toBeNull();
    });
  });

  describe("error state", () => {
    it("should return error when query fails", () => {
      const mockError = new Error("Network error");
      mockUseQuery.mockReturnValue({
        data: undefined,
        loading: false,
        error: mockError,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useUserLimits());

      expect(result.current.error).toBe(mockError);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("FREE tier user", () => {
    it("should return FREE tier and limits for free user", () => {
      const mockData: GetCurrentUserQuery = {
        userProfile: {
          id: "123",
          email: "test@example.com",
          username: "testuser",
          tier: "FREE",
          limits: {
            ledgersUsed: 1,
            ledgersMax: 3,
            collaboratorsPerLedgerMax: 2,
            maxDirectives: 1000,
          },
          avatarUrl: null,
          locale: null,
        },
      };

      mockUseQuery.mockReturnValue({
        data: mockData,
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useUserLimits());

      expect(result.current.tier).toBe("FREE");
      expect(result.current.isFree).toBe(true);
      expect(result.current.isPremium).toBe(false);
      expect(result.current.limits).toEqual({
        ledgersUsed: 1,
        ledgersMax: 3,
        collaboratorsPerLedgerMax: 2,
        maxDirectives: 1000,
      });
    });

    it("should return isAtLedgerLimit false when not at limit", () => {
      const mockData: GetCurrentUserQuery = {
        userProfile: {
          id: "123",
          email: "test@example.com",
          username: "testuser",
          tier: "FREE",
          limits: {
            ledgersUsed: 1,
            ledgersMax: 3,
            collaboratorsPerLedgerMax: 2,
            maxDirectives: 1000,
          },
          avatarUrl: null,
          locale: null,
        },
      };

      mockUseQuery.mockReturnValue({
        data: mockData,
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useUserLimits());

      expect(result.current.isAtLedgerLimit).toBe(false);
    });

    it("should return isAtLedgerLimit true when at limit", () => {
      const mockData: GetCurrentUserQuery = {
        userProfile: {
          id: "123",
          email: "test@example.com",
          username: "testuser",
          tier: "FREE",
          limits: {
            ledgersUsed: 3,
            ledgersMax: 3,
            collaboratorsPerLedgerMax: 2,
            maxDirectives: 1000,
          },
          avatarUrl: null,
          locale: null,
        },
      };

      mockUseQuery.mockReturnValue({
        data: mockData,
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useUserLimits());

      expect(result.current.isAtLedgerLimit).toBe(true);
    });

    it("should return isAtLedgerLimit true when over limit", () => {
      const mockData: GetCurrentUserQuery = {
        userProfile: {
          id: "123",
          email: "test@example.com",
          username: "testuser",
          tier: "FREE",
          limits: {
            ledgersUsed: 5,
            ledgersMax: 3,
            collaboratorsPerLedgerMax: 2,
            maxDirectives: 1000,
          },
          avatarUrl: null,
          locale: null,
        },
      };

      mockUseQuery.mockReturnValue({
        data: mockData,
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useUserLimits());

      expect(result.current.isAtLedgerLimit).toBe(true);
    });
  });

  describe("PREMIUM tier user", () => {
    it("should return PREMIUM tier for premium user", () => {
      const mockData: GetCurrentUserQuery = {
        userProfile: {
          id: "123",
          email: "premium@example.com",
          username: "premiumuser",
          tier: "PREMIUM",
          limits: {
            ledgersUsed: 10,
            ledgersMax: 100,
            collaboratorsPerLedgerMax: 20,
            maxDirectives: -1,
          },
          avatarUrl: null,
          locale: null,
        },
      };

      mockUseQuery.mockReturnValue({
        data: mockData,
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useUserLimits());

      expect(result.current.tier).toBe("PREMIUM");
      expect(result.current.isPremium).toBe(true);
      expect(result.current.isFree).toBe(false);
    });
  });

  describe("default values", () => {
    it("should default to FREE tier when no data", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useUserLimits());

      expect(result.current.tier).toBe("FREE");
      expect(result.current.isFree).toBe(true);
    });

    it("should default to null limits when no userProfile", () => {
      mockUseQuery.mockReturnValue({
        data: { userProfile: null } as unknown as GetCurrentUserQuery,
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useUserLimits());

      expect(result.current.limits).toBeNull();
      expect(result.current.isAtLedgerLimit).toBe(false);
    });

    it("should handle missing limits in userProfile", () => {
      const mockData: GetCurrentUserQuery = {
        userProfile: {
          id: "123",
          email: "test@example.com",
          username: "testuser",
          tier: "FREE",
          limits: null,
          avatarUrl: null,
          locale: null,
        },
      };

      mockUseQuery.mockReturnValue({
        data: mockData,
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useUserLimits());

      expect(result.current.limits).toBeNull();
      expect(result.current.isAtLedgerLimit).toBe(false);
    });
  });

  describe("refetch functionality", () => {
    it("should provide refetch function", async () => {
      const mockRefetch = vi.fn().mockResolvedValue({});
      mockUseQuery.mockReturnValue({
        data: undefined,
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useUserLimits());

      expect(typeof result.current.refetch).toBe("function");

      await result.current.refetch();

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("query document", () => {
    it("should call useQuery with GetCurrentUserDocument", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      });

      renderHook(() => useUserLimits());

      expect(mockUseQuery).toHaveBeenCalledWith(GetCurrentUserDocument, {
        fetchPolicy: "cache-and-network",
      });
    });
  });
});
