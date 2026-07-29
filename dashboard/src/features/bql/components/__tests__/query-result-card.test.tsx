import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryResultCard } from "../query-result-card";
import type { QueryShellQuery } from "@/graphql/definitions";

// Mock child components
vi.mock("../query-result-chart", () => ({
  QueryResultChart: ({ chartConfig }: any) => (
    <div data-testid="chart">Chart: {chartConfig.type}</div>
  ),
}));

vi.mock("../query-result-export", () => ({
  QueryResultExport: ({ queryString }: any) => (
    <button data-testid="export-button">Export {queryString}</button>
  ),
}));

// Mock chart utils
vi.mock("../lib/chart-utils", () => ({
  parseQueryChart: (result: any) => {
    if (result?.types?.length === 2) {
      return { type: "line", option: {} };
    }
    return null;
  },
}));

// Mock translations
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

// Mock react-window (JSDOM doesn't support layout measurement)
vi.mock("react-window", () => ({
  List: ({ rowCount, rowComponent: RowComponent, rowProps, style }: any) => (
    <div data-testid="virtual-list" style={style}>
      {Array.from({ length: Math.min(rowCount, 10) }, (_, index) => (
        <RowComponent
          key={index}
          index={index}
          style={{ height: 36 }}
          {...rowProps}
        />
      ))}
    </div>
  ),
}));

