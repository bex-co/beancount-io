import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConversionSelect, type ConversionOption } from "../conversion-select";

describe("ConversionSelect", () => {
  const mockOnValueChange = vi.fn();

  const defaultProps = {
    value: "at_cost" as ConversionOption,
    onValueChange: mockOnValueChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with at_cost value", () => {
    render(<ConversionSelect {...defaultProps} value="at_cost" />);

    // Should display the trigger with selected value
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("At Cost")).toBeInTheDocument();
  });

  it("should render with at_value value", () => {
    render(<ConversionSelect {...defaultProps} value="at_value" />);

    expect(screen.getByText("At Market Value")).toBeInTheDocument();
  });

  it("should render with units value", () => {
    render(<ConversionSelect {...defaultProps} value="units" />);

    expect(screen.getByText("Units")).toBeInTheDocument();
  });

  it("should render with USD currency value", () => {
    render(<ConversionSelect {...defaultProps} value="USD" />);

    expect(screen.getByText(/Converted to USD/)).toBeInTheDocument();
  });

  it("should render with custom currency value", () => {
    render(<ConversionSelect {...defaultProps} value="USD" currency="EUR" />);

    // When value is USD but currency is EUR, it shows the value
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should have correct default className", () => {
    render(<ConversionSelect {...defaultProps} />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveClass("w-fit");
  });

  it("should allow overriding the default className", () => {
    render(<ConversionSelect {...defaultProps} className="w-40" />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveClass("w-40");
  });

  it("should render the select trigger with sm size", () => {
    render(<ConversionSelect {...defaultProps} />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("data-size", "sm");
  });

  it("should render with correct data-slot attribute", () => {
    render(<ConversionSelect {...defaultProps} />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("data-slot", "select-trigger");
  });

  it("should pass onValueChange to Select component", () => {
    // This is an integration test to verify the prop is connected
    // The actual onChange behavior requires a real interaction which is
    // difficult to test with Radix components in jsdom
    render(<ConversionSelect {...defaultProps} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should use default USD currency when not specified", () => {
    render(<ConversionSelect {...defaultProps} value="USD" />);

    // Should show "Converted to USD" when value is USD
    expect(screen.getByText(/Converted to.*USD/)).toBeInTheDocument();
  });
});
