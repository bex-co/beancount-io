import { describe, expect, it } from "vitest";
import {
  accountsActionSearchSchema,
  journalActionSearchSchema,
} from "../ledger-action-search";

describe("ledger action search schemas", () => {
  it("accepts only the canonical account action", () => {
    expect(
      accountsActionSearchSchema.parse({ action: "open-account" }),
    ).toEqual({ action: "open-account" });
    expect(
      accountsActionSearchSchema.parse({ action: "delete-account" }),
    ).toEqual({});
    expect(
      accountsActionSearchSchema.parse({ action: ["open-account"] }),
    ).toEqual({});
  });

  it.each(["transaction", "balance", "note", "account"] as const)(
    "accepts a copyable journal action for the %s form",
    (directive) => {
      expect(
        journalActionSearchSchema.parse({
          action: "new-entry",
          directive,
          account: "Assets:Cash",
          filter: "coffee",
          time: "year",
        }),
      ).toEqual({
        action: "new-entry",
        directive,
        account: "Assets:Cash",
        filter: "coffee",
        time: "year",
      });
    },
  );

  it("defaults a valid journal action to the transaction form", () => {
    expect(journalActionSearchSchema.parse({ action: "new-entry" })).toEqual({
      action: "new-entry",
    });
  });

  it("drops invalid journal actions without losing valid filters", () => {
    expect(
      journalActionSearchSchema.parse({
        action: "new-entry",
        directive: "custom",
        account: "Assets:Cash",
        filter: "coffee",
        time: "year",
      }),
    ).toEqual({
      account: "Assets:Cash",
      filter: "coffee",
      time: "year",
    });

    expect(
      journalActionSearchSchema.parse({
        action: "delete-entry",
        directive: "transaction",
      }),
    ).toEqual({});
  });
});
