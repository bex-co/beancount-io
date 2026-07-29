import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAiCfoUsage } from "../use-ai-cfo-usage";

const mockUseQuery = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

describe("useAiCfoUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return default values of 0 when no data", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAiCfoUsage());

    expect(result.current.aiCfoTokensUsed).toBe(0);
    expect(result.current.aiCfoTokensMax).toBe(0);
    expect(result.current.usage).toBeNull();
  });

  it("should return isAtAiCfoLimit false when max is 0 (disabled/not configured)", () => {
    mockUseQuery.mockReturnValue({
      data: { aiCfoUsage: { aiCfoTokensUsed: 0, aiCfoTokensMax: 0 } },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAiCfoUsage());

    expect(result.current.isAtAiCfoLimit).toBe(false);
  });

  it("should return isAtAiCfoLimit false when max is -1 (unlimited)", () => {
    mockUseQuery.mockReturnValue({
      data: { aiCfoUsage: { aiCfoTokensUsed: 100, aiCfoTokensMax: -1 } },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAiCfoUsage());

    expect(result.current.isAtAiCfoLimit).toBe(false);
  });

  it("should return isAtAiCfoLimit true when used >= max", () => {
    mockUseQuery.mockReturnValue({
      data: { aiCfoUsage: { aiCfoTokensUsed: 10, aiCfoTokensMax: 10 } },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAiCfoUsage());

    expect(result.current.isAtAiCfoLimit).toBe(true);
  });

  it("should return isAtAiCfoLimit true when used exceeds max", () => {
    mockUseQuery.mockReturnValue({
      data: { aiCfoUsage: { aiCfoTokensUsed: 15, aiCfoTokensMax: 10 } },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAiCfoUsage());

    expect(result.current.isAtAiCfoLimit).toBe(true);
  });

  it("should return isAtAiCfoLimit false when used < max", () => {
    mockUseQuery.mockReturnValue({
      data: { aiCfoUsage: { aiCfoTokensUsed: 5, aiCfoTokensMax: 10 } },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAiCfoUsage());

    expect(result.current.isAtAiCfoLimit).toBe(false);
  });

  it("should return loading state properly", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAiCfoUsage());

    expect(result.current.isLoading).toBe(true);
  });

  it("should return isLoading false when not loading", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAiCfoUsage());

    expect(result.current.isLoading).toBe(false);
  });

  it("should return error when query errors", () => {
    const mockError = new Error("Network error");
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: mockError,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAiCfoUsage());

    expect(result.current.error).toBe(mockError);
  });

  it("should return usage data when available", () => {
    const usageData = { aiCfoTokensUsed: 3, aiCfoTokensMax: 20 };
    mockUseQuery.mockReturnValue({
      data: { aiCfoUsage: usageData },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAiCfoUsage());

    expect(result.current.usage).toEqual(usageData);
    expect(result.current.aiCfoTokensUsed).toBe(3);
    expect(result.current.aiCfoTokensMax).toBe(20);
  });

  it("should return refetch function", () => {
    const mockRefetch = vi.fn();
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useAiCfoUsage());

    expect(result.current.refetch).toBe(mockRefetch);
  });
});
