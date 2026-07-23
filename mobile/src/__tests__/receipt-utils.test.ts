import {
  receiptErrorKey,
  mimeToExt,
} from "../screens/receipt-capture-screen/receipt-utils";

// ──────────────────────────────────────────────────────────────────────────────
// receiptErrorKey
// ──────────────────────────────────────────────────────────────────────────────

test("receiptErrorKey maps quota_exhausted", () => {
  expect(receiptErrorKey("quota_exhausted")).toBe("receiptQuotaExhausted");
});

test("receiptErrorKey maps parse_failed", () => {
  expect(receiptErrorKey("parse_failed")).toBe("receiptParseFailed");
});

test("receiptErrorKey falls back to upload failed for unknown codes", () => {
  expect(receiptErrorKey("upload_failed")).toBe("receiptUploadFailed");
  expect(receiptErrorKey("upload_url_timeout")).toBe("receiptUploadFailed");
  expect(receiptErrorKey("network_error")).toBe("receiptUploadFailed");
  expect(receiptErrorKey("")).toBe("receiptUploadFailed");
});

// ──────────────────────────────────────────────────────────────────────────────
// mimeToExt
// ──────────────────────────────────────────────────────────────────────────────

test("mimeToExt extracts jpeg subtype", () => {
  expect(mimeToExt("image/jpeg")).toBe("jpeg");
});

test("mimeToExt extracts png subtype", () => {
  expect(mimeToExt("image/png")).toBe("png");
});

test("mimeToExt falls back to jpg for malformed mime", () => {
  expect(mimeToExt("invalidmime")).toBe("jpg");
});
