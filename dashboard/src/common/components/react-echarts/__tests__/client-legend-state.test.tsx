import { createRef } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EChartsOption } from "echarts";
import type { ECharts } from "echarts/core";
import { ThemeProvider } from "@/common/providers/theme-provider";
import { ReactEChartsClient } from "../client";
import type { EChartsRef } from "../types";

// jsdom cannot paint a canvas. Keep the installed registry, themes, model and
// SDK action handling; adapt only the renderer, dimensions and text metrics.
// Native browser pointer checks separately exercise the production canvas.
vi.mock("../runtime", async () => {
  const runtime =
    await vi.importActual<typeof import("../runtime")>("../runtime");
  const { use, setPlatformAPI } = await import("echarts/core");
  const { SVGRenderer } = await import("echarts/renderers");
  use(SVGRenderer);
  setPlatformAPI({ measureText: (text) => ({ width: text.length * 7 }) });
  return {
    ...runtime,
    init: (element: HTMLElement, theme?: string) =>
      runtime.init(element, theme, {
        renderer: "svg",
        ssr: true,
        width: 600,
        height: 300,
      }),
  };
});

type MediaListener = (event: MediaQueryListEvent) => void;

function installMedia() {
  let dark = false;
  const queries = new Map<
    string,
    { matches: boolean; listeners: Set<MediaListener> }
  >();
  const matches = (query: string) =>
    query.includes("prefers-color-scheme") ? dark : window.innerWidth < 768;
  vi.stubGlobal("matchMedia", (query: string) => {
    const entry = queries.get(query) ?? {
      matches: matches(query),
      listeners: new Set<MediaListener>(),
    };
    queries.set(query, entry);
    return {
      get matches() {
        return entry.matches;
      },
      media: query,
      addEventListener: (_type: string, listener: MediaListener) =>
        entry.listeners.add(listener),
      removeEventListener: (_type: string, listener: MediaListener) =>
        entry.listeners.delete(listener),
    };
  });
  const notify = () => {
    for (const [query, entry] of queries) {
      const next = matches(query);
      if (next === entry.matches) continue;
      entry.matches = next;
      for (const listener of entry.listeners) {
        listener({ matches: next, media: query } as MediaQueryListEvent);
      }
    }
  };
  return {
    setDark(value: boolean) {
      dark = value;
      notify();
    },
    setWidth(value: number) {
      vi.stubGlobal("innerWidth", value);
      notify();
      window.dispatchEvent(new Event("resize"));
    },
  };
}

function reportOption(): EChartsOption {
  return {
    animation: false,
    legend: {
      data: ["USD", "IRAUSD", "VACHR"],
      selected: { USD: true, IRAUSD: false, VACHR: false },
    },
    xAxis: { type: "category", data: ["2016-02"] },
    yAxis: { type: "value" },
    series: [
      { name: "USD", type: "bar", data: [-3055.88] },
      { name: "IRAUSD", type: "bar", data: [2400] },
      { name: "VACHR", type: "bar", data: [10] },
    ],
  };
}

function instance(ref: React.RefObject<EChartsRef | null>): ECharts {
  const chart = ref.current?.getEchartsInstance();
  if (!chart) throw new Error("Expected an initialized chart");
  return chart;
}

function selected(chart: ECharts): Record<string, boolean> {
  const option = chart.getOption() as {
    legend: Array<{ selected: Record<string, boolean> }>;
  };
  return option.legend[0].selected;
}

function view(
  ref: React.RefObject<EChartsRef | null>,
  option: EChartsOption,
  theme?: string,
  notMerge = false,
) {
  return (
    <ThemeProvider defaultTheme="system">
      <ReactEChartsClient
        ref={ref}
        option={option}
        theme={theme}
        notMerge={notMerge}
      />
    </ThemeProvider>
  );
}

beforeEach(() => {
  vi.stubGlobal("innerWidth", 1440);
  delete window.__THEME__;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.classList.remove("dark", "light");
});

