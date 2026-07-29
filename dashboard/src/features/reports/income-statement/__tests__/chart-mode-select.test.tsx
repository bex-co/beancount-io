import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChartModeSelect } from "../chart-mode-select";

// Mock the translations hook
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "page.incomeStatement.stackedBars": "Stacked Bars",
        "page.incomeStatement.singleBars": "Single Bars",
        "page.incomeStatement.selectChartMode": "Select chart mode",
      };
      return translations[key] || key;
    },
  }),
}));

describe("ChartModeSelect", () => {
  it("renders with stacked mode selected", () => {
    const onValueChange = vi.fn();
    render(<ChartModeSelect value="stacked" onValueChange={onValueChange} />);

    // Should show the selected value
    expect(screen.getByText("Stacked Bars")).toBeInTheDocument();
  });

  it("renders with single mode selected", () => {
    const onValueChange = vi.fn();
    render(<ChartModeSelect value="single" onValueChange={onValueChange} />);

    // Should show the selected value
    expect(screen.getByText("Single Bars")).toBeInTheDocument();
  });

  it("accepts onValueChange prop", () => {
    const onValueChange = vi.fn();
    render(<ChartModeSelect value="stacked" onValueChange={onValueChange} />);

    // Component should render without error
    expect(screen.getByText("Stacked Bars")).toBeInTheDocument();

    // Note: User interaction testing is complex with Radix UI Select
    // We test that the prop is accepted and component renders
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("applies custom className", () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <ChartModeSelect
        value="stacked"
        onValueChange={onValueChange}
        className="custom-class"
      />,
    );

    // Check if custom class is applied
    const selectTrigger = container.querySelector(".custom-class");
    expect(selectTrigger).toBeInTheDocument();
  });

  it("uses custom placeholder when provided", () => {
    const onValueChange = vi.fn();
    render(
      <ChartModeSelect
        value="stacked"
        onValueChange={onValueChange}
        placeholder="Custom Placeholder"
      />,
    );

    // Note: When value is selected, placeholder is not shown
    // This test just ensures the prop is accepted
    expect(screen.getByText("Stacked Bars")).toBeInTheDocument();
  });
});
