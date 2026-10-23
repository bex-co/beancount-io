import fs from "fs";
import path from "path";
import { closeDatesOf } from "../../../common/account-close-dates";
import { existingAccountNotice, ledgerSpelling } from "../account-name";

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

// w21/734: the duplicate check matched a decomposed "Café" as NFC, but its
// dates were looked up with the typed spelling, so the notice said only
// "already open".
describe("the notice for an account stored decomposed", () => {
  const nfd = "Expenses:Cafe\u0301";
  const typed = "Expenses:Caf\u00e9";
  const notice = (directive: { closedAt?: string; openedAt?: string }) => {
    const dates = closeDatesOf([{ account: nfd, ...directive }]);
    const name = ledgerSpelling(typed, [nfd]);
    return existingAccountNotice(
      name === undefined ? undefined : dates.get(name),
      name === undefined ? undefined : dates.openedOn?.get(name),
      "2026-10-23",
    );
  };

  it("finds the ledger's spelling, preferring an exact one", () => {
    expect(ledgerSpelling(typed, [nfd])).toBe(nfd);
    expect(ledgerSpelling(typed, [nfd, typed])).toBe(typed);
    expect(ledgerSpelling("Expenses:Cafes", [nfd])).toBe(undefined);
  });

  it("says when it opens, and that it is closed", () => {
    expect(notice({ openedAt: "2026-11-02" })).toEqual({
      key: "openAccountOpensLater",
      date: "2026-11-02",
    });
    expect(
      notice({ openedAt: "2026-01-01", closedAt: "2026-05-01T00:00:00Z" }),
    ).toEqual({ key: "openAccountClosed", date: "2026-05-01" });
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
    expect(screen.includes("closeDates.openedOn?.get(existingName)")).toBe(
      true,
    );
    expect(screen.includes("ledgerSpelling(account,meta?.accounts)")).toBe(
      true,
    );
    expect(screen.includes("message={t(existing.key,{")).toBe(true);
  });
});
