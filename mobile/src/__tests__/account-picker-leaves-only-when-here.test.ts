import fs from "fs";
import path from "path";

// w21/905: an account created after the user left the picker still arrived,
// and then the picker's callback popped whichever screen was now on top.
describe("Account picker's exit", () => {
  const source = fs
    .readFileSync(
      path.join(
        __dirname,
        "../screens/account-picker-screen/account-picker-screen.tsx",
      ),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("delivers the account but pops only while the picker is the screen shown", () => {
    expect(source.includes("onSelectedRef.current?.(account);")).toBe(true);
    expect(source.includes("if(isHere())router.back();")).toBe(true);
    expect(source.includes("[ledgerId,router,guest,isHere]")).toBe(true);
  });
});
