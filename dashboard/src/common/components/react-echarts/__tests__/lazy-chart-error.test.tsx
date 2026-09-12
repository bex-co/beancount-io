import { act, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ReactECharts } from "../index";
vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../client", () => {
  throw new Error("Chart chunk unavailable");
});
it("contains a failed chart download in a stable panel with recovery", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    // Settle the chunk before rendering.
    //
    // `index.tsx` prefetches the client chunk at module scope and never awaits
    // it, and `React.lazy` starts its own import on first render. Whether
    // either has settled by the time React renders is a race the test does not
    // control, and when it loses, React has no rejection to report yet.
    await expect(import("../client")).rejects.toThrow();

    render(
      <ReactECharts
        option={{ series: [{ type: "line", data: [1] }] }}
        style={{ height: 320 }}
      />,
    );

    // Then flush React's queued Suspense retry rather than waiting it out.
    //
    // With the chunk already rejected, React still keeps the Suspense fallback
    // up until its concurrent scheduler works through the retry lane.
    // `findByRole` only polls the DOM, so the original test sat through ~240
    // scheduler yields (~300ms here). Those yields are budgeted in wall-clock
    // time slices, so under full-suite contention the wait stretched toward
    // `findBy`'s 1s ceiling — hence roughly one failure in three on a loaded
    // machine and none in isolation.
    //
    // Draining both — the import and the scheduler — leaves nothing timing
    // dependent to assert against: ~85ms, and no polling window at all.
    await act(async () => {});

    expect(screen.getByRole("alert")).toHaveStyle({ height: "320px" });
    expect(screen.getByText("An error occurred")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try Again" }),
    ).toBeInTheDocument();
  } finally {
    error.mockRestore();
  }
});
