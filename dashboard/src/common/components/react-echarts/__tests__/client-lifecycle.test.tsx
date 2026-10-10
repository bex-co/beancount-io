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
    getOption: vi.fn(),
    dispatchAction: vi.fn(),
    dispose: vi.fn(),
    resize: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
  },
}));

vi.mock("../runtime", () => ({
  APP_DARK_CHART_THEME: "app-dark",
  APP_LIGHT_CHART_THEME: "app-light",
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
  state.chart.getOption.mockReturnValue({});
  state.chart.dispose.mockImplementation(() => state.calls.push("dispose"));
});

it("applies the initial options once, then updates the same instance", () => {
  const option = { series: [{ type: "bar" as const, data: [1, 2] }] };
  const ref = createRef<EChartsRef>();
  const view = render(<ReactEChartsClient ref={ref} option={option} />);
  expect(state.calls).toEqual(["init", "setOption"]);
  expect(state.initThemes).toEqual(["app-light"]);
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
  expect(state.initThemes).toEqual(["app-light"]);
  state.calls.length = 0;
  state.initThemes.length = 0;
  state.isDark = true;
  view.rerender(<ReactEChartsClient option={option} />);
  expect(state.calls).toEqual(["dispose", "init", "setOption"]);
  expect(state.initThemes).toEqual(["app-dark"]);
});

it("restores only current selectable legend names after applying the same report defaults", () => {
  const option = {
    legend: [
      {
        data: ["USD", { name: "IRAUSD" }, "VACHR"],
        selected: { USD: true, IRAUSD: false, VACHR: false },
      },
      { data: ["Fees"], selectedMode: false as const },
    ],
    series: [{ type: "bar" as const, name: "USD", data: [1] }],
  };
  const view = render(<ReactEChartsClient option={option} />);
  state.chart.getOption
    .mockReturnValueOnce({
      legend: [
        {
          selected: {
            USD: true,
            IRAUSD: true,
            VACHR: false,
            obsolete: false,
          },
        },
        { selected: { Fees: false } },
      ],
    })
    .mockReturnValue(option);
  state.isDark = true;
  view.rerender(<ReactEChartsClient option={option} />);

  expect(state.chart.setOption).toHaveBeenLastCalledWith(option, {
    notMerge: false,
    lazyUpdate: false,
    silent: false,
  });
  expect(state.chart.dispatchAction.mock.calls).toEqual([
    [{ type: "legendSelect", name: "USD", legendIndex: 0 }, { silent: true }],
    [
      { type: "legendSelect", name: "IRAUSD", legendIndex: 0 },
      { silent: true },
    ],
    [
      { type: "legendUnSelect", name: "VACHR", legendIndex: 0 },
      { silent: true },
    ],
  ]);
  view.unmount();
});

it("keeps new report defaults when option and theme change together, then scopes later snapshots to that report", () => {
  const oldOption = {
    legend: { data: ["USD", "IRAUSD"] },
    series: [{ type: "bar" as const, name: "USD", data: [1] }],
  };
  const nextOption = {
    legend: { data: ["EUR"], selected: { EUR: false } },
    series: [{ type: "bar" as const, name: "EUR", data: [2] }],
  };
  const view = render(<ReactEChartsClient option={oldOption} />);
  state.chart.getOption.mockReturnValue({
    legend: [{ selected: { USD: true, IRAUSD: true } }],
  });
  state.isDark = true;
  view.rerender(<ReactEChartsClient option={nextOption} />);
  expect(state.chart.dispatchAction).not.toHaveBeenCalled();
  expect(state.chart.setOption).toHaveBeenLastCalledWith(nextOption, {
    notMerge: false,
    lazyUpdate: false,
    silent: false,
  });

  state.chart.getOption
    .mockReturnValueOnce({ legend: [{ selected: { EUR: true } }] })
    .mockReturnValue(nextOption);
  state.isDark = false;
  view.rerender(<ReactEChartsClient option={nextOption} />);
  expect(state.chart.dispatchAction).toHaveBeenCalledExactlyOnceWith(
    { type: "legendSelect", name: "EUR", legendIndex: 0 },
    { silent: true },
  );
  view.unmount();
});

it("does not recreate an explicitly themed chart when the app appearance changes", () => {
  const option = { series: [{ type: "line" as const, data: [1, 2] }] };
  const view = render(<ReactEChartsClient option={option} theme="custom" />);
  state.isDark = true;
  view.rerender(<ReactEChartsClient option={option} theme="custom" />);
  expect(state.initThemes).toEqual(["custom"]);
  expect(state.chart.dispose).not.toHaveBeenCalled();
  expect(state.chart.getOption).not.toHaveBeenCalled();
  expect(state.chart.dispatchAction).not.toHaveBeenCalled();
  view.unmount();
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

it("resizes when the container box changes without a window resize", () => {
  // A sidebar widening or a grid reflow resizes the chart's box while the
  // window stands still. Drive the observer the way the browser would.
  const observed: Element[] = [];
  let fire: (() => void) | undefined;
  let disconnected = 0;
  class SpyResizeObserver {
    constructor(callback: () => void) {
      fire = callback;
    }
    observe(target: Element) {
      observed.push(target);
    }
    unobserve() {}
    disconnect() {
      disconnected += 1;
    }
  }
  vi.stubGlobal("ResizeObserver", SpyResizeObserver);

  const option = { series: [{ type: "bar" as const, data: [1, 2] }] };
  const view = render(<ReactEChartsClient option={option} />);

  // The observed element is the chart's own container, not the document.
  expect(observed).toHaveLength(1);
  expect(observed[0]).toBe(view.container.querySelector("div > div"));

  expect(state.chart.resize).not.toHaveBeenCalled();
  act(() => fire?.());
  expect(state.chart.resize).toHaveBeenCalledOnce();

  view.unmount();
  expect(disconnected).toBe(1);
  vi.unstubAllGlobals();
});

it("keeps observing the container after the theme recreates the chart", () => {
  // The chart instance is disposed and re-created on a theme change. The
  // observer is set up once, so this checks it still drives the instance that
  // exists now rather than a disposed one — and that it is not torn down.
  let fire: (() => void) | undefined;
  let disconnected = 0;
  class SpyResizeObserver {
    constructor(callback: () => void) {
      fire = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {
      disconnected += 1;
    }
  }
  vi.stubGlobal("ResizeObserver", SpyResizeObserver);

  const option = { series: [{ type: "line" as const, data: [1, 2] }] };
  const view = render(<ReactEChartsClient option={option} />);

  state.isDark = true;
  view.rerender(<ReactEChartsClient option={option} />);
  expect(state.calls).toContain("dispose");
  expect(disconnected).toBe(0);

  act(() => fire?.());
  expect(state.chart.resize).toHaveBeenCalledOnce();

  view.unmount();
  expect(disconnected).toBe(1);
  vi.unstubAllGlobals();
});
