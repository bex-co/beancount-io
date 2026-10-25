import fs from "fs";
import path from "path";

// w21/1006: the composer hard-coded `keyboardVerticalOffset={... ? 96 : 0}`,
// which only matched one inset size — on iPad the composer would float ~24 pt
// too high above the keyboard. It uses the shared stack offset like the other
// pushed screens now (the feature is still behind `config.features.agentChat`,
// so this is unobservable until it ships).
describe("the Ask-AI screen's keyboard offset", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "agent-screen.tsx"),
    "utf8",
  );

  it("uses the shared stack offset, not a numeric literal", () => {
    expect(source.includes("useStackKeyboardOffset()")).toBe(true);
    expect(/keyboardVerticalOffset=\{[^}]*\d/.test(source)).toBe(false);
  });
});
