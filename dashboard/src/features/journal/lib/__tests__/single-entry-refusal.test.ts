import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { describe, expect, it } from "vitest";
import { getSingleEntryRefusal } from "../single-entry-refusal";

const refusal = (message: string, code = "BAD_USER_INPUT") =>
  new CombinedGraphQLErrors({ errors: [{ message, extensions: { code } }] });

/**
 * The ledger's refusals of Entry Context text that is not one dated entry
 * (w2/112), as `UpdateLedgerEntrySourceSlice` returns them in production.
 */
describe("getSingleEntryRefusal", () => {
  it.each([
    [
      "newContent holds 2 entries; edit them one at a time or use updateLedgerFiles",
      { key: "journal.entryRefusal.oneAtATime" },
    ],
    [
      "newContent is empty; delete the entry instead of saving it blank",
      { key: "journal.entryRefusal.useDelete" },
    ],
    [
      "newContent holds no entry; remove the entry with deleteEntrySource instead",
      { key: "journal.entryRefusal.useDelete" },
    ],
    [
      'newContent\'s date line is indented; a dated directive starts at column zero: 2026-01-01 * "Cafe"',
      { key: "journal.entryRefusal.dateIndented" },
    ],
    [
      "newContent must be one dated directive: Assets:Cash  -23.50 USD",
      { key: "journal.entryRefusal.indentPostings" },
    ],
    [
      '`plugin` configures the ledger and is not an entry; change it with updateLedgerFiles: plugin "beancount.plugins.auto"',
      { key: "journal.entryRefusal.notAnEntry", params: { keyword: "plugin" } },
    ],
    [
      "newContent contains the control character U+001B, which the ledger cannot store as text",
      {
        key: "journal.entryRefusal.controlCharacter",
        params: { code: "U+001B" },
      },
    ],
  ])("explains %s", (message, expected) => {
    expect(getSingleEntryRefusal(refusal(message))).toEqual(expected);
  });

  it("leaves other refusals, other codes and hostile text to the generic path", () => {
    expect(
      getSingleEntryRefusal(refusal("Account Expenses:Nope was never opened")),
    ).toBeNull();
    expect(
      getSingleEntryRefusal(
        refusal(
          "newContent holds 2 entries; edit them one at a time",
          "INTERNAL_SERVER_ERROR",
        ),
      ),
    ).toBeNull();
    expect(
      getSingleEntryRefusal(
        refusal(
          "`<img src=x>` configures the ledger and is not an entry; change it",
        ),
      ),
    ).toBeNull();
    expect(
      getSingleEntryRefusal(
        new Error("newContent holds 2 entries; edit them one at a time"),
      ),
    ).toBeNull();
  });
});
