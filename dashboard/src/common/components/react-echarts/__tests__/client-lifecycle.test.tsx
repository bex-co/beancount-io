import { createRef } from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ReactEChartsClient } from "../client";
import type { EChartsRef } from "../types";

const state = vi.hoisted(() => ({
  calls: [] as string[],
  chart: {
    setOption: vi.fn(),
    dispose: vi.fn(),
    resize: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
  },
}));
vi.mock("../runtime", () => ({
  init: () => {
    state.calls.push("init");
    return state.chart;
  },
}));
vi.mock("@/common/hooks/use-mobile", () => ({ useIsMobile: () => false }));
beforeEach(() => {
  vi.clearAllMocks();
  state.calls.length = 0;
  state.chart.setOption.mockImplementation(() => state.calls.push("setOption"));
  state.chart.dispose.mockImplementation(() => state.calls.push("dispose"));
});

it("applies the initial options once, then updates the same instance", () => {
  const option = { series: [{ type: "bar" as const, data: [1, 2] }] };
  const ref = createRef<EChartsRef>();
  const view = render(<ReactEChartsClient ref={ref} option={option} />);
  expect(state.calls).toEqual(["init", "setOption"]);
  const next = { series: [{ type: "bar" as const, data: [3, 4] }] };
  view.rerender(<ReactEChartsClient ref={ref} option={next} />);
  expect(state.chart.setOption).toHaveBeenLastCalledWith(next, {
    notMerge: false,
    lazyUpdate: false,
    silent: false,
  });
  expect(ref.current?.getEchartsInstance()).toBe(state.chart);
  view.unmount();
  expect(state.chart.dispose).toHaveBeenCalledOnce();
});

it("reapplies unchanged options and loading state when the theme recreates the chart", async () => {
  const option = { series: [{ type: "line" as const, data: [1, 2] }] };
  const ref = createRef<EChartsRef>();
  const view = render(
    <ReactEChartsClient ref={ref} option={option} showLoading />,
  );
  state.calls.length = 0;
  state.chart.showLoading.mockClear();
  view.rerender(
    <ReactEChartsClient ref={ref} option={option} theme="dark" showLoading />,
  );
  expect(state.calls).toEqual(["dispose", "init", "setOption"]);
  expect(state.chart.showLoading).toHaveBeenCalledOnce();
  expect(await ref.current?.getEchartsInstanceAsync()).toBe(state.chart);
  act(() => window.dispatchEvent(new Event("resize")));
  expect(state.chart.resize).toHaveBeenCalledOnce();
  view.unmount();
  act(() => window.dispatchEvent(new Event("resize")));
  expect(state.chart.resize).toHaveBeenCalledOnce();
});
