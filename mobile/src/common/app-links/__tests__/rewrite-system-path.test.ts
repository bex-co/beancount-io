import { resolveAppLink } from "../resolve-app-link";
import { hrefToPath, rewriteSystemPath } from "../rewrite-system-path";
import { clearPendingAppLink, takePendingAppLink } from "../pending-app-link";

describe("rewriteSystemPath", () => {
  afterEach(() => {
    clearPendingAppLink();
  });

  it("rewrites a ledger balance-sheet path to reports and stashes the target", () => {
    const path = "/ledger/open_ledger/example/balance-sheet";
    const rewritten = rewriteSystemPath(path);
    expect(rewritten).toBe("/reports");
    const pending = takePendingAppLink();
    expect(pending?.target.ledgerFullName).toBe("open_ledger/example");
    expect(pending?.target.href).toBe("/reports");
  });

  it("rewrites custom-scheme ledger paths the same way", () => {
    clearPendingAppLink();
    expect(
      rewriteSystemPath(
        "beancount:///ledger/open_ledger/example/balance-sheet",
      ),
    ).toBe("/reports");
    expect(takePendingAppLink()?.target.href).toBe("/reports");
  });

  it("leaves unrelated paths alone", () => {
    expect(rewriteSystemPath("/auth/welcome")).toBe("/auth/welcome");
  });

  it("serializes param hrefs for account detail", () => {
    const target = resolveAppLink(
      "https://beancount.io/ledger/open_ledger/example/account/Assets:Cash",
      { serverUrl: "https://beancount.io" },
    );
    expect(target === null).toBe(false);
    expect(hrefToPath(target!.href)).toBe(
      "/account-detail?account=Assets%3ACash",
    );
  });
});
