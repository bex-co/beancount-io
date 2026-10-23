import {
  isPermanentReceiptRefusal,
  parseErrorCode,
  receiptCanRetry,
  receiptErrorKey,
} from "../receipt-utils";

// w21/869: a self-hosted server with no storage or model keys refused every
// scan, and each "Try again" uploaded the same photo to be refused again.
const refused = (code: string) =>
  Object.assign(new Error("refused"), {
    graphQLErrors: [{ message: "refused", extensions: { code } }],
  });

describe("a permanent server refusal on the receipt legs", () => {
  it("is told apart from a transient failure", () => {
    for (const code of ["CONFIGURATION_ERROR", "FORBIDDEN"]) {
      expect(isPermanentReceiptRefusal(refused(code))).toBe(true);
      expect(parseErrorCode(refused(code))).toBe("not_available");
    }
    // A refused photo is the photo's: another one can work.
    for (const code of [
      "INTERNAL_SERVER_ERROR",
      "SERVICE_UNAVAILABLE",
      "BAD_USER_INPUT",
    ]) {
      expect(isPermanentReceiptRefusal(refused(code))).toBe(false);
      expect(parseErrorCode(refused(code))).toBe("parse_failed");
    }
    expect(isPermanentReceiptRefusal(new Error("Network request failed"))).toBe(
      false,
    );
  });

  it("keeps a spent quota its own message", () => {
    expect(parseErrorCode(refused("RESOURCE_LIMIT_REACHED"))).toBe(
      "quota_exhausted",
    );
  });

  it("shows its own message and offers no retry", () => {
    expect(receiptErrorKey("not_available")).toBe("receiptNotAvailable");
    expect(receiptCanRetry("not_available")).toBe(false);
    expect(receiptCanRetry("parse_failed")).toBe(true);
    expect(receiptCanRetry("upload_failed")).toBe(true);
  });
});
