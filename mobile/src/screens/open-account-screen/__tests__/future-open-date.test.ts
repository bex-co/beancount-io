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

// w21/809: an account closing on December 31 read "was closed on December
// 31, 2026 and can't be reopened" in October, while Accounts listed it open.
describe("existingAccountNotice for a close after today", () => {
  it("says the account is open and when it closes", () => {
    expect(
      existingAccountNotice("2026-12-31", "2026-01-02", "2026-10-23"),
    ).toEqual({ key: "openAccountClosesLater", date: "2026-12-31" });
  });

  it("says closed from the close date on", () => {
    expect(
      existingAccountNotice("2026-10-23", "2026-01-02", "2026-10-23"),
    ).toEqual({ key: "openAccountClosed", date: "2026-10-23" });
    // Opening later still says so first.
    expect(
      existingAccountNotice("2027-03-01", "2026-11-02", "2026-10-23"),
    ).toEqual({ key: "openAccountOpensLater", date: "2026-11-02" });
  });

  it("names the close date in every language", () => {
    const {
      translationLocales,
    } = require("../../../translations/__tests__/locale-parity");
    for (const locale of translationLocales() as string[]) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const catalog = require(`../../../translations/${locale}`)[locale];
      const text = String(catalog.openAccountClosesLater ?? "");
      expect([
        locale,
        text.includes("{{account}}"),
        text.includes("{{date}}"),
      ]).toEqual([locale, true, true]);
    }
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
