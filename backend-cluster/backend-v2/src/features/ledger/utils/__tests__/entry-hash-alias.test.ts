import { BadUserInputError } from "@/shared/errors";
import { resolveEntryHash } from "../entry-hash-alias";

// w23/m3/t001: the one entry-hash spelling rule.
describe("resolveEntryHash", () => {
  it("accepts either spelling", () => {
    expect(resolveEntryHash({ entryHash: "a" })).toBe("a");
    expect(resolveEntryHash({ entry_hash: "b" })).toBe("b");
  });

  it("accepts both spellings when they agree", () => {
    expect(resolveEntryHash({ entryHash: "a", entry_hash: "a" })).toBe("a");
  });

  it("refuses two different hashes instead of guessing", () => {
    expect(() => resolveEntryHash({ entryHash: "a", entry_hash: "b" })).toThrow(
      BadUserInputError,
    );
    // w1/187: the sentence reads as English and keeps "not two different".
    expect(() => resolveEntryHash({ entryHash: "a", entry_hash: "b" })).toThrow(
      "Pass entryHash or entry_hash (as list output spells it), not two different hashes.",
    );
  });

  it("refuses a missing hash naming the alias", () => {
    expect(() => resolveEntryHash({})).toThrow(BadUserInputError);
    expect(() => resolveEntryHash({})).toThrow(
      "entryHash is required (entry_hash, as list output spells it, also works).",
    );
  });
});
