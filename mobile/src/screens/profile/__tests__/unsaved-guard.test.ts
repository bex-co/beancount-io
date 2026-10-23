import fs from "fs";
import path from "path";
import { profileChanges } from "../profile-changes";

// w21/800: Profile was the one edit form that let Back drop a changed name
// without asking. The screen needs the native runtime, so the wiring is
// checked on source; the guard itself is covered by
// use-unsaved-changes-guard.test.
const screen = fs
  .readFileSync(path.join(__dirname, "..", "profile-screen.tsx"), "utf8")
  .replace(/\s+/g, "");

describe("Back from an edited Profile", () => {
  it("asks before dropping the edit", () => {
    expect(
      screen.includes(
        "useUnsavedChangesGuard(hasChanges&&!saved,leavingSavedRef);",
      ),
    ).toBe(true);
    expect(
      screen.includes(
        "consthasChanges=Object.keys(profileChanges(savedValues,edited)).length>0;",
      ),
    ).toBe(true);
  });

  it("leaves without asking after a save", () => {
    expect(
      screen.includes(
        "if(!isHere())return;leavingSavedRef.current=true;if(router.canGoBack()){router.back();",
      ),
    ).toBe(true);
  });

  it("counts a typed first name as an edit, and the saved values as none", () => {
    const saved = { firstName: "", lastName: "", username: "qa" };
    expect(
      Object.keys(profileChanges(saved, { ...saved, firstName: "Qa" })).length,
    ).toBe(1);
    expect(Object.keys(profileChanges(saved, saved)).length).toBe(0);
  });
});
