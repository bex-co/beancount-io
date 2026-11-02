import fs from "fs";
import path from "path";
import { en } from "../translations/en";

/**
 * w21/142: labels that dropped the text telling siblings apart: a folder and
 * a file both read "imports", template choices never read their
 * description, dimmed example ledgers not why, and every budget's buttons
 * read just "Update" or "Delete".
 */
const read = (relative: string) =>
  fs.readFileSync(path.join(__dirname, "..", relative), "utf8");

describe("labels that tell siblings apart", () => {
  it("names a Files row's kind", () => {
    const source = read("screens/ledger-file-browser-screen/index.tsx");
    expect(source.includes('isDir ? "ledgerFilesFolderLabel"')).toBe(true);
    expect(source.includes("accessibilityLabel={entry.name}")).toBe(false);
    expect(en.ledgerFilesFolderLabel).toBe("{{name}}, folder");
    expect(en.ledgerFilesFileLabel).toBe("{{name}}, file");
  });

  it("reads each Create Ledger choice's description", () => {
    const source = read(
      "screens/create-ledger-screen/create-ledger-screen.tsx",
    );
    for (const hint of [
      "accessibilityHint={t(module.outcomeKey)}",
      'accessibilityHint={t("createLedgerTemplateSampleHint")}',
      "accessibilityHint={t(entry.outcomeKey)}",
    ]) {
      expect(source.includes(hint)).toBe(true);
    }
  });

  it("reads a dimmed drawer row's reason", () => {
    const source = read("components/ledger-drawer/ledger-drawer.tsx");
    expect(source.includes("`${item.name}, ${item.statusLabel}`")).toBe(true);
  });

  it("names the budget an Update or Delete acts on", () => {
    expect(
      read("screens/budget-screen/components/budget-group-card.tsx").includes(
        't("budgetUpdateNamed", {',
      ),
    ).toBe(true);
    expect(
      read("screens/budget-screen/components/budget-history-rows.tsx").includes(
        't("budgetDeleteNamed", {',
      ),
    ).toBe(true);
    expect(en.budgetUpdateNamed.includes("{{account}}")).toBe(true);
    expect(en.budgetDeleteNamed.includes("{{date}}")).toBe(true);
  });
});
