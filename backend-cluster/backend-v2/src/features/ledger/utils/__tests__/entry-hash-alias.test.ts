import { BadUserInputError } from "@/shared/errors";
import { assertSha256Format, resolveEntryHash } from "../entry-hash-alias";

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

// w31/054: entry-source optimistic-lock checksums are 64 lowercase hex digits.
describe("assertSha256Format", () => {
  const VALID = "0123456789abcdef".repeat(4);

  it("accepts a 64-character lowercase hex SHA-256 digest", () => {
    expect(() => assertSha256Format(VALID)).not.toThrow();
  });

  it.each([
    "",
    "   ",
    "not-a-sha",
    "ab".repeat(16),
    VALID.toUpperCase(),
    VALID.slice(0, 63),
    `${VALID}0`,
    "g".repeat(64),
  ])("refuses %j with BadUserInputError on field sha256sum", (bad) => {
    let thrown: unknown;
    try {
      assertSha256Format(bad);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(BadUserInputError);
    expect(thrown).toMatchObject({
      category: "BAD_USER_INPUT",
      metadata: { field: "sha256sum" },
    });
  });
});
