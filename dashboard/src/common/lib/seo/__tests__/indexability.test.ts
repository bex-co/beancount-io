import { describe, expect, it } from "vitest";
import {
  getLedgerAgentCanonicalUrl,
  getLedgerCommitCanonicalUrl,
  getLedgerFileCanonicalUrl,
  getSelfCanonicalUrl,
} from "../indexability";

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

describe("getLedgerCommitCanonicalUrl", () => {
  it("builds a stable canonical URL for a public ledger commit", () => {
    expect(
      getLedgerCommitCanonicalUrl({
        ledgerOwner: "open_ledger",
        ledgerName: "amazon",
        commitSha: "c121e11e8e941633c2b8e252d0cd642ae120885a",
      }),
    ).toBe(
      "https://beancount.io/ledger/open_ledger/amazon/commit/c121e11e8e941633c2b8e252d0cd642ae120885a",
    );
  });

  it("encodes owner, ledger, and sha without double-encoding", () => {
    expect(
      getLedgerCommitCanonicalUrl({
        ledgerOwner: "alice bob",
        ledgerName: "my/ledger",
        commitSha: "abc123",
      }),
    ).toBe("https://beancount.io/ledger/alice%20bob/my%2Fledger/commit/abc123");
  });

  it("is distinct from the commits list URL", () => {
    const commitUrl = getLedgerCommitCanonicalUrl({
      ledgerOwner: "open_ledger",
      ledgerName: "example",
      commitSha: "deadbeef",
    });
    expect(commitUrl).not.toBe(
      "https://beancount.io/ledger/open_ledger/example/commits",
    );
    expect(commitUrl).toContain("/commit/");
  });
});

describe("getLedgerAgentCanonicalUrl", () => {
  it("builds canonical for agent surface", () => {
    expect(
      getLedgerAgentCanonicalUrl({
        ledgerOwner: "open_ledger",
        ledgerName: "example",
      }),
    ).toBe("https://beancount.io/ledger/open_ledger/example/agent");
  });
});

describe("getSelfCanonicalUrl", () => {
  it("returns clean path with no params", () => {
    expect(
      getSelfCanonicalUrl({ pathname: "/ledger/open_ledger/example" }),
    ).toBe("https://beancount.io/ledger/open_ledger/example");
    expect(
      getSelfCanonicalUrl({
        pathname: "/ledger/open_ledger/example/account/Expenses:Financial:Fees",
        search: "",
      }),
    ).toBe(
      "https://beancount.io/ledger/open_ledger/example/account/Expenses:Financial:Fees",
    );
  });

  it("preserves supported lang param (string search)", () => {
    expect(
      getSelfCanonicalUrl({
        pathname: "/ledger/open_ledger/example/account/Expenses:Financial:Fees",
        search: "?lang=uk",
      }),
    ).toBe(
      "https://beancount.io/ledger/open_ledger/example/account/Expenses:Financial:Fees?lang=uk",
    );
    expect(
      getSelfCanonicalUrl({
        pathname: "/login",
        search: "lang=ca",
      }),
    ).toBe("https://beancount.io/login?lang=ca");
  });

  it("preserves supported lang when passed as object", () => {
    expect(
      getSelfCanonicalUrl({
        pathname: "/ledger/open_ledger/example",
        search: { lang: "uk" } as Record<string, unknown>,
      }),
    ).toBe("https://beancount.io/ledger/open_ledger/example?lang=uk");
  });

  it("strips unsupported lang", () => {
    expect(
      getSelfCanonicalUrl({
        pathname: "/ledger/open_ledger/example",
        search: "?lang=zz",
      }),
    ).toBe("https://beancount.io/ledger/open_ledger/example");
    expect(
      getSelfCanonicalUrl({
        pathname: "/ledger/open_ledger/example",
        search: { lang: "zz" } as Record<string, unknown>,
      }),
    ).toBe("https://beancount.io/ledger/open_ledger/example");
  });

  it("strips UI-state params and keeps only valid lang", () => {
    expect(
      getSelfCanonicalUrl({
        pathname: "/ledger/open_ledger/example/files/blob/main/books.beancount",
        search: "?editMode=true&lang=uk&lineNumber=12",
      }),
    ).toBe(
      "https://beancount.io/ledger/open_ledger/example/files/blob/main/books.beancount?lang=uk",
    );
    expect(
      getSelfCanonicalUrl({
        pathname: "/ledger/a/b",
        search: "?editMode=true&lang=xx&foo=bar",
      }),
    ).toBe("https://beancount.io/ledger/a/b");
  });

  it("strips hash", () => {
    expect(
      getSelfCanonicalUrl({
        pathname: "/ledger/open_ledger/example#section",
        search: "?lang=uk",
      }),
    ).toBe(
      "https://beancount.io/ledger/open_ledger/example?lang=uk",
    );
  });

  it("handles encoded account paths without double-encoding", () => {
    const pathname =
      "/ledger/open_ledger/example/account/Expenses%3AFinancial%3AFees";
    expect(
      getSelfCanonicalUrl({ pathname, search: "?lang=ca" }),
    ).toBe(
      "https://beancount.io/ledger/open_ledger/example/account/Expenses%3AFinancial%3AFees?lang=ca",
    );
  });
});
