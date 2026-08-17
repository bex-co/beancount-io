import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const printStyles = readFileSync(
  resolve(process.cwd(), "src/features/reports/export/statement-print.css"),
  "utf8",
);

describe("statement print pagination", () => {
  it("keeps the disclaimer in normal flow so it cannot overlap later pages", () => {
    expect(printStyles).toContain(".statement-print-footer");
    const footerRule = printStyles.match(
      /\.statement-print-footer\s*\{(?<declarations>[^}]*)\}/,
    )?.groups?.declarations;

    expect(footerRule).toBeDefined();
    expect(footerRule).not.toMatch(/position\s*:\s*fixed/);
    expect(footerRule).toMatch(/break-inside\s*:\s*avoid/);

    const supportingDetailRule = printStyles.match(
      /\.statement-print-supporting-detail\s*\{(?<declarations>[^}]*)\}/,
    )?.groups?.declarations;
    expect(supportingDetailRule).toMatch(/break-before\s*:\s*page/);
    expect(printStyles).toContain(
      ".statement-print-summary-row-total_liabilities_and_equity",
    );
    expect(printStyles).toContain(
      ".statement-print-summary-row-reconciliation_difference",
    );
  });
});
