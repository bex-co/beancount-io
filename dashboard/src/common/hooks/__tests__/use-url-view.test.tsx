import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUrlView } from "../use-url-view";

/**
 * The view a page shows follows the reader's latest choice while its
 * navigation is still loading, and falls back to the URL once that navigation
 * settles, landed or not (w4/1008). The router lifecycle itself is covered by
 * the Holdings page's held-navigation test.
 */
const router = vi.hoisted(() => ({
  search: {} as Record<string, unknown>,
  navigate: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  useSearch: () => router.search,
  useNavigate: () => router.navigate,
}));

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const VIEWS = ["income", "expenses", "netProfit"] as const;

beforeEach(() => {
  router.search = {};
  router.navigate.mockReset();
});

describe("useUrlView", () => {
  it("goes back to the rendered view when it is chosen again before another lands", async () => {
    const first = deferred();
    const second = deferred();
    router.navigate
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useUrlView("/report", VIEWS, "income"));

    act(() => result.current[1]("expenses"));
    expect(result.current[0]).toBe("expenses");
    act(() => result.current[1]("income"));

    // The return is a navigation of its own, back to the clean default URL.
    expect(router.navigate).toHaveBeenCalledTimes(2);
    const back = router.navigate.mock.calls[1]![0] as {
      search: (previous: Record<string, unknown>) => Record<string, unknown>;
    };
    expect(back.search({ view: "expenses", time: "2016" })).toEqual({
      view: undefined,
      time: "2016",
    });
    expect(result.current[0]).toBe("income");

    await act(async () => {
      first.resolve();
      second.resolve();
    });
    expect(result.current[0]).toBe("income");
  });

  it("returns to the URL's view when a choice's navigation fails", async () => {
    const failing = deferred();
    router.navigate.mockReturnValueOnce(failing.promise);
    const { result } = renderHook(() => useUrlView("/report", VIEWS, "income"));

    act(() => result.current[1]("netProfit"));
    expect(result.current[0]).toBe("netProfit");
    await act(async () => failing.reject(new Error("navigation cancelled")));
    expect(result.current[0]).toBe("income");
  });

  it("ignores an unchanged or unknown choice", () => {
    router.search = { view: "expenses" };
    const { result } = renderHook(() => useUrlView("/report", VIEWS, "income"));
    act(() => result.current[1]("expenses"));
    act(() => result.current[1]("nonsense"));
    expect(router.navigate).not.toHaveBeenCalled();
    expect(result.current[0]).toBe("expenses");
  });

  it("can keep the default spelled out", () => {
    router.search = { view: "by-account" };
    router.navigate.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useUrlView("/holdings", ["holdings", "by-account"], "holdings", "view", {
        writeFallback: true,
      }),
    );
    act(() => result.current[1]("holdings"));
    const call = router.navigate.mock.calls[0]![0] as {
      search: (previous: Record<string, unknown>) => Record<string, unknown>;
    };
    expect(call.search({ view: "by-account" })).toEqual({ view: "holdings" });
  });
});
