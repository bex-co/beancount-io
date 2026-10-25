import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportWorkflowContainer } from "../import-workflow-container";

// The real CSV parser, upload step and Preview run; only the server's AI
// parser is stubbed, so a test that never sees it called spent no AI tokens.
const parseLLMFile = vi.fn();
vi.mock("../../hooks/use-llm-parser", () => ({
  useLLMParser: () => ({ parseFile: parseLLMFile }),
}));
vi.mock("../../hooks/use-import-submit", () => ({
  useImportSubmit: () => ({
    submitImport: vi.fn(),
    importResult: null,
    isSubmitting: false,
  }),
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options?.field
        ? `${String(options.field)} ${String(options.row)}`
        : options
          ? `${key}(${Object.values(options).join(",")})`
          : key,
    i18n: { language: "en" },
  }),
}));
vi.mock("@/common/analytics", () => ({ track: vi.fn() }));
vi.mock("@/common/hooks/use-user-limits", () => ({
  useUserLimits: () => ({ tier: "FREE" }),
}));
vi.mock("@tanstack/react-router", async () => {
  const { routerMock } = await import("@/test/mocks/router");
  return { ...routerMock, useNavigate: () => vi.fn() };
});

function upload(name: string, content: string) {
  const input = document.querySelector<HTMLInputElement>("input[type=file]");
  if (!input) throw new Error("file input missing");
  fireEvent.change(input, {
    target: { files: [new File([content], name, { type: "text/csv" })] },
  });
}

const renderImporter = () =>
  render(
    <ImportWorkflowContainer
      ledgerId="alice/books"
      ledgerOwner="alice"
      ledgerName="books"
    />,
  );

const FIXTURE = [
  "Date,Payee,Description,Amount",
  "2026-08-01,qa-972-valid,valid companion,-1.25",
  "2026-08-02,qa-972-invalid,truncated amount,-12,50",
  "",
].join("\n");
const STRUCTURAL = "importer.preview.recordWidthError";

const validCount = () =>
  screen.getByText(/importer\.preview\.validCount/).textContent?.trim();
// Description's cell is labelled by its column key.
const cell = (field: string, row: number) =>
  screen.getByRole("button", {
    name: `importer.preview.${field === "description" ? "description_column" : field} ${row}`,
  });

beforeEach(() => parseLLMFile.mockReset());

/** Editing a wrong-width record's cells does not make it importable (w4/972). */
describe("Smart Import keeps a wrong-width record refused after edits", () => {
  it.each([
    ["payee", "Enter"],
    ["description", "Tab"],
  ])(
    "keeps the structural error after editing only its %s",
    async (field, commit) => {
      const user = userEvent.setup();
      renderImporter();
      upload("shape.csv", FIXTURE);

      await waitFor(() =>
        expect(validCount()).toBe("importer.preview.validCount(1)"),
      );
      expect(screen.getByText(STRUCTURAL)).toBeInTheDocument();
      expect(cell("amount", 2)).toHaveTextContent("-12");

      await user.click(cell(field, 2));
      await user.keyboard("{Control>}a{/Control}qa-972-edited");
      // Enter commits in place; Tab commits on the blur it causes.
      if (commit === "Enter") await user.keyboard("{Enter}");
      else await user.tab();

      await waitFor(() =>
        expect(cell(field, 2)).toHaveTextContent("qa-972-edited"),
      );
      expect(validCount()).toBe("importer.preview.validCount(1)");
      expect(screen.getByText(STRUCTURAL)).toBeInTheDocument();
      expect(parseLLMFile).not.toHaveBeenCalled();
    },
  );

  it("still repairs an ordinary four-field row by editing it", async () => {
    const user = userEvent.setup();
    renderImporter();
    upload(
      "date.csv",
      [
        "Date,Payee,Description,Amount",
        "2026-08-01,qa-972-valid,valid companion,-1.25",
        "2026-02-30,qa-972-date,bad date,-2.00",
        "",
      ].join("\n"),
    );
    await waitFor(() =>
      expect(validCount()).toBe("importer.preview.validCount(1)"),
    );

    await user.click(cell("payee", 2));
    await user.keyboard("{Control>}a{/Control}qa-972-payee{Enter}");
    await waitFor(() =>
      expect(cell("payee", 2)).toHaveTextContent("qa-972-payee"),
    );
    expect(validCount()).toBe("importer.preview.validCount(1)");

    await user.click(cell("date", 2));
    await user.keyboard("{Control>}a{/Control}2026-02-28{Enter}");
    await waitFor(() =>
      expect(validCount()).toBe("importer.preview.validCount(2)"),
    );
  });
});
