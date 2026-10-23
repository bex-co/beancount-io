import fs from "fs";
import path from "path";

// w21/631: Open Account and Add Budget dropped a typed name or amount on Back
// without asking, where New Transaction, Edit and the file editor ask first. The
// screens need the native runtime, so the wiring is checked on source; the
// guard itself is covered by use-unsaved-changes-guard.test.
const read = (...parts: string[]) =>
  fs
    .readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8")
    .replace(/\s+/g, "");

describe("Back from a dirty short form", () => {
  it("asks before Open Account drops a typed name", () => {
    const screen = read("open-account-screen", "open-account-screen.tsx");
    // The type, currency and date count too (w21/810).
    expect(
      screen.includes(
        "useUnsavedChangesGuard(!saved&&isOpenAccountDraftDirty({rootPrefix,subPath,currency,date:getFormatDate(date)},{rootPrefix:seed.rootPrefix,subPath:seed.subPath,currency:defaultCurrency.current,date:initialDate.current,},),savedOutRef,);",
      ),
    ).toBe(true);
    expect(
      screen.includes(
        'defaultCurrency.current=currencies[0]??"";setCurrency(defaultCurrency.current);',
      ),
    ).toBe(true);
    expect(screen.includes("savedOutRef.current=true;setSaved(true);")).toBe(
      true,
    );
  });

  it("asks before Add Budget drops a typed amount", () => {
    const screen = read("add-budget-screen", "add-budget-screen.tsx");
    expect(
      screen.includes(
        "useUnsavedChangesGuard(!saved&&amount.trim().length>0,savedOutRef);",
      ),
    ).toBe(true);
    expect(
      screen.includes(
        "haptics.success();savedOutRef.current=true;setSaved(true);",
      ),
    ).toBe(true);
  });
});

// w21/810: switching only the type to Liabilities and tapping Back left
// without asking.
describe("Open Account's draft", () => {
  const {
    isOpenAccountDraftDirty,
  } = require("../../open-account-screen/account-name");
  const initial = {
    rootPrefix: "Assets",
    subPath: "",
    currency: "USD",
    date: "2026-10-23",
  };

  it("is changed by the type, currency or date alone", () => {
    for (const change of [
      { rootPrefix: "Liabilities" },
      { currency: "EUR" },
      { date: "2026-10-01" },
      { subPath: "Bank" },
    ]) {
      expect([
        change,
        isOpenAccountDraftDirty({ ...initial, ...change }, initial),
      ]).toEqual([change, true]);
    }
  });

  it("is unchanged as it started", () => {
    expect(isOpenAccountDraftDirty({ ...initial }, initial)).toBe(false);
  });
});
