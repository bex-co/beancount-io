import { render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SupportedLanguage } from "@/i18n/config";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { useCSVParser } from "../../../../hooks/use-csv-parser";
import type { CSVParseResult } from "../../../../types";
import { ImportPreviewTable } from "../import-preview-table";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");

function parse(csv: string): CSVParseResult {
  const { result } = renderHook(() => useCSVParser());
  return result.current.parseCSV(csv);
}

async function renderPreview(language: SupportedLanguage, csv: string) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  render(
    <LocalizationProvider localization={localization}>
      <ImportPreviewTable result={parse(csv)} onResultChange={vi.fn()} />
    </LocalizationProvider>,
  );
}

const csvWithErrors = (errors: number) =>
  [
    "Date,Payee,Description,Amount",
    "2026-10-01,qa-good,Valid row,0",
    ...Array.from(
      { length: errors },
      (_, i) => `2026-10-01,qa-bad-${i},Invalid amount,oops`,
    ),
  ].join("\n");

describe("Import Preview row-count badges (w4/1071)", () => {
  it.each([
    [1, "1 Valid", "1 Error"],
    [2, "1 Valid", "2 Errors"],
  ])(
    "reads English counts naturally for %i errors",
    async (errors, valid, errorLabel) => {
      await renderPreview("en", csvWithErrors(errors));
      expect(screen.getByText(valid)).toBeInTheDocument();
      expect(screen.getByText(errorLabel)).toBeInTheDocument();
    },
  );

  it.each([
    [1, "1 ошибка"],
    [2, "2 ошибки"],
    [5, "5 ошибок"],
  ])(
    "reads Russian error counts naturally for %i",
    async (errors, errorLabel) => {
      await renderPreview("ru", csvWithErrors(errors));
      expect(screen.getByText(errorLabel)).toBeInTheDocument();
    },
  );

  it("shows no error badge at zero errors", async () => {
    await renderPreview("en", csvWithErrors(0));
    expect(screen.getByText("1 Valid")).toBeInTheDocument();
    expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
  });
});
