import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAllTierQuotas } from "../use-all-tier-quotas";
import { GetAllTierQuotasDocument } from "@/graphql/definitions";

const mockUseQuery = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

const MOCK_QUOTAS = [
  {
    __typename: "TierQuotaItem" as const,
    tier: "FREE",
    aiCfoTokensMax: 50_000,
    maxLedgers: 1,
    maxCollaboratorsPerLedger: 1,
    maxDirectives: 1000,
  },
  {
    __typename: "TierQuotaItem" as const,
    tier: "PREMIUM",
    aiCfoTokensMax: 500_000,
    maxLedgers: 5,
    maxCollaboratorsPerLedger: 5,
    maxDirectives: -1,
  },
  {
    __typename: "TierQuotaItem" as const,
    tier: "GROWTH",
    aiCfoTokensMax: 2_000_000,
    maxLedgers: 20,
    maxCollaboratorsPerLedger: 10,
    maxDirectives: -1,
  },
  {
    __typename: "TierQuotaItem" as const,
    tier: "ORGANIZATION",
    aiCfoTokensMax: 10_000_000,
    maxLedgers: 100,
    maxCollaboratorsPerLedger: 50,
    maxDirectives: -1,
  },
  {
    __typename: "TierQuotaItem" as const,
    tier: "ENTERPRISE",
    aiCfoTokensMax: -1,
    maxLedgers: -1,
    maxCollaboratorsPerLedger: -1,
    maxDirectives: -1,
  },
];

describe("useAllTierQuotas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null quotas when no data", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useAllTierQuotas());

    expect(result.current.quotas).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should return quotas for all tiers when data present", () => {
    mockUseQuery.mockReturnValue({
      data: { allTierQuotas: MOCK_QUOTAS },
      loading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useAllTierQuotas());

    expect(result.current.quotas).toHaveLength(5);
  });

  it("should find a specific tier via getQuotaForTier", () => {
    mockUseQuery.mockReturnValue({
      data: { allTierQuotas: MOCK_QUOTAS },
      loading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useAllTierQuotas());

    const premium = result.current.getQuotaForTier("PREMIUM");
    expect(premium?.aiCfoTokensMax).toBe(500_000);
    expect(premium?.maxLedgers).toBe(5);
    expect(premium?.maxCollaboratorsPerLedger).toBe(5);
  });

  it("should return null from getQuotaForTier for unknown tier", () => {
    mockUseQuery.mockReturnValue({
      data: { allTierQuotas: MOCK_QUOTAS },
      loading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useAllTierQuotas());

    expect(result.current.getQuotaForTier("UNKNOWN")).toBeNull();
  });

  it("should return -1 for ENTERPRISE unlimited tier", () => {
    mockUseQuery.mockReturnValue({
      data: { allTierQuotas: MOCK_QUOTAS },
      loading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useAllTierQuotas());

    const enterprise = result.current.getQuotaForTier("ENTERPRISE");
    expect(enterprise?.aiCfoTokensMax).toBe(-1);
    expect(enterprise?.maxLedgers).toBe(-1);
  });

  it("should return isLoading true when loading", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    });

    const { result } = renderHook(() => useAllTierQuotas());

    expect(result.current.isLoading).toBe(true);
  });

  it("should return error when query errors", () => {
    const mockError = new Error("Network error");
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: mockError,
    });

    const { result } = renderHook(() => useAllTierQuotas());

    expect(result.current.error).toBe(mockError);
  });

  it("should use cache-first fetch policy", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    });

    renderHook(() => useAllTierQuotas());

    expect(mockUseQuery).toHaveBeenCalledWith(GetAllTierQuotasDocument, {
      fetchPolicy: "cache-first",
    });
  });
});
