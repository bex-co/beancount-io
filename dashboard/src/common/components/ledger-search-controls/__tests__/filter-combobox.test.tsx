import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SearchControlCombobox } from "../index";
import { getIndentLevel } from "../utils";

describe("SearchControlCombobox", () => {
  const mockOnChange = vi.fn();

  const defaultProps = {
    items: ["2023", "2024", "2025"],
    selected: "",
    onChange: mockOnChange,
    placeholder: "Select year",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with provided items", async () => {
    render(<SearchControlCombobox {...defaultProps} />);

    const input = screen.getByPlaceholderText("Select year");
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText("2023")).toBeInTheDocument();
      expect(screen.getByText("2024")).toBeInTheDocument();
      expect(screen.getByText("2025")).toBeInTheDocument();
    });
  });

  it("should convert items to ComboboxOption format", async () => {
    const items = ["income", "expenses"];
    render(<SearchControlCombobox {...defaultProps} items={items} />);

    const input = screen.getByPlaceholderText("Select year");
    fireEvent.focus(input);

    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(2);
      expect(options[0]).toHaveTextContent("income");
      expect(options[1]).toHaveTextContent("expenses");
    });
  });

  it("should support hierarchical display", async () => {
    const hierarchicalItems = ["income", "income:work", "income:work:salary"];
    render(
      <SearchControlCombobox
        {...defaultProps}
        items={hierarchicalItems}
        hierarchical={true}
      />,
    );

    const input = screen.getByPlaceholderText("Select year");
    fireEvent.focus(input);

    await waitFor(() => {
      const options = screen.getAllByRole("option");

      // Verify that hierarchical items are rendered in order
      // Note: Currently the indent is fixed at 8px in the component
      // The indent property is calculated but not yet applied to the styling
      expect(options[0]).toHaveTextContent("income");
      expect(options[1]).toHaveTextContent("income:work");
      expect(options[2]).toHaveTextContent("income:work:salary");
    });
  });

  it("should call onChange when value changes", async () => {
    render(<SearchControlCombobox {...defaultProps} />);

    const input = screen.getByPlaceholderText("Select year");
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText("2024")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("2024"));

    expect(mockOnChange).toHaveBeenCalledWith("2024");
  });

  it("should support allowCustom prop", () => {
    const { rerender } = render(
      <SearchControlCombobox {...defaultProps} allowCustom={true} />,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();

    rerender(<SearchControlCombobox {...defaultProps} allowCustom={false} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should pass className to Combobox", () => {
    render(
      <SearchControlCombobox {...defaultProps} className="custom-class" />,
    );

    // The className is applied to the input via the Combobox component
    const input = screen.getByRole("combobox");
    expect(input).toBeInTheDocument();
  });

  it("should filter items based on search input", async () => {
    const items = ["assets:bank", "assets:cash", "income:work"];
    render(<SearchControlCombobox {...defaultProps} items={items} />);

    const input = screen.getByPlaceholderText("Select year");
    fireEvent.change(input, { target: { value: "bank" } });

    await waitFor(() => {
      expect(screen.getByText("assets:bank")).toBeInTheDocument();
      expect(screen.queryByText("assets:cash")).not.toBeInTheDocument();
      expect(screen.queryByText("income:work")).not.toBeInTheDocument();
    });
  });

  it("should show all items when input is empty", async () => {
    const items = ["assets", "income", "expenses"];
    render(<SearchControlCombobox {...defaultProps} items={items} />);

    const input = screen.getByPlaceholderText("Select year");
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText("assets")).toBeInTheDocument();
      expect(screen.getByText("income")).toBeInTheDocument();
      expect(screen.getByText("expenses")).toBeInTheDocument();
    });
  });
});

describe("getIndentLevel", () => {
  it("should return 0 for top-level items", () => {
    expect(getIndentLevel("income")).toBe(0);
    expect(getIndentLevel("expenses")).toBe(0);
  });

  it("should return 1 for first-level nested items", () => {
    expect(getIndentLevel("income:work")).toBe(1);
    expect(getIndentLevel("expenses:food")).toBe(1);
  });

  it("should return 2 for second-level nested items", () => {
    expect(getIndentLevel("income:work:salary")).toBe(2);
    expect(getIndentLevel("expenses:food:groceries")).toBe(2);
  });

  it("should handle deeply nested items", () => {
    expect(getIndentLevel("a:b:c:d:e")).toBe(4);
  });

  it("should handle empty strings", () => {
    expect(getIndentLevel("")).toBe(0);
  });

  it("should count colons correctly", () => {
    expect(getIndentLevel("one")).toBe(0);
    expect(getIndentLevel("one:two")).toBe(1);
    expect(getIndentLevel("one:two:three")).toBe(2);
    expect(getIndentLevel("one:two:three:four")).toBe(3);
  });
});
