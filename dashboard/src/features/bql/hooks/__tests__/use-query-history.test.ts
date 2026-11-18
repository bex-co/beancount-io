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

  // The setup's Storage is a stub: getItem must actually return the stored
  // text, or the parse-error fallback is all that runs (w4/272).
  it.each([
    ["null", "null"],
    ["an object", JSON.stringify({ qa: "qa-20261020 controlled wrong shape" })],
    ["a number", "7"],
  ])("recovers usable history from %s", (_case, stored) => {
    const getItemSpy = vi
      .spyOn(localStorage, "getItem")
      .mockReturnValue(stored);

    const { result } = renderHook(() => useQueryHistory());
    expect(result.current.history).toEqual([]);
    act(() => result.current.addQuery("SELECT 9"));
    expect(result.current.history).toEqual(["SELECT 9"]);

    getItemSpy.mockRestore();
  });

  it("keeps only the query strings of a mixed array", () => {
    const getItemSpy = vi
      .spyOn(localStorage, "getItem")
      .mockReturnValue(JSON.stringify(["SELECT 1", 2, null, "SELECT 3"]));

    const { result } = renderHook(() => useQueryHistory());
    expect(result.current.history).toEqual(["SELECT 1", "SELECT 3"]);

    getItemSpy.mockRestore();
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

  // Two tabs are two hook instances over one shared storage: the second
  // tab mounts before the first tab writes, so its update must merge with
  // what is stored, not with the snapshot it mounted with (w5/1172). The
  // global setup's Storage is a non-persisting stub, so these tests back it
  // with a real in-memory map for their duration.
  function installMemoryStorage(): () => void {
    const store = new Map<string, string>();
    const spies = [
      vi
        .spyOn(localStorage, "getItem")
        .mockImplementation((key: string) =>
          store.has(key) ? (store.get(key) as string) : null,
        ),
      vi
        .spyOn(localStorage, "setItem")
        .mockImplementation((key: string, value: string) => {
          store.set(key, String(value));
        }),
      vi.spyOn(localStorage, "removeItem").mockImplementation((key: string) => {
        store.delete(key);
      }),
      vi.spyOn(localStorage, "clear").mockImplementation(() => {
        store.clear();
      }),
    ];
    return () => spies.forEach((spy) => spy.mockRestore());
  }

  function readStoredHistory(): string[] {
    return JSON.parse(localStorage.getItem("beancount-query-history") ?? "[]");
  }

  it("keeps both tabs' queries when two instances write in turn", () => {
    const restore = installMemoryStorage();
    try {
      const tabA = renderHook(() => useQueryHistory());
      const tabB = renderHook(() => useQueryHistory());

      act(() => {
        tabA.result.current.addQuery("SELECT 'qa-a1' AS probe");
      });
      act(() => {
        tabA.result.current.addQuery("SELECT 'qa-a2' AS probe");
      });
      act(() => {
        tabB.result.current.addQuery("SELECT 'qa-b1' AS probe");
      });

      const stored = readStoredHistory();
      expect(stored).toEqual([
        "SELECT 'qa-b1' AS probe",
        "SELECT 'qa-a2' AS probe",
        "SELECT 'qa-a1' AS probe",
      ]);
      // A tab opened later lists every tab's queries.
      const tabC = renderHook(() => useQueryHistory());
      expect(tabC.result.current.history).toEqual(stored);
    } finally {
      restore();
    }
  });

  it("does not resurrect a query that both tabs had loaded and one deleted", () => {
    const restore = installMemoryStorage();
    try {
      localStorage.setItem(
        "beancount-query-history",
        JSON.stringify(["query2", "query1"]),
      );
      const tabA = renderHook(() => useQueryHistory());
      const tabB = renderHook(() => useQueryHistory());
      expect(tabB.result.current.history).toEqual(["query2", "query1"]);

      act(() => {
        tabA.result.current.removeQuery("query1");
      });
      act(() => {
        tabB.result.current.addQuery("query3");
      });

      expect(readStoredHistory()).toEqual(["query3", "query2"]);
    } finally {
      restore();
    }
  });

  it("does not resurrect a query another instance deleted", () => {
    const restore = installMemoryStorage();
    try {
      const tabA = renderHook(() => useQueryHistory());
      const tabB = renderHook(() => useQueryHistory());

      act(() => {
        tabA.result.current.addQuery("query1");
      });
      act(() => {
        tabA.result.current.addQuery("query2");
      });
      act(() => {
        tabA.result.current.removeQuery("query1");
      });
      act(() => {
        tabB.result.current.addQuery("query3");
      });

      expect(readStoredHistory()).toEqual(["query3", "query2"]);
    } finally {
      restore();
    }
  });

  it("should return stable function references across renders", () => {
    const { result, rerender } = renderHook(() => useQueryHistory());

    const addQuery1 = result.current.addQuery;
    const removeQuery1 = result.current.removeQuery;

    rerender();

    expect(result.current.addQuery).toBe(addQuery1);
    expect(result.current.removeQuery).toBe(removeQuery1);
  });

  // One browser, two users: sign-out must not leak the first user's queries
  // to the next visitor (w5/1130). Each signed-in user gets their own key.
  it("keeps each signed-in user's history under their own key", () => {
    const restore = installMemoryStorage();
    try {
      const alice = renderHook(() => useQueryHistory("alice-id"));
      act(() => {
        alice.result.current.addQuery("SELECT 'qa-alice' AS probe");
      });

      // Bob signs in on the same browser: Alice's queries are not his.
      const bob = renderHook(() => useQueryHistory("bob-id"));
      expect(bob.result.current.history).toEqual([]);
      act(() => {
        bob.result.current.addQuery("SELECT 'qa-bob' AS probe");
      });

      expect(
        JSON.parse(
          localStorage.getItem("beancount-query-history.alice-id") ?? "[]",
        ),
      ).toEqual(["SELECT 'qa-alice' AS probe"]);
      expect(
        JSON.parse(
          localStorage.getItem("beancount-query-history.bob-id") ?? "[]",
        ),
      ).toEqual(["SELECT 'qa-bob' AS probe"]);
      // Nobody writes the shared legacy bucket anymore.
      expect(localStorage.getItem("beancount-query-history")).toBeNull();
      // Alice's history is intact when she returns.
      expect(
        renderHook(() => useQueryHistory("alice-id")).result.current.history,
      ).toEqual(["SELECT 'qa-alice' AS probe"]);
    } finally {
      restore();
    }
  });
});
