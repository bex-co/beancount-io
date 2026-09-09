import {
  clearPendingAppLink,
  peekPendingAppLink,
  setPendingAppLink,
  takePendingAppLink,
} from "../pending-app-link";

describe("pendingAppLink", () => {
  afterEach(() => {
    clearPendingAppLink();
  });

  it("stores a target and consumes it once after sign-in", () => {
    const target = {
      ledgerFullName: "open_ledger/example",
      href: "/reports" as const,
    };
    const sourceUrl =
      "https://beancount.io/ledger/open_ledger/example/balance-sheet";
    setPendingAppLink(target, sourceUrl);
    expect(peekPendingAppLink()).toEqual({ target, sourceUrl });
    expect(takePendingAppLink()).toEqual({ target, sourceUrl });
    expect(takePendingAppLink()).toBe(null);
  });
});
