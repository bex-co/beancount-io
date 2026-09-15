import fs from "fs";
import path from "path";

describe("Add Budget FormRow accessibility", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "screens",
      "add-budget-screen",
      "add-budget-screen.tsx",
    ),
    "utf8",
  );

  it("exposes the displayed value via accessibilityValue", () => {
    expect(source.includes("accessibilityValue={{ text: value }}")).toBe(true);
  });
});
