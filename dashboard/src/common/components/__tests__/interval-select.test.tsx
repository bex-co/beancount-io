import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntervalSelect } from "../interval-select";
import type { ChartInterval } from "@/common/types/chart";

describe("IntervalSelect", () => {
  const mockOnValueChange = vi.fn();

  const defaultProps = {
    value: "monthly" as ChartInterval,
    onValueChange: mockOnValueChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with monthly value", () => {
    render(<IntervalSelect {...defaultProps} value="monthly" />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("Monthly")).toBeInTheDocument();
  });

  it("should render with yearly value", () => {
    render(<IntervalSelect {...defaultProps} value="yearly" />);

    expect(screen.getByText("Yearly")).toBeInTheDocument();
  });

  it("should render with quarterly value", () => {
    render(<IntervalSelect {...defaultProps} value="quarterly" />);

    expect(screen.getByText("Quarterly")).toBeInTheDocument();
  });

  it("should render with weekly value", () => {
    render(<IntervalSelect {...defaultProps} value="weekly" />);

    expect(screen.getByText("Weekly")).toBeInTheDocument();
  });

  it("should render with daily value", () => {
    render(<IntervalSelect {...defaultProps} value="daily" />);

    expect(screen.getByText("Daily")).toBeInTheDocument();
  });

  it("should have correct default className", () => {
    render(<IntervalSelect {...defaultProps} />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveClass("w-fit");
  });

  it("should allow overriding the default className", () => {
    render(<IntervalSelect {...defaultProps} className="w-40" />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveClass("w-40");
  });

  it("should render with sm size by default", () => {
    render(<IntervalSelect {...defaultProps} />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("data-size", "sm");
  });

  it("should render with default size when specified", () => {
    render(<IntervalSelect {...defaultProps} size="default" />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("data-size", "default");
  });

  it("should render with correct data-slot attribute", () => {
    render(<IntervalSelect {...defaultProps} />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("data-slot", "select-trigger");
  });

  it("should support custom placeholder", () => {
    // When placeholder is provided but value is set, it shows value
    render(
      <IntervalSelect {...defaultProps} placeholder="Custom placeholder" />,
    );

    // The trigger should be rendered
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should render as combobox role", () => {
    render(<IntervalSelect {...defaultProps} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
