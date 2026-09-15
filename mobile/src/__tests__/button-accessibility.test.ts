import fs from "fs";
import path from "path";

describe("shared Button accessibility", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "components", "button", "index.tsx"),
    "utf8",
  );

  it("exposes PressableScale as a native button", () => {
    expect(source.includes('accessibilityRole="button"')).toBe(true);
  });

  it("forwards disabled and loading into accessibilityState", () => {
    expect(source.includes("accessibilityState={{")).toBe(true);
    expect(
      source.includes("disabled: Boolean(props.disabled || props.loading)"),
    ).toBe(true);
  });
});
