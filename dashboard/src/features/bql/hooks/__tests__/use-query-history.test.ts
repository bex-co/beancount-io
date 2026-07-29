import { renderHook, act } from "@testing-library/react";
import { useQueryHistory } from "../use-query-history";

describe("useQueryHistory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should initialize with empty history", () => {
    const { result } = renderHook(() => useQueryHistory());
    expect(result.current.history).toEqual([]);
  });

  it("should add query to history", () => {
    const { result } = renderHook(() => useQueryHistory());

    act(() => {
      result.current.addQuery("select * from accounts");
    });

    expect(result.current.history).toEqual(["select * from accounts"]);
  });

  it("should add query to front of history", () => {
    const { result } = renderHook(() => useQueryHistory());

    act(() => {
      result.current.addQuery("query1");
    });
    act(() => {
      result.current.addQuery("query2");
    });

    expect(result.current.history).toEqual(["query2", "query1"]);
  });

  it("should remove duplicates when adding query", () => {
    const { result } = renderHook(() => useQueryHistory());

    act(() => {
      result.current.addQuery("query1");
    });
    act(() => {
      result.current.addQuery("query2");
    });
    act(() => {
      result.current.addQuery("query1"); // Duplicate
    });

    expect(result.current.history).toEqual(["query1", "query2"]);
  });

  it("should ignore empty query strings", () => {
    const { result } = renderHook(() => useQueryHistory());

    act(() => {
      result.current.addQuery("");
      result.current.addQuery("   ");
    });

    expect(result.current.history).toEqual([]);
  });

  it("should limit history to MAX_HISTORY_SIZE (50)", () => {
    const { result } = renderHook(() => useQueryHistory());

    for (let i = 0; i < 60; i++) {
      act(() => {
        result.current.addQuery(`query${i}`);
      });
    }

    expect(result.current.history.length).toBe(50);
    // Most recent should be first
    expect(result.current.history[0]).toBe("query59");
    expect(result.current.history[49]).toBe("query10");
  });

  it("should remove specific query from history", () => {
    const { result } = renderHook(() => useQueryHistory());

    act(() => {
      result.current.addQuery("query1");
    });
    act(() => {
      result.current.addQuery("query2");
    });
    act(() => {
      result.current.addQuery("query3");
    });

    act(() => {
      result.current.removeQuery("query2");
    });

    expect(result.current.history).toEqual(["query3", "query1"]);
  });

  it("should clear all history", () => {
    const { result } = renderHook(() => useQueryHistory());

    act(() => {
      result.current.addQuery("query1");
    });
    act(() => {
      result.current.addQuery("query2");
    });

    expect(result.current.history.length).toBe(2);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.history).toEqual([]);
  });

  it("should handle corrupted localStorage data gracefully", () => {
    localStorage.setItem("beancount-query-history", "invalid json");

    const { result } = renderHook(() => useQueryHistory());

    // Should initialize with empty history instead of crashing
    expect(result.current.history).toEqual([]);
  });

  it("should handle non-array localStorage data gracefully", () => {
    localStorage.setItem(
      "beancount-query-history",
      JSON.stringify({ invalid: "data" }),
    );

    const { result } = renderHook(() => useQueryHistory());

    // Should initialize with empty history instead of crashing
    expect(result.current.history).toEqual([]);
  });

  it("should load valid history from localStorage", () => {
    const savedHistory = ["query1", "query2", "query3"];
    const getItemSpy = vi
      .spyOn(localStorage, "getItem")
      .mockReturnValue(JSON.stringify(savedHistory));

    const { result } = renderHook(() => useQueryHistory());

    expect(getItemSpy).toHaveBeenCalledWith("beancount-query-history");
    expect(result.current.history).toEqual(savedHistory);

    getItemSpy.mockRestore();
  });

  it("should handle localStorage.setItem failure gracefully", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { result } = renderHook(() => useQueryHistory());

    const setItemSpy = vi
      .spyOn(localStorage, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    act(() => {
      result.current.addQuery("query1");
    });

    // Should not crash; error is logged via useLocalStorageState
    expect(consoleSpy).toHaveBeenCalledWith(
      `Failed to write localStorage key "beancount-query-history":`,
      expect.any(Error),
    );

    // History in state should still be updated
    expect(result.current.history).toEqual(["query1"]);

    consoleSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it("should return stable function references across renders", () => {
    const { result, rerender } = renderHook(() => useQueryHistory());

    const addQuery1 = result.current.addQuery;
    const removeQuery1 = result.current.removeQuery;

    rerender();

    expect(result.current.addQuery).toBe(addQuery1);
    expect(result.current.removeQuery).toBe(removeQuery1);
  });
});
