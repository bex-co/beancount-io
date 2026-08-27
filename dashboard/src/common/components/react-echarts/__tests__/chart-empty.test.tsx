import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChartEmpty } from "../chart-empty";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) =>
      key === "component.emptyState.title" ? "No hay datos" : key,
  }),
}));

describe("ChartEmpty", () => {
  it("uses the translated shared empty-state message by default", () => {
    render(<ChartEmpty />);

    expect(screen.getByText("No hay datos")).toBeInTheDocument();
  });

  it("allows callers to provide a contextual message", () => {
    render(<ChartEmpty message="Sin movimientos" />);

    expect(screen.getByText("Sin movimientos")).toBeInTheDocument();
  });
});
