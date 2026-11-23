import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FileUpload } from "../file-upload";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) =>
      key === "importer.error.downloadCsvExample"
        ? "Download CSV Example"
        : key,
  }),
}));

vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => true,
}));

describe("FileUpload CSV example link", () => {
  it("names the CSV example download for assistive technology", () => {
    render(<FileUpload onFileSelect={vi.fn()} />);

    const link = screen.getByRole("link", { name: "Download CSV Example" });
    expect(link).toHaveAttribute("href", "/lgasset/csv_transactions.csv");
    expect(link).toHaveAttribute("download", "example_transactions.csv");
  });

  it("keeps the literal CSV lines in a scrollable box", () => {
    render(<FileUpload onFileSelect={vi.fn()} />);
    const example = screen.getByText(
      /2025-12-01,Starbucks,Coffee Shop Purchase,-4\.50/,
      { selector: "pre" },
    );
    expect(example).toHaveClass("max-w-full", "overflow-x-auto");
    expect(example.textContent?.split("\n")).toContain(
      "2025-12-01,Starbucks,Coffee Shop Purchase,-4.50",
    );
  });
});
