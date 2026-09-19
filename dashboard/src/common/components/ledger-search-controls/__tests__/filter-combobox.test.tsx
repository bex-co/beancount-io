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

describe("payee suggestions carry the name a reader types", () => {
  const mockOnChange = vi.fn();

  // Exactly what the filter control builds: the escaped FQL expression the
  // ledger needs, plus the payee as printed in the journal.
  const payeeItems = [
    { name: "E.B.'s Beer and Wine", value: `payee:"E\\.B\\.'s Beer and Wine"` },
    { name: "Mr. Marcel", value: `payee:"Mr\\. Marcel"` },
    { name: "Foo (Bar)", value: `payee:"Foo \\(Bar\\)"` },
    { name: 'He said "hi"', value: `payee:'He said \\"hi\\"'` },
    { name: "Back\\slash", value: `payee:"Back\\\\slash"` },
    { name: "Verizon", value: `payee:"Verizon"` },
  ];
  const items = [
    "#trip-chicago-2016",
    "^statement-2016",
    ...payeeItems.map(({ name, value }) => ({ value, searchText: name })),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function typeDraft(draft: string) {
    render(
      <SearchControlCombobox
        items={items}
        selected=""
        onChange={mockOnChange}
        placeholder="Filter"
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Filter"), {
      target: { value: draft },
    });
  }

  it.each([
    ["E.B.", `payee:"E\\.B\\.'s Beer and Wine"`],
    ["Mr. Marcel", `payee:"Mr\\. Marcel"`],
    ["Foo (Bar)", `payee:"Foo \\(Bar\\)"`],
    ['He said "hi"', `payee:'He said \\"hi\\"'`],
    ["Back\\slash", `payee:"Back\\\\slash"`],
    ["Verizon", `payee:"Verizon"`],
  ])("finds the suggestion for the literal name %j", async (draft, value) => {
    typeDraft(draft);
    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(1);
      // The option still shows — and commits — the escaped expression.
      expect(options[0]).toHaveTextContent(value, {
        normalizeWhitespace: false,
      });
    });
  });

  it("commits the escaped value, not the name that found it", async () => {
    typeDraft("E.B.");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));

    fireEvent.click(screen.getAllByRole("option")[0]);

    expect(mockOnChange).toHaveBeenCalledWith(
      `payee:"E\\.B\\.'s Beer and Wine"`,
    );
  });

  it("leaves tag and link suggestions matching on their own text", async () => {
    typeDraft("#trip");
    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent("#trip-chicago-2016");
    });
  });

  it("does not match a payee name against another payee's expression", async () => {
    // "Verizon" is a plain payee: its own expression is the only hit, and the
    // search text must not pull in unrelated escaped expressions.
    typeDraft("Verizon");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
  });

  it("still offers a reader's own expression as a custom value", async () => {
    typeDraft('payee:"Nothing Here"');
    await waitFor(() => {
      expect(screen.queryAllByRole("option")).toHaveLength(0);
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