describe("QueryResultCard", () => {
  const mockOnExecute = vi.fn();
  const mockOnDelete = vi.fn();

  const defaultProps = {
    query: "select * from accounts",
    result: null,
    onExecute: mockOnExecute,
    onDelete: mockOnDelete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render query text", () => {
    render(<QueryResultCard {...defaultProps} />);

    expect(screen.getByText("select * from accounts")).toBeInTheDocument();
  });

  it("should render delete button", () => {
    render(<QueryResultCard {...defaultProps} />);

    const deleteButton = screen.getByTitle("bql.deleteQuery");
    expect(deleteButton).toBeInTheDocument();
  });

  it("should call onDelete when delete button is clicked", () => {
    render(<QueryResultCard {...defaultProps} />);

    const deleteButton = screen.getByTitle("bql.deleteQuery");
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith("select * from accounts");
  });

  it("should render table results", () => {
    const tableResult: QueryShellQuery["queryShell"] = {
      resultType: "table",
      table: {
        types: [
          { name: "account", dtype: "str" },
          { name: "balance", dtype: "Decimal" },
        ],
        rows: [
          ["Assets:Cash", 1000],
          ["Assets:Bank", 5000],
        ],
      },
      text: null,
    } as any;

    render(
      <QueryResultCard
        {...defaultProps}
        result={tableResult}
        isInitiallyOpen={true}
      />,
    );

    expect(screen.getByText("account")).toBeInTheDocument();
    expect(screen.getByText("balance")).toBeInTheDocument();
    expect(screen.getByText("Assets:Cash")).toBeInTheDocument();
    expect(screen.getByText("1000")).toBeInTheDocument();
  });

  it("should render text results", () => {
    const textResult: QueryShellQuery["queryShell"] = {
      resultType: "text",
      table: null,
      text: {
        contents: "Query executed successfully",
      },
    } as any;

    render(<QueryResultCard {...defaultProps} result={textResult} />);

    // Click to expand
    const summary = document.querySelector("summary");
    fireEvent.click(summary!);

    expect(screen.getByText("page.bql.queryResult:")).toBeInTheDocument();
    expect(screen.getByText("Query executed successfully")).toBeInTheDocument();
  });

  it("should render localized error message in error state", () => {
    const error = new Error("Query failed");

    render(<QueryResultCard {...defaultProps} error={error} />);

    // Click to expand
    const summary = document.querySelector("summary");
    fireEvent.click(summary!);

    expect(screen.getByText("common.errors.generic")).toBeInTheDocument();
  });

  it("should render loading state", () => {
    render(<QueryResultCard {...defaultProps} loading={true} />);

    // Click to expand
    const summary = document.querySelector("summary");
    fireEvent.click(summary!);

    expect(screen.getByText("bql.executing...")).toBeInTheDocument();
  });

  it("should show export button when table results exist", () => {
    const tableResult: QueryShellQuery["queryShell"] = {
      resultType: "table",
      table: {
        types: [{ name: "account", dtype: "str" }],
        rows: [["Assets:Cash"]],
      },
      text: null,
    } as any;

    render(<QueryResultCard {...defaultProps} result={tableResult} />);

    expect(screen.getByTestId("export-button")).toBeInTheDocument();
  });

  it("should not show export button when no table results", () => {
    const textResult: QueryShellQuery["queryShell"] = {
      resultType: "text",
      table: null,
      text: { contents: "Success" },
    } as any;

    render(<QueryResultCard {...defaultProps} result={textResult} />);

    expect(screen.queryByTestId("export-button")).not.toBeInTheDocument();
  });

  it("should render chart when data is plottable", () => {
    const plottableResult: QueryShellQuery["queryShell"] = {
      resultType: "table",
      table: {
        types: [
          { name: "date", dtype: "date" },
          { name: "balance", dtype: "Decimal" },
        ],
        rows: [
          ["2024-01-01", 100],
          ["2024-01-02", 200],
        ],
      },
      text: null,
    } as any;

    render(<QueryResultCard {...defaultProps} result={plottableResult} />);

    // Click to expand
    const summary = document.querySelector("summary");
    fireEvent.click(summary!);

    expect(screen.getByTestId("chart")).toBeInTheDocument();
    expect(screen.getByText("Chart: line")).toBeInTheDocument();
  });

  it("should call onExecute when expanding without cached result", async () => {
    render(<QueryResultCard {...defaultProps} isInitiallyOpen={false} />);

    const summary = document.querySelector("summary");
    fireEvent.click(summary!);

    await waitFor(() => {
      expect(mockOnExecute).toHaveBeenCalledWith("select * from accounts");
    });
  });

  it("should not call onExecute when expanding with cached result", () => {
    const tableResult: QueryShellQuery["queryShell"] = {
      resultType: "table",
      table: {
        types: [{ name: "account", dtype: "str" }],
        rows: [],
      },
      text: null,
    } as any;

    render(
      <QueryResultCard
        {...defaultProps}
        result={tableResult}
        isInitiallyOpen={false}
      />,
    );

    const summary = document.querySelector("summary");
    fireEvent.click(summary!);

    expect(mockOnExecute).not.toHaveBeenCalled();
  });

  it("should be initially open when isInitiallyOpen is true", () => {
    const tableResult: QueryShellQuery["queryShell"] = {
      resultType: "table",
      table: {
        types: [{ name: "account", dtype: "str" }],
        rows: [["Assets:Cash"]],
      },
      text: null,
    } as any;

    render(
      <QueryResultCard
        {...defaultProps}
        result={tableResult}
        isInitiallyOpen={true}
      />,
    );

    // Content should be visible without clicking
    expect(screen.getByText("account")).toBeInTheDocument();
    expect(screen.getByText("Assets:Cash")).toBeInTheDocument();
  });

  it("should handle empty table results", () => {
    const emptyResult: QueryShellQuery["queryShell"] = {
      resultType: "table",
      table: {
        types: [{ name: "account", dtype: "str" }],
        rows: [],
      },
      text: null,
    } as any;

    render(<QueryResultCard {...defaultProps} result={emptyResult} />);

    // Click to expand
    const summary = document.querySelector("summary");
    fireEvent.click(summary!);

    expect(
      screen.getByText("page.bql.noDataReturnedFromQuery"),
    ).toBeInTheDocument();
  });

  it("should render unknown result type message", () => {
    const unknownResult = {
      resultType: "unknown",
      table: null,
      text: null,
    } as any;

    render(<QueryResultCard {...defaultProps} result={unknownResult} />);

    // Click to expand
    const summary = document.querySelector("summary");
    fireEvent.click(summary!);

    expect(screen.getByText(/page.bql.unknownResultType/)).toBeInTheDocument();
    expect(screen.getByText(/unknown/)).toBeInTheDocument();
  });

  it("should render all table results using virtualized list", () => {
    const tableResult: QueryShellQuery["queryShell"] = {
      resultType: "table",
      table: {
        types: [
          { name: "account", dtype: "str" },
          { name: "balance", dtype: "Decimal" },
        ],
        rows: [
          ["Assets:Cash", 1000],
          ["Assets:Bank", 5000],
        ],
      },
      text: null,
    } as any;

    render(
      <QueryResultCard
        {...defaultProps}
        result={tableResult}
        isInitiallyOpen={true}
      />,
    );

    expect(screen.getByTestId("virtual-list")).toBeInTheDocument();
    expect(screen.getByText("bql.rowCount")).toBeInTheDocument();
    expect(screen.getByText("Assets:Cash")).toBeInTheDocument();
    expect(screen.getByText("Assets:Bank")).toBeInTheDocument();
  });

  it("should render object cells as JSON", () => {
    const tableResult: QueryShellQuery["queryShell"] = {
      resultType: "table",
      table: {
        types: [{ name: "position", dtype: "Position" }],
        rows: [[{ number: 100, currency: "USD" }]],
      },
      text: null,
    } as any;

    render(
      <QueryResultCard
        {...defaultProps}
        result={tableResult}
        isInitiallyOpen={true}
      />,
    );

    expect(
      screen.getByText('{"number":100,"currency":"USD"}'),
    ).toBeInTheDocument();
  });

  it("should render null cells as empty strings", () => {
    const tableResult: QueryShellQuery["queryShell"] = {
      resultType: "table",
      table: {
        types: [
          { name: "account", dtype: "str" },
          { name: "notes", dtype: "str" },
        ],
        rows: [["Assets:Cash", null]],
      },
      text: null,
    } as any;

    render(
      <QueryResultCard
        {...defaultProps}
        result={tableResult}
        isInitiallyOpen={true}
      />,
    );

    expect(screen.getByText("Assets:Cash")).toBeInTheDocument();
    // Null cell should render as empty string (not "null")
    const virtualList = screen.getByTestId("virtual-list");
    const cells = virtualList.querySelectorAll("div.truncate");
    const nullCell = Array.from(cells).find((cell) => cell.textContent === "");
    expect(nullCell).toBeTruthy();
  });

  it("should render localized error message for non-Error error", () => {
    // Pass a string error (not an Error instance)
    render(
      <QueryResultCard
        {...defaultProps}
        error={"something went wrong" as any}
      />,
    );

    // Click to expand
    const summary = document.querySelector("summary");
    fireEvent.click(summary!);

    // Non-Error values still resolve to the localized generic message
    expect(screen.getByText("common.errors.generic")).toBeInTheDocument();
  });

  it("should not call onExecute when collapsing", () => {
    const tableResult: QueryShellQuery["queryShell"] = {
      resultType: "table",
      table: {
        types: [{ name: "account", dtype: "str" }],
        rows: [["Assets:Cash"]],
      },
      text: null,
    } as any;

    render(
      <QueryResultCard
        {...defaultProps}
        result={tableResult}
        isInitiallyOpen={true}
      />,
    );

    // Close the details
    const summary = document.querySelector("summary");
    fireEvent.click(summary!);

    expect(mockOnExecute).not.toHaveBeenCalled();
  });

  it("should not call onExecute when expanding while loading", () => {
    render(
      <QueryResultCard
        {...defaultProps}
        loading={true}
        isInitiallyOpen={false}
      />,
    );

    const summary = document.querySelector("summary");
    fireEvent.click(summary!);

    expect(mockOnExecute).not.toHaveBeenCalled();
  });

  it("should not call onExecute when expanding with error", () => {
    const error = new Error("Previous error");

    render(
      <QueryResultCard
        {...defaultProps}
        error={error}
        isInitiallyOpen={false}
      />,
    );

    const summary = document.querySelector("summary");
    fireEvent.click(summary!);

    expect(mockOnExecute).not.toHaveBeenCalled();
  });
});
