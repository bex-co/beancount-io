import fs from "fs";
import path from "path";

/**
 * Static guardrail: the Payee and Narration screens (both this component) do
 * not let iOS rewrite what the user types. Their values become ledger data,
 * and a corrected payee ("anthropic" became "Anthropic fix") is a new merchant.
 */
describe("TextInputScreen input", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "index.tsx"),
    "utf8",
  );

  it("turns autocorrect and auto-capitalization off", () => {
    expect(source.includes("autoCorrect={false}")).toBe(true);
    expect(source.includes('autoCapitalize="none"')).toBe(true);
  });

  it("commits the trimmed value, without invisible marks (w21/965)", () => {
    expect(source.includes("onSave?.(cleanFreeText(selected));")).toBe(true);
  });
});
