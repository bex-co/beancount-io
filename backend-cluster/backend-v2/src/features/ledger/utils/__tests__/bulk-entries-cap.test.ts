import { BadUserInputError } from "@/shared/errors";
import {
  MAX_BULK_ENTRIES,
  assertBulkEntriesSize,
} from "../bulk-entries-cap";

// w23/103: one call carries at most MAX_BULK_ENTRIES entries.
describe("assertBulkEntriesSize", () => {
  it("accepts exactly the cap", () => {
    expect(() =>
      assertBulkEntriesSize(new Array(MAX_BULK_ENTRIES), "added"),
    ).not.toThrow();
  });

  it("refuses one past the cap, naming the count, the cap, and the fix", () => {
    expect(() =>
      assertBulkEntriesSize(new Array(MAX_BULK_ENTRIES + 1), "added"),
    ).toThrow(BadUserInputError);
    expect(() =>
      assertBulkEntriesSize(new Array(MAX_BULK_ENTRIES + 1), "added"),
    ).toThrow(
      `entries holds ${MAX_BULK_ENTRIES + 1} entries; at most ${MAX_BULK_ENTRIES} may be added per call. Split into several calls.`,
    );
  });

  it("words the delete refusal as deleted", () => {
    expect(() =>
      assertBulkEntriesSize(new Array(MAX_BULK_ENTRIES + 1), "deleted"),
    ).toThrow(/may be deleted per call/);
  });
});
