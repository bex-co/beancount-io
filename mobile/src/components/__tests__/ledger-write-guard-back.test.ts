import fs from "fs";
import path from "path";

// w21/872: Scan Receipt is a full-screen modal with no header, Cancel or swipe,
// and the write guard offered only "Ledgers", which replaced it.
describe("LedgerWriteGuard", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "ledger-write-guard.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("offers a way back to where the user came from when it blocks", () => {
    expect(
      source.includes(
        'router.canGoBack()?(<PressabletestID="ledger-write-guard-back"',
      ),
    ).toBe(true);
    expect(source.includes("onPress={()=>router.back()}")).toBe(true);
    expect(source.includes('t("back")')).toBe(true);
  });

  it("still lets a writer straight through", () => {
    expect(source.includes("if(canWrite)returnchildren;")).toBe(true);
  });
});
