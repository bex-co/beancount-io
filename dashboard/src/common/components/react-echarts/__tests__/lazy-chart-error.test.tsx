import { render, screen } from "@testing-library/react";
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
    render(
      <ReactECharts
        option={{ series: [{ type: "line", data: [1] }] }}
        style={{ height: 320 }}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveStyle({ height: "320px" });
    expect(screen.getByText("An error occurred")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try Again" }),
    ).toBeInTheDocument();
  } finally {
    error.mockRestore();
  }
});
