import fs from "fs";
import path from "path";

// w21/990: Return closed the keyboard and did nothing to the New File dialog.
describe("the text input modal's Return key", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("confirms like the button, which a disabled confirm refuses", () => {
    expect(source.includes('returnKeyType="done"')).toBe(true);
    expect(source.includes("onSubmitEditing={handleConfirm}")).toBe(true);
    expect(
      source.includes(
        "consthandleConfirm=()=>{if(isConfirmDisabled){return;}onConfirm(inputText);",
      ),
    ).toBe(true);
  });
});
