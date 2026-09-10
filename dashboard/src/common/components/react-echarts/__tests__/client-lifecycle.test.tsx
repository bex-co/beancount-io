import { createRef } from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ReactEChartsClient } from "../client";
import type { EChartsRef } from "../types";

const state = vi.hoisted(() => ({
  calls: [] as string[],
  initThemes: [] as Array<string | undefined | object>,
  isDark: false,
  chart: {
    setOption: vi.fn(),
    dispose: vi.fn(),
    resize: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
  },
}));

vi.mock("../runtime", () => ({
  APP_DARK_CHART_THEME: "app-dark",
  init: (_el: HTMLElement, theme?: string) => {
    state.calls.push("init");
    state.initThemes.push(theme);
    return state.chart;
  },
}));
vi.mock("@/common/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/common/providers/theme-provider", () => ({
  useIsDarkTheme: () => state.isDark,
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.calls.length = 0;
  state.initThemes.length = 0;
  state.isDark = false;
  state.chart.setOption.mockImplementation(() => state.calls.push("setOption"));
  state.chart.dispose.mockImplementation(() => state.calls.push("dispose"));
});

it("applies the initial options once, then updates the same instance", () => {
  const option = { series: [{ type: "bar" as const, data: [1, 2] }] };
  const ref = createRef<EChartsRef>();
  const view = render(<ReactEChartsClient ref={ref} option={option} />);
  expect(state.calls).toEqual(["init", "setOption"]);
  expect(state.initThemes).toEqual([undefined]);
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

it("defaults init to the app-dark theme when the app appearance is dark", () => {
  state.isDark = true;
  const option = { series: [{ type: "line" as const, data: [1, 2] }] };
  render(<ReactEChartsClient option={option} />);
  expect(state.initThemes).toEqual(["app-dark"]);
});

it("preserves an explicit caller theme over the app appearance", () => {
  state.isDark = true;
  const option = { series: [{ type: "line" as const, data: [1, 2] }] };
  render(<ReactEChartsClient option={option} theme="custom" />);
  expect(state.initThemes).toEqual(["custom"]);
});

it("recreates the chart when the resolved app appearance changes", () => {
  const option = { series: [{ type: "line" as const, data: [1, 2] }] };
  const view = render(<ReactEChartsClient option={option} />);
  expect(state.initThemes).toEqual([undefined]);
  state.calls.length = 0;
  state.initThemes.length = 0;
  state.isDark = true;
  view.rerender(<ReactEChartsClient option={option} />);
  expect(state.calls).toEqual(["dispose", "init", "setOption"]);
  expect(state.initThemes).toEqual(["app-dark"]);
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
