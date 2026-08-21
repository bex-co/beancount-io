import { describe, expect, it } from "vitest";
import { getLedgerFileCanonicalUrl } from "../indexability";

describe("getLedgerFileCanonicalUrl", () => {
  it("builds a stable canonical URL for a public ledger file", () => {
    expect(
      getLedgerFileCanonicalUrl({
        ledgerOwner: "open ledger",
        ledgerName: "example",
        branch: "main",
        filePath: "books/2026.beancount",
      }),
    ).toBe(
      "https://beancount.io/ledger/open%20ledger/example/files/blob/main/books/2026.beancount",
    );
  });

  it("encodes each path segment without escaping separators", () => {
    expect(
      getLedgerFileCanonicalUrl({
        ledgerOwner: "alice",
        ledgerName: "家庭账本",
        branch: "feature/files",
        filePath: "资产/银行 账户.beancount",
      }),
    ).toBe(
      "https://beancount.io/ledger/alice/%E5%AE%B6%E5%BA%AD%E8%B4%A6%E6%9C%AC/files/blob/feature%2Ffiles/%E8%B5%84%E4%BA%A7/%E9%93%B6%E8%A1%8C%20%E8%B4%A6%E6%88%B7.beancount",
    );
  });
});
