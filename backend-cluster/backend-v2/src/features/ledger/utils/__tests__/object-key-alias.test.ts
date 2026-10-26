import { BadUserInputError } from "@/shared/errors";
import { resolveObjectKey } from "../object-key-alias";

// w23/m11/t007: the one object-key spelling rule every surface applies.
describe("resolveObjectKey", () => {
  it("accepts each spelling", () => {
    expect(resolveObjectKey({ objectKey: "tmp/a.pdf" })).toBe("tmp/a.pdf");
    expect(resolveObjectKey({ s3ObjectKey: "tmp/a.pdf" })).toBe("tmp/a.pdf");
    expect(resolveObjectKey({ receiptObjectKey: "tmp/a.pdf" })).toBe(
      "tmp/a.pdf",
    );
  });

  it("refuses a missing key, naming the twins that would have worked", () => {
    expect(() => resolveObjectKey({})).toThrow(BadUserInputError);
    expect(() => resolveObjectKey({})).toThrow(
      /objectKey is required — s3ObjectKey and receiptObjectKey work too/,
    );
  });

  it("treats explicit null as missing", () => {
    expect(() =>
      resolveObjectKey({
        objectKey: null,
        s3ObjectKey: null,
        receiptObjectKey: null,
      }),
    ).toThrow(BadUserInputError);
    expect(
      resolveObjectKey({ objectKey: null, s3ObjectKey: "tmp/a.pdf" }),
    ).toBe("tmp/a.pdf");
  });

  it("accepts agreeing spellings of the same key", () => {
    expect(
      resolveObjectKey({ objectKey: "tmp/a.pdf", s3ObjectKey: "tmp/a.pdf" }),
    ).toBe("tmp/a.pdf");
    expect(
      resolveObjectKey({
        objectKey: "tmp/a.pdf",
        s3ObjectKey: "tmp/a.pdf",
        receiptObjectKey: "tmp/a.pdf",
      }),
    ).toBe("tmp/a.pdf");
  });

  it("refuses two different keys instead of guessing", () => {
    expect(() =>
      resolveObjectKey({ objectKey: "tmp/a.pdf", s3ObjectKey: "tmp/b.pdf" }),
    ).toThrow(BadUserInputError);
  });

  it("names both spellings in the conflict refusal", () => {
    expect(() =>
      resolveObjectKey({
        s3ObjectKey: "tmp/a.pdf",
        receiptObjectKey: "tmp/b.pdf",
      }),
    ).toThrow(/not s3ObjectKey and receiptObjectKey with different values/);
  });

  it("passes a blank key through to the ownership check", () => {
    // A blank key is refused downstream as BAD_USER_INPUT with the tmp/
    // hint the parse/insert parity suites pin — the helper must not
    // swallow it into the missing-key message.
    expect(resolveObjectKey({ objectKey: "" })).toBe("");
  });
});
