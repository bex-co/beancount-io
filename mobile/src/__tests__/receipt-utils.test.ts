import {
  receiptDate,
  receiptErrorKey,
  parseErrorCode,
  mimeToExt,
} from "../screens/receipt-capture-screen/receipt-utils";
import { getFormatDate } from "../common/format-util";

// ──────────────────────────────────────────────────────────────────────────────
// receiptDate
// ──────────────────────────────────────────────────────────────────────────────

test("receiptDate passes a parsed date through unchanged", () => {
  expect(receiptDate("2026-01-15")).toBe("2026-01-15");
});

test("receiptDate falls back to today when the server returns no date", () => {
  const today = getFormatDate(new Date());
  expect(receiptDate("")).toBe(today);
  expect(receiptDate(null)).toBe(today);
  expect(receiptDate(undefined)).toBe(today);
});

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
// parseErrorCode — classifies the thrown parse-leg ApolloError
// ──────────────────────────────────────────────────────────────────────────────

test("parseErrorCode maps a RESOURCE_LIMIT_REACHED GraphQL error to quota", () => {
  const err = {
    graphQLErrors: [{ extensions: { code: "RESOURCE_LIMIT_REACHED" } }],
  };
  expect(parseErrorCode(err)).toBe("quota_exhausted");
});

test("parseErrorCode maps other GraphQL errors to parse_failed", () => {
  const err = {
    graphQLErrors: [{ extensions: { code: "INTERNAL_SERVER_ERROR" } }],
  };
  expect(parseErrorCode(err)).toBe("parse_failed");
});

test("parseErrorCode treats a network error (no GraphQL codes) as parse_failed", () => {
  expect(parseErrorCode(new Error("Network request failed"))).toBe(
    "parse_failed",
  );
  expect(parseErrorCode({ networkError: new Error("offline") })).toBe(
    "parse_failed",
  );
});

test("parseErrorCode is defensive against malformed shapes", () => {
  expect(parseErrorCode(null)).toBe("parse_failed");
  expect(parseErrorCode({ graphQLErrors: "nope" })).toBe("parse_failed");
  expect(parseErrorCode({ graphQLErrors: [{}] })).toBe("parse_failed");
});

test("parseErrorCode's result routes through receiptErrorKey to the right message", () => {
  const quota = {
    graphQLErrors: [{ extensions: { code: "RESOURCE_LIMIT_REACHED" } }],
  };
  expect(receiptErrorKey(parseErrorCode(quota))).toBe("receiptQuotaExhausted");
  const parse = { graphQLErrors: [{ extensions: { code: "BAD_USER_INPUT" } }] };
  expect(receiptErrorKey(parseErrorCode(parse))).toBe("receiptParseFailed");
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
