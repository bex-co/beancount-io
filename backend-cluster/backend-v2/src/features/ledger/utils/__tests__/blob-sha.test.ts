import { BadUserInputError } from "@/shared/errors";
import { assertBlobShaFormat } from "../blob-sha";

describe("assertBlobShaFormat", () => {
  it.each([
    ["40 lowercase hex (SHA-1)", "a".repeat(40)],
    ["mixed digits and a-f (SHA-1)", "0123456789abcdef".repeat(2) + "01234567"],
    ["64 lowercase hex (SHA-256)", "f".repeat(64)],
  ])("accepts valid %s", (_label, sha) => {
    expect(() => assertBlobShaFormat(sha)).not.toThrow();
  });

  it.each([
    ["empty string", ""],
    ["spaces only", "   "],
    ["non-hex string", "not-a-sha"],
    ["39 lowercase hex (too short)", "a".repeat(39)],
    ["41 lowercase hex (between SHA-1 and SHA-256)", "a".repeat(41)],
    ["63 lowercase hex", "a".repeat(63)],
    ["65 lowercase hex (too long)", "a".repeat(65)],
    ["32 lowercase hex (entry hash)", "a".repeat(32)],
    ["uppercase 40 hex", "A".repeat(40)],
    ["mixed-case 40 hex", "a".repeat(39) + "F"],
    ["uppercase 64 hex", "F".repeat(64)],
    ["leading whitespace", " " + "a".repeat(40)],
    ["trailing whitespace", "a".repeat(40) + " "],
    ["trailing newline", "a".repeat(40) + "\n"],
    ["non-hex char in 40 chars", "g" + "a".repeat(39)],
  ])("refuses %s with BAD_USER_INPUT naming sha", (_label, badSha) => {
    let thrown: unknown;
    try {
      assertBlobShaFormat(badSha);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(BadUserInputError);
    expect(thrown).toMatchObject({
      category: "BAD_USER_INPUT",
      message: expect.stringContaining("40- or 64-character lowercase hex"),
      metadata: {
        field: "sha",
        hint: expect.stringContaining("readLedgerFiles"),
      },
    });
  });

  it("supports a custom field name", () => {
    expect(() => assertBlobShaFormat("bad", "baseSha")).toThrow(
      BadUserInputError,
    );
    try {
      assertBlobShaFormat("bad", "baseSha");
    } catch (error) {
      expect(error).toMatchObject({ metadata: { field: "baseSha" } });
    }
  });
});
