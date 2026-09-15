import fs from "fs";
import path from "path";

describe("header action font scaling coverage", () => {
  it("applies headerActionMaxFontSizeMultiplier on Edit Transaction actions", () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "screens",
        "edit-transaction-screen",
        "edit-transaction-screen.tsx",
      ),
      "utf8",
    );
    expect(source.includes("headerActionMaxFontSizeMultiplier")).toBe(true);
    const matches =
      source.match(
        /maxFontSizeMultiplier=\{headerActionMaxFontSizeMultiplier\}/g,
      ) ?? [];
    expect(matches.length >= 2).toBe(true);
  });

  it("applies the same cap on Create Ledger and File Editor Save", () => {
    const createLedger = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "screens",
        "create-ledger-screen",
        "create-ledger-screen.tsx",
      ),
      "utf8",
    );
    const fileEditor = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "screens",
        "ledger-file-editor-screen",
        "index.tsx",
      ),
      "utf8",
    );
    expect(createLedger.includes("headerActionMaxFontSizeMultiplier")).toBe(
      true,
    );
    expect(fileEditor.includes("headerActionMaxFontSizeMultiplier")).toBe(true);
  });
});
