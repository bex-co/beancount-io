import { buildLedgerUrl, type BuildLedgerUrlInput } from "../build-ledger-url";
import { resolveAppLink } from "../resolve-app-link";

const LEDGER = "open_ledger/example";
const ORIGIN = "https://beancount.io";

describe("resolveAppLink", () => {
  it("maps ledger home and overview to the tabs root", () => {
    expect(
      resolveAppLink(`${ORIGIN}/ledger/${LEDGER}`, { serverUrl: ORIGIN }),
    ).toEqual({ ledgerFullName: LEDGER, href: "/" });
    expect(
      resolveAppLink(`${ORIGIN}/ledger/${LEDGER}/overview/`, {
        serverUrl: ORIGIN,
      }),
    ).toEqual({ ledgerFullName: LEDGER, href: "/" });
  });

  it("maps each documented ledger sub-path", () => {
    expect(
      resolveAppLink(`${ORIGIN}/ledger/${LEDGER}/account/Assets:Cash`, {
        serverUrl: ORIGIN,
      }),
    ).toEqual({
      ledgerFullName: LEDGER,
      href: {
        pathname: "/account-detail",
        params: { account: "Assets:Cash" },
      },
    });
    expect(
      resolveAppLink(`${ORIGIN}/ledger/${LEDGER}/journal`, {
        serverUrl: ORIGIN,
      }),
    ).toEqual({
      ledgerFullName: LEDGER,
      href: "/transactions",
    });
    expect(
      resolveAppLink(`${ORIGIN}/ledger/${LEDGER}/commit/abc123`, {
        serverUrl: ORIGIN,
      }),
    ).toEqual({
      ledgerFullName: LEDGER,
      href: { pathname: "/commit-detail", params: { sha: "abc123" } },
    });
    expect(
      resolveAppLink(
        `${ORIGIN}/ledger/${LEDGER}/files/blob/main/main.beancount`,
        { serverUrl: ORIGIN },
      ),
    ).toEqual({
      ledgerFullName: LEDGER,
      href: {
        pathname: "/ledger-file-editor",
        params: { path: "main.beancount" },
      },
    });
    expect(
      resolveAppLink(`${ORIGIN}/ledger/${LEDGER}/balance-sheet`, {
        serverUrl: ORIGIN,
      }),
    ).toEqual({
      ledgerFullName: LEDGER,
      href: "/reports",
    });
    expect(
      resolveAppLink(`${ORIGIN}/ledger/${LEDGER}/income-statement`, {
        serverUrl: ORIGIN,
      }),
    ).toEqual({
      ledgerFullName: LEDGER,
      href: "/reports",
    });
    expect(
      resolveAppLink(`${ORIGIN}/ledger/${LEDGER}/budget`, {
        serverUrl: ORIGIN,
      }),
    ).toEqual({ ledgerFullName: LEDGER, href: "/budget" });
    expect(
      resolveAppLink(`${ORIGIN}/ledger/${LEDGER}/entry/deadbeef`, {
        serverUrl: ORIGIN,
      }),
    ).toEqual({
      ledgerFullName: LEDGER,
      href: {
        pathname: "/transaction-detail",
        params: { entry_hash: "deadbeef" },
      },
    });
  });

  it("falls unknown sub-paths back to ledger home", () => {
    expect(
      resolveAppLink(`${ORIGIN}/ledger/${LEDGER}/cash-flow`, {
        serverUrl: ORIGIN,
      }),
    ).toEqual({ ledgerFullName: LEDGER, href: "/" });
  });

  it("decodes encoded account names and ignores query strings", () => {
    expect(
      resolveAppLink(
        `${ORIGIN}/ledger/${LEDGER}/account/Assets%3ABank%20Checking?lang=en`,
        { serverUrl: ORIGIN },
      ),
    ).toEqual({
      ledgerFullName: LEDGER,
      href: {
        pathname: "/account-detail",
        params: { account: "Assets:Bank Checking" },
      },
    });
  });

  it("rejects non-ledger and foreign-host URLs", () => {
    expect(resolveAppLink(`${ORIGIN}/gallery`, { serverUrl: ORIGIN })).toBe(
      null,
    );
    expect(
      resolveAppLink(`${ORIGIN}/auth/sign-in`, { serverUrl: ORIGIN }),
    ).toBe(null);
    expect(
      resolveAppLink("https://evil.example/ledger/open_ledger/example", {
        serverUrl: ORIGIN,
      }),
    ).toBe(null);
    expect(resolveAppLink("not-a-url")).toBe(null);
  });

  it("accepts the selected server host in addition to the hosted domain", () => {
    const selfHost = "https://books.example.test";
    expect(
      resolveAppLink(`${selfHost}/ledger/${LEDGER}/journal`, {
        serverUrl: selfHost,
      }),
    ).toEqual({
      ledgerFullName: LEDGER,
      href: "/transactions",
    });
    // Hosted domain still works even when a self-host is selected.
    expect(
      resolveAppLink(`${ORIGIN}/ledger/${LEDGER}`, {
        serverUrl: selfHost,
      }),
    ).toEqual({ ledgerFullName: LEDGER, href: "/" });
  });
});

describe("buildLedgerUrl round trip", () => {
  const cases: BuildLedgerUrlInput[] = [
    { kind: "home", ledgerFullName: LEDGER },
    { kind: "account", ledgerFullName: LEDGER, account: "Assets:Cash" },
    { kind: "journal", ledgerFullName: LEDGER },
    { kind: "commit", ledgerFullName: LEDGER, sha: "abc123" },
    {
      kind: "file",
      ledgerFullName: LEDGER,
      branch: "main",
      path: "accounts/bank.beancount",
    },
    { kind: "income-statement", ledgerFullName: LEDGER },
    { kind: "balance-sheet", ledgerFullName: LEDGER },
    { kind: "budget", ledgerFullName: LEDGER },
    { kind: "entry", ledgerFullName: LEDGER, entryHash: "deadbeef" },
  ];

  for (const input of cases) {
    it(`round-trips ${input.kind}`, () => {
      const url = buildLedgerUrl(input, ORIGIN);
      const resolved = resolveAppLink(url, { serverUrl: ORIGIN });
      expect(resolved === null).toBe(false);
      expect(resolved!.ledgerFullName).toBe(LEDGER);
      // income-statement and balance-sheet both land on reports.
      if (input.kind === "income-statement" || input.kind === "balance-sheet") {
        expect(resolved!.href).toBe("/reports");
        return;
      }
      if (input.kind === "home") {
        expect(resolved!.href).toBe("/");
        return;
      }
      if (input.kind === "journal") {
        expect(resolved!.href).toBe("/transactions");
        return;
      }
      if (input.kind === "budget") {
        expect(resolved!.href).toBe("/budget");
        return;
      }
      if (input.kind === "account") {
        expect(resolved!.href).toEqual({
          pathname: "/account-detail",
          params: { account: input.account },
        });
        return;
      }
      if (input.kind === "commit") {
        expect(resolved!.href).toEqual({
          pathname: "/commit-detail",
          params: { sha: input.sha },
        });
        return;
      }
      if (input.kind === "file") {
        expect(resolved!.href).toEqual({
          pathname: "/ledger-file-editor",
          params: { path: input.path },
        });
        return;
      }
      if (input.kind === "entry") {
        expect(resolved!.href).toEqual({
          pathname: "/transaction-detail",
          params: { entry_hash: input.entryHash },
        });
      }
    });
  }
});