describe("real ECharts legend state through wrapper updates", () => {
  it("keeps a chosen IRAUSD series through System Light → Dark → Light", () => {
    const media = installMedia();
    const option = reportOption();
    const unchangedOption = JSON.stringify(option);
    const ref = createRef<EChartsRef>();
    render(view(ref, option));
    const initial = instance(ref);
    expect(selected(initial)).toEqual({
      USD: true,
      IRAUSD: false,
      VACHR: false,
    });

    // This is a synthetic SDK interaction with the real installed model,
    // rather than an invented getOption result or a production pointer claim.
    act(() =>
      initial.dispatchAction({ type: "legendToggleSelect", name: "IRAUSD" }),
    );
    const choice = { USD: true, IRAUSD: true, VACHR: false };
    expect(selected(initial)).toEqual(choice);

    act(() => media.setDark(true));
    const dark = instance(ref);
    expect(document.documentElement).toHaveClass("dark");
    expect(selected(dark)).toEqual(choice);
    expect(dark.renderToSVGString().toLowerCase()).toContain("#b9b8ce");

    act(() => media.setDark(false));
    const light = instance(ref);
    expect(document.documentElement).toHaveClass("light");
    expect(selected(light)).toEqual(choice);
    expect(light.renderToSVGString().toLowerCase()).toContain("#646973");
    expect(JSON.stringify(option)).toBe(unchangedOption);
  });

  it("keeps explicit Light appearance and selection through system changes", () => {
    const media = installMedia();
    const option = reportOption();
    const ref = createRef<EChartsRef>();
    render(view(ref, option, "app-light"));
    const chart = instance(ref);
    act(() =>
      chart.dispatchAction({ type: "legendToggleSelect", name: "IRAUSD" }),
    );

    for (const dark of [true, false]) {
      act(() => media.setDark(dark));
      expect(instance(ref).id).toBe(chart.id);
      expect(selected(chart)).toEqual({
        USD: true,
        IRAUSD: true,
        VACHR: false,
      });
    }
  });

  it.each([
    [1440, 1100, 1440, 390, 500, 390, 1440],
    [390, 500, 390, 1440, 1100, 1440, 390],
  ])(
    "preserves selection within and across breakpoints starting at %i",
    (...widths) => {
      const media = installMedia();
      media.setWidth(widths[0]);
      const option = reportOption();
      const ref = createRef<EChartsRef>();
      render(view(ref, option, "app-light"));
      const chart = instance(ref);
      act(() =>
        chart.dispatchAction({ type: "legendToggleSelect", name: "IRAUSD" }),
      );

      for (const width of widths.slice(1)) {
        act(() => media.setWidth(width));
        expect(instance(ref).id).toBe(chart.id);
        expect(chart.isDisposed()).toBeFalsy();
        expect(selected(chart)).toEqual({
          USD: true,
          IRAUSD: true,
          VACHR: false,
        });
      }
    },
  );

  it("uses changed report defaults without reviving obsolete series during a theme update", () => {
    const media = installMedia();
    const ref = createRef<EChartsRef>();
    const initialOption = reportOption();
    const rendered = render(view(ref, initialOption));
    act(() =>
      instance(ref).dispatchAction({
        type: "legendToggleSelect",
        name: "IRAUSD",
      }),
    );

    const changedOption: EChartsOption = {
      ...reportOption(),
      legend: { data: ["USD", "EUR"], selected: { USD: false, EUR: true } },
      series: [
        { name: "USD", type: "bar", data: [-4400] },
        { name: "EUR", type: "bar", data: [3500] },
      ],
    };
    act(() => {
      media.setDark(true);
      rendered.rerender(view(ref, changedOption));
    });
    expect(selected(instance(ref))).toEqual({ USD: false, EUR: true });
    const series = instance(ref).getOption().series as Array<{
      name: string;
      data: number[];
    }>;
    expect(series.map(({ name, data }) => ({ name, data }))).toEqual([
      { name: "USD", data: [-4400] },
      { name: "EUR", data: [3500] },
    ]);

    act(() => media.setDark(false));
    expect(selected(instance(ref))).toEqual({ USD: false, EUR: true });
  });

  it("retains selection when legend names are derived from the current series", () => {
    const media = installMedia();
    const option = reportOption();
    option.legend = { selected: { USD: true, IRAUSD: false, VACHR: false } };
    const ref = createRef<EChartsRef>();
    render(view(ref, option));
    act(() =>
      instance(ref).dispatchAction({
        type: "legendToggleSelect",
        name: "IRAUSD",
      }),
    );

    for (const dark of [true, false]) {
      act(() => media.setDark(dark));
      expect(selected(instance(ref))).toEqual({
        USD: true,
        IRAUSD: true,
        VACHR: false,
      });
    }
  });

  it("keeps the chosen single-selection legend without enabling other series", () => {
    const media = installMedia();
    const option = reportOption();
    option.legend = {
      data: ["USD", "IRAUSD", "VACHR"],
      selectedMode: "single",
      selected: { USD: true, IRAUSD: false, VACHR: false },
    };
    const ref = createRef<EChartsRef>();
    render(view(ref, option));
    act(() =>
      instance(ref).dispatchAction({
        type: "legendToggleSelect",
        name: "IRAUSD",
      }),
    );

    for (const dark of [true, false]) {
      act(() => media.setDark(dark));
      expect(selected(instance(ref))).toEqual({
        USD: false,
        IRAUSD: true,
        VACHR: false,
      });
    }
  });
});
