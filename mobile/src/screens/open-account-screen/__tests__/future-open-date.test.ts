import fs from "fs";
import path from "path";
import { existingAccountNotice } from "../account-name";

/**
 * w21/723: an account opened for next month is not listed on Accounts until it
 * opens (w21/614), so it seemed lost, and Open Account then said only that it
 * was "already open".
 */
describe("existingAccountNotice", () => {
  it("says when an account the ledger already has opens", () => {
    expect(
      existingAccountNotice(undefined, "2026-11-02", "2026-10-23"),
    ).toEqual({
      key: "openAccountOpensLater",
      date: "2026-11-02",
    });
  });

  it("keeps the closed and the already-open wording", () => {
    expect(
      existingAccountNotice("2026-05-01", "2026-01-01", "2026-10-23"),
    ).toEqual({ key: "openAccountClosed", date: "2026-05-01" });
    expect(
      existingAccountNotice(undefined, "2026-10-23", "2026-10-23"),
    ).toEqual({
      key: "openAccountAlreadyOpen",
    });
    expect(existingAccountNotice(undefined, undefined, "2026-10-23")).toEqual({
      key: "openAccountAlreadyOpen",
    });
  });
});

describe("Open Account's date", () => {
  it("cannot be set after today, and the field says when an account opens", () => {
    const screen = fs
      .readFileSync(
        path.join(__dirname, "..", "open-account-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(screen.includes("maximumDate={newDate()}")).toBe(true);
    expect(screen.includes("closeDates.openedOn?.get(account)")).toBe(true);
    expect(screen.includes("message={t(existing.key,{")).toBe(true);
  });
});
