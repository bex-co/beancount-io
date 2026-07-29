import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DASHBOARD_WIDGET_IDS,
  normalizeDashboardLayout,
  useDashboardLayout,
} from "../use-dashboard-layout";

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.mocked(window.localStorage.getItem).mockImplementation(
    (key) => storage.get(key) ?? null,
  );
  vi.mocked(window.localStorage.setItem).mockImplementation((key, value) => {
    storage.set(key, value);
  });
  vi.mocked(window.localStorage.removeItem).mockImplementation((key) => {
    storage.delete(key);
  });
  vi.mocked(window.localStorage.clear).mockImplementation(() => {
    storage.clear();
  });
});

describe("normalizeDashboardLayout", () => {
  it("repairs stale IDs, duplicates, and newly introduced widgets", () => {
    const result = normalizeDashboardLayout({
      version: 0,
      order: ["recent-activity", "removed-widget", "recent-activity"],
      hidden: ["cash-flow", "removed-widget", "cash-flow"],
    });

    expect(result.version).toBe(1);
    expect(result.order[0]).toBe("recent-activity");
    expect(result.order).toHaveLength(DASHBOARD_WIDGET_IDS.length);
    expect(new Set(result.order)).toEqual(new Set(DASHBOARD_WIDGET_IDS));
    expect(result.hidden).toEqual(["cash-flow"]);
  });

  it("falls back to the complete default layout for invalid data", () => {
    const result = normalizeDashboardLayout(null);
    expect(result.order).toEqual(DASHBOARD_WIDGET_IDS);
    expect(result.hidden).toEqual([]);
  });

  it("persists visibility and order independently for each ledger", () => {
    const first = renderHook(() => useDashboardLayout("owner/first"));

    act(() => {
      first.result.current.setVisible("cash-flow", false);
      first.result.current.move("recent-activity", -1);
    });

    expect(
      window.localStorage.getItem("ledger.owner/first.overview.layout.v1"),
    ).toContain("cash-flow");
    expect(first.result.current.layout.hidden).toContain("cash-flow");
    expect(first.result.current.layout.order.indexOf("recent-activity")).toBe(
      1,
    );
    first.unmount();

    const restored = renderHook(() => useDashboardLayout("owner/first"));
    expect(restored.result.current.layout.hidden).toContain("cash-flow");
    expect(
      restored.result.current.layout.order.indexOf("recent-activity"),
    ).toBe(1);

    const otherLedger = renderHook(() => useDashboardLayout("owner/second"));
    expect(otherLedger.result.current.layout.hidden).toEqual([]);
    expect(otherLedger.result.current.layout.order).toEqual(
      DASHBOARD_WIDGET_IDS,
    );
  });
});
