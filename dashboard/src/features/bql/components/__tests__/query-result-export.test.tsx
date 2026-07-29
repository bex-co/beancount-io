import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryResultExport } from "../query-result-export";
import type { QueryResultTable } from "@/graphql/definitions";

const mockExportQueryResultAsCSV = vi.fn();

vi.mock("../../lib/export-utils", () => ({
  exportQueryResultAsCSV: (...args: any[]) =>
    mockExportQueryResultAsCSV(...args),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/common/components/ui/button", () => ({
  Button: ({ children, onClick, title, ...props }: any) => (
    <button onClick={onClick} title={title} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("lucide-react", () => ({
  Download: () => <svg data-testid="download-icon" />,
}));

describe("QueryResultExport", () => {
  const mockResult: QueryResultTable = {
    types: [{ name: "account", dtype: "str" }],
    rows: [["Assets:Cash"]],
  } as any;

  const defaultProps = {
    result: mockResult,
    queryString: "select * from accounts",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the Download button", () => {
    render(<QueryResultExport {...defaultProps} />);

    expect(screen.getByTestId("download-icon")).toBeInTheDocument();
  });

  it("should render button with correct title attribute", () => {
    render(<QueryResultExport {...defaultProps} />);

    const button = screen.getByTitle("bql.downloadCSV");
    expect(button).toBeInTheDocument();
  });

  it("should call exportQueryResultAsCSV with correct args when clicked", () => {
    render(<QueryResultExport {...defaultProps} />);

    const button = screen.getByTitle("bql.downloadCSV");
    fireEvent.click(button);

    expect(mockExportQueryResultAsCSV).toHaveBeenCalledTimes(1);
    expect(mockExportQueryResultAsCSV).toHaveBeenCalledWith(
      mockResult,
      "select * from accounts",
    );
  });

  it("should render the download CSV label text", () => {
    render(<QueryResultExport {...defaultProps} />);

    expect(screen.getByText("bql.downloadCSV")).toBeInTheDocument();
  });

  it("should not call exportQueryResultAsCSV before clicking", () => {
    render(<QueryResultExport {...defaultProps} />);

    expect(mockExportQueryResultAsCSV).not.toHaveBeenCalled();
  });
});
