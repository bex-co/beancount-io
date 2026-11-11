import { cleanup, render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Table, TableBody } from "@/common/components/ui/table";
import * as locales from "@/i18n/locales";
import { SUPPORTED_LANGUAGES } from "@/i18n/config";
import { EditablePreviewRow } from "../editable-preview-row";
import { buildParsedRow } from "../../../../utils/csv-validator";

/**
 * An invalid preview row names its fields with the column labels the table
 * header shows. It printed the form keys through CSS `capitalize` instead,
 * so every language read `Amount: 金额为必填项` (w2/105).
 */
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

afterEach(cleanup);

async function renderInvalidRow(language: string) {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    fallbackLng: "en",
    resources: Object.fromEntries(
      Object.entries(locales).map(([code, translation]) => [
        code,
        { translation },
      ]),
    ),
    interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <Table>
        <TableBody>
          <EditablePreviewRow
            row={buildParsedRow({
              date: "2026-02-30",
              payee: "qa-g",
              description: "bad date, blank amount",
              amountInput: "",
            })}
            index={0}
            onChange={vi.fn()}
            onDelete={vi.fn()}
          />
        </TableBody>
      </Table>
    </I18nextProvider>,
  );
}

describe("Import preview diagnostic field labels", () => {
  it("uses the Chinese column labels and full-width separator", async () => {
    await renderInvalidRow("zh");
    expect(await screen.findByText("金额：金额为必填项")).toBeInTheDocument();
    expect(
      screen.getByText("日期：日期格式无效。预计年-月-日"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Amount:|Date:/)).not.toBeInTheDocument();
  });

  it("reads as before in English, from the header labels", async () => {
    await renderInvalidRow("en");
    expect(
      await screen.findByText("Amount: Amount is required"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Date: Invalid date format. Expected YYYY-MM-DD"),
    ).toBeInTheDocument();
  });

  it.each(SUPPORTED_LANGUAGES.filter((language) => language !== "en"))(
    "names the amount column in %s",
    async (language) => {
      const catalog = locales[language as keyof typeof locales];
      await renderInvalidRow(language);
      const line = await screen.findByText(
        (_, element) =>
          element?.tagName === "SPAN" &&
          (element.textContent ?? "").includes(
            catalog["importer.validation.amountRequired"],
          ) &&
          (element.textContent ?? "").startsWith(
            catalog["importer.preview.amount"],
          ),
      );
      expect(line.textContent).not.toMatch(/^Amount\b/);
    },
  );
});
