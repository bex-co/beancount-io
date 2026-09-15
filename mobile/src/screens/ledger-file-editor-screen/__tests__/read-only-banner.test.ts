import fs from "fs";
import path from "path";

/**
 * Static guardrail: the file editor says when a ledger is read-only. It used
 * to drop the Save button and nothing else, while taps still moved the active
 * line, so nothing explained why the keyboard never came.
 */
describe("file editor read-only indicator", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "index.tsx"),
    "utf8",
  );

  it("shows the translated read-only message when the ledger cannot be written", () => {
    const start = source.indexOf(
      '{!canWrite && fileErrors.length === 0 && editorState === "content" ? (',
    );
    expect(start === -1).toBe(false);
    expect(
      source
        .slice(start, source.indexOf(") : null}", start))
        .includes('t("ledgerReadOnly")'),
    ).toBe(true);
  });

  it("still hides Save on a read-only ledger", () => {
    expect(
      source.includes("headerRight: canWrite ? headerRight : undefined"),
    ).toBe(true);
  });
});
