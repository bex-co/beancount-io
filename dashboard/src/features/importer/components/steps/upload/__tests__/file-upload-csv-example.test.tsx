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
});
