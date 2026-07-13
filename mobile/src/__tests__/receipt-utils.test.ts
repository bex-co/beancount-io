import {
  buildReceiptPostings,
  receiptErrorKey,
  mimeToExt,
} from "../screens/receipt-capture-screen/receipt-utils";

// ──────────────────────────────────────────────────────────────────────────────
// buildReceiptPostings
// ──────────────────────────────────────────────────────────────────────────────

test("buildReceiptPostings produces balanced debit/credit pair", () => {
  const postings = buildReceiptPostings(
    29.98,
    "Expenses:Groceries",
    "Assets:Checking",
    "USD",
  );
  expect(postings.length).toBe(2);
  expect(postings[0]).toEqual({
    account: "Expenses:Groceries",
    amountNumber: "29.98",
    amountCurrency: "USD",
  });
  expect(postings[1]).toEqual({
    account: "Assets:Checking",
    amountNumber: "-29.98",
    amountCurrency: "USD",
  });
});

test("buildReceiptPostings rounds to two decimal places", () => {
  const postings = buildReceiptPostings(
    5,
    "Expenses:Food",
    "Liabilities:Card",
    "EUR",
  );
  expect(postings[0].amountNumber).toBe("5.00");
  expect(postings[1].amountNumber).toBe("-5.00");
});

test("buildReceiptPostings uses provided currency", () => {
  const postings = buildReceiptPostings(10, "Expenses:X", "Assets:Y", "CNY");
  expect(postings[0].amountCurrency).toBe("CNY");
  expect(postings[1].amountCurrency).toBe("CNY");
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

test("receiptErrorKey maps save_failed", () => {
  expect(receiptErrorKey("save_failed")).toBe("receiptSaveFailed");
});

test("receiptErrorKey falls back to upload failed for unknown codes", () => {
  expect(receiptErrorKey("upload_failed")).toBe("receiptUploadFailed");
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
