import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { LedgerSearchParamsContext } from "@/common/providers/ledger-search-params-provider/context";
import { useLedgerSearchParams } from "../use-ledger-search-params";

describe("useLedgerSearchParams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return context values when used within provider", () => {
    const mockSetSearchParams = vi.fn();
    const mockContextValue = {
      searchParams: {
        account: "Assets:Bank",
        filter: "tag:#vacation",
        time: "2024",
      },
      setSearchParams: mockSetSearchParams,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        LedgerSearchParamsContext.Provider,
        { value: mockContextValue },
        children,
      );

    const { result } = renderHook(() => useLedgerSearchParams(), { wrapper });

    expect(result.current.searchParams.account).toBe("Assets:Bank");
    expect(result.current.searchParams.filter).toBe("tag:#vacation");
    expect(result.current.searchParams.time).toBe("2024");
    expect(result.current.setSearchParams).toBe(mockSetSearchParams);
  });

  it("should allow setting searchParams through setSearchParams", () => {
    const mockSetSearchParams = vi.fn();
    const mockContextValue = {
      searchParams: {
        account: "",
        filter: "",
        time: "",
      },
      setSearchParams: mockSetSearchParams,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        LedgerSearchParamsContext.Provider,
        { value: mockContextValue },
        children,
      );

    const { result } = renderHook(() => useLedgerSearchParams(), { wrapper });

    const newSearchParams = {
      account: "Expenses:Food",
      filter: "payee:Walmart",
      time: "2024-01",
    };

    act(() => {
      result.current.setSearchParams(newSearchParams);
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(newSearchParams);
  });

  it("should handle empty searchParams", () => {
    const mockSetSearchParams = vi.fn();
    const mockContextValue = {
      searchParams: {
        account: "",
        filter: "",
        time: "",
      },
      setSearchParams: mockSetSearchParams,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        LedgerSearchParamsContext.Provider,
        { value: mockContextValue },
        children,
      );

    const { result } = renderHook(() => useLedgerSearchParams(), { wrapper });

    expect(result.current.searchParams.account).toBe("");
    expect(result.current.searchParams.filter).toBe("");
    expect(result.current.searchParams.time).toBe("");
  });

  it("should handle complex filter values", () => {
    const mockSetSearchParams = vi.fn();
    const mockContextValue = {
      searchParams: {
        account: "Assets:Bank:Checking OR Assets:Bank:Savings",
        filter: 'payee:"My Company" AND tag:#business',
        time: "2023-01-01 - 2024-12-31",
      },
      setSearchParams: mockSetSearchParams,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        LedgerSearchParamsContext.Provider,
        { value: mockContextValue },
        children,
      );

    const { result } = renderHook(() => useLedgerSearchParams(), { wrapper });

    expect(result.current.searchParams.account).toBe(
      "Assets:Bank:Checking OR Assets:Bank:Savings",
    );
    expect(result.current.searchParams.filter).toBe(
      'payee:"My Company" AND tag:#business',
    );
    expect(result.current.searchParams.time).toBe("2023-01-01 - 2024-12-31");
  });

  it("should return different values for different contexts", () => {
    const context1 = {
      searchParams: { account: "Assets", filter: "", time: "2024" },
      setSearchParams: vi.fn(),
    };

    const context2 = {
      searchParams: { account: "Expenses", filter: "tag:#home", time: "2023" },
      setSearchParams: vi.fn(),
    };

    const wrapper1 = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        LedgerSearchParamsContext.Provider,
        { value: context1 },
        children,
      );

    const wrapper2 = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        LedgerSearchParamsContext.Provider,
        { value: context2 },
        children,
      );

    const { result: result1 } = renderHook(() => useLedgerSearchParams(), {
      wrapper: wrapper1,
    });
    const { result: result2 } = renderHook(() => useLedgerSearchParams(), {
      wrapper: wrapper2,
    });

    expect(result1.current.searchParams.account).toBe("Assets");
    expect(result2.current.searchParams.account).toBe("Expenses");
    expect(result1.current.searchParams.time).toBe("2024");
    expect(result2.current.searchParams.time).toBe("2023");
  });

  it("should allow clearing all searchParams", () => {
    const mockSetSearchParams = vi.fn();
    const mockContextValue = {
      searchParams: {
        account: "Assets:Bank",
        filter: "tag:#vacation",
        time: "2024",
      },
      setSearchParams: mockSetSearchParams,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        LedgerSearchParamsContext.Provider,
        { value: mockContextValue },
        children,
      );

    const { result } = renderHook(() => useLedgerSearchParams(), { wrapper });

    const clearedFilters = {
      account: "",
      filter: "",
      time: "",
    };

    act(() => {
      result.current.setSearchParams(clearedFilters);
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(clearedFilters);
  });

  it("should allow partial filter updates by passing full filter object", () => {
    const mockSetSearchParams = vi.fn();
    const mockContextValue = {
      searchParams: {
        account: "Assets:Bank",
        filter: "tag:#vacation",
        time: "2024",
      },
      setSearchParams: mockSetSearchParams,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        LedgerSearchParamsContext.Provider,
        { value: mockContextValue },
        children,
      );

    const { result } = renderHook(() => useLedgerSearchParams(), { wrapper });

    // Update only account while keeping other values
    const updatedFilters = {
      account: "Expenses:Food",
      filter: "tag:#vacation",
      time: "2024",
    };

    act(() => {
      result.current.setSearchParams(updatedFilters);
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(updatedFilters);
  });

  it("should handle special characters in filter values", () => {
    const mockSetSearchParams = vi.fn();
    const mockContextValue = {
      searchParams: {
        account: "Assets:Bank:中文账户",
        filter: "payee:Café & Restaurant",
        time: "2024-Q1",
      },
      setSearchParams: mockSetSearchParams,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        LedgerSearchParamsContext.Provider,
        { value: mockContextValue },
        children,
      );

    const { result } = renderHook(() => useLedgerSearchParams(), { wrapper });

    expect(result.current.searchParams.account).toBe("Assets:Bank:中文账户");
    expect(result.current.searchParams.filter).toBe("payee:Café & Restaurant");
    expect(result.current.searchParams.time).toBe("2024-Q1");
  });

  describe("default context behavior", () => {
    it("should provide default empty searchParams when using default context", () => {
      // Test with the default context value (from context.ts)
      const { result } = renderHook(() => useLedgerSearchParams());

      expect(result.current.searchParams.account).toBe("");
      expect(result.current.searchParams.filter).toBe("");
      expect(result.current.searchParams.time).toBe("");
    });

    it("should provide a no-op setSearchParams when using default context", () => {
      const { result } = renderHook(() => useLedgerSearchParams());

      // Default setSearchParams is a no-op function, calling it should not throw
      expect(() => {
        act(() => {
          result.current.setSearchParams({
            account: "test",
            filter: "test",
            time: "test",
          });
        });
      }).not.toThrow();
    });
  });
});
