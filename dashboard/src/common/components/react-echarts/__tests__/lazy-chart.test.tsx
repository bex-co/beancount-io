import { createRef } from "react";
import { act, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ReactECharts } from "../index";
import type { EChartsProps, EChartsRef } from "../types";

const gate = vi.hoisted(() => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
});
vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../client", async () => {
  const { forwardRef, useImperativeHandle } = await import("react");
  await gate.promise;
  return {
    ReactEChartsClient: forwardRef<EChartsRef, EChartsProps>(
      function ReadyChart(props, ref) {
        useImperativeHandle(ref, () => ({
          getEchartsInstance: () => undefined,
          getEchartsInstanceAsync: async () => undefined,
        }));
        return <div data-testid="ready-chart" style={props.style} />;
      },
    ),
  };
});

it("reserves the chart dimensions while loading and forwards its ref when ready", async () => {
  const ref = createRef<EChartsRef>();
  const { container } = render(
    <ReactECharts
      ref={ref}
      option={{ series: [{ type: "bar", data: [1] }] }}
      style={{ height: 320, width: 480 }}
      className="report-chart"
    />,
  );
  expect(container.querySelector(".report-chart")).toHaveStyle({
    height: "320px",
    width: "480px",
  });
  expect(screen.queryByTestId("ready-chart")).not.toBeInTheDocument();
  expect(ref.current).toBeNull();
  await act(async () => gate.resolve());
  expect(await screen.findByTestId("ready-chart")).toHaveStyle({
    height: "320px",
    width: "480px",
  });
  expect(ref.current?.getEchartsInstanceAsync).toBeTypeOf("function");
});

it("keeps empty series out of the client renderer", () => {
  render(
    <ReactECharts
      option={{ series: [{ type: "bar", data: [] }] }}
      style={{ height: 300 }}
    />,
  );
  expect(screen.queryByTestId("ready-chart")).not.toBeInTheDocument();
  expect(screen.getByText("No Data Available")).toBeInTheDocument();
});
