import fs from "fs";
import path from "path";

// w21/1001: Merchants, Merchant detail and the account picker are pushed
// screens with no tab bar, and a list's content does not clear the home
// indicator on its own, so the last row ended under it.
describe("the pushed lists that clear the home indicator", () => {
  const read = (file: string) =>
    fs
      .readFileSync(path.join(__dirname, "..", file), "utf8")
      .replace(/\s+/g, "");

  for (const file of [
    "screens/merchants-screen/merchants-screen.tsx",
    "screens/merchant-detail-screen/merchant-detail-screen.tsx",
  ]) {
    it(`pads the bottom of ${file} by the safe-area inset`, () => {
      const source = read(file);
      expect(source.includes("constinsets=useSafeAreaInsets();")).toBe(true);
      expect(
        source.includes(
          "contentContainerStyle={[styles.listContent,{paddingBottom:insets.bottom},]}",
        ),
      ).toBe(true);
    });
  }

  it("adds the inset to the account picker's own padding", () => {
    const source = read(
      "screens/account-picker-screen/account-picker-screen.tsx",
    );
    expect(source.includes("constinsets=useSafeAreaInsets();")).toBe(true);
    expect(
      source.includes(
        "contentContainerStyle={[styles.listContent,{paddingBottom:gutter+insets.bottom},]}",
      ),
    ).toBe(true);
  });
});
