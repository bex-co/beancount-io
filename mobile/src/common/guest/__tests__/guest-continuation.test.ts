import {
  beginGuestSignIn,
  bindGuestAuthorization,
  clearGuestVisit,
  endGuestSignIn,
  guestContinuation,
  guestVisitVar,
  startGuestVisit,
  updateGuestVisit,
} from "../guest-state";
import { restoreGuestView } from "../restore-guest-view";

const serverUrl = "https://books.example/";
const state = "test-authorization-attempt";
function start() {
  startGuestVisit(serverUrl);
  updateGuestVisit({ ledgerId: "open_ledger/nvidia", view: "reports" });
  beginGuestSignIn();
  bindGuestAuthorization(serverUrl, state);
}
afterEach(clearGuestVisit);

describe("guest sign-in continuation", () => {
  it("retains the selected example and view on cancellation or failed sign-in", () => {
    start();
    const before = guestVisitVar();
    endGuestSignIn();
    expect(guestVisitVar()).toBe(before);
    expect(guestContinuation(serverUrl, state)).toBe(null);
  });

  it("binds a continuation to the deployment and actual OAuth attempt", () => {
    start();
    expect(guestContinuation(serverUrl, "different-attempt")).toBe(null);
    expect(guestContinuation("https://other.example/", state)).toBe(null);
    expect(guestContinuation(serverUrl, state)?.view).toBe("reports");
    clearGuestVisit();
    expect(guestContinuation(serverUrl, state)).toBe(null);
  });

  it("rechecks current access before restoring the chosen report", async () => {
    start();
    const calls: string[] = [];
    const handled = await restoreGuestView({
      serverUrl,
      state,
      isCurrentSession: () => true,
      readLedger: async (id) => {
        calls.push(`read:${id}`);
        return { id };
      },
      restore: (visit) => calls.push(`restore:${visit.ledgerId}:${visit.view}`),
      unavailable: () => calls.push("unavailable"),
    });
    expect(handled).toBe(true);
    expect(calls).toEqual([
      "read:open_ledger/nvidia",
      "restore:open_ledger/nvidia:reports",
    ]);
  });

  for (const view of ["transactions", "files"] as const) {
    it(`restores ${view} after checking access with the new identity`, async () => {
      startGuestVisit(serverUrl);
      updateGuestVisit({ ledgerId: "open_ledger/example", view });
      beginGuestSignIn();
      bindGuestAuthorization(serverUrl, state);
      const calls: string[] = [];
      await restoreGuestView({
        serverUrl,
        state,
        isCurrentSession: () => true,
        readLedger: async (id) => {
          calls.push(id);
          return { id };
        },
        restore: (visit) => {
          calls.push(visit.view);
        },
        unavailable: () => {
          calls.push("unavailable");
        },
      });
      expect(calls).toEqual(["open_ledger/example", view]);
    });
  }

  it("shows a recoverable failure instead of restoring a denied example", async () => {
    start();
    const calls: string[] = [];
    await restoreGuestView({
      serverUrl,
      state,
      isCurrentSession: () => true,
      readLedger: async () => {
        throw new Error("denied");
      },
      restore: () => calls.push("restored"),
      unavailable: () => calls.push("unavailable"),
    });
    expect(calls).toEqual(["unavailable"]);
  });

  it("discards an access check that outlives the ten-minute continuation", async () => {
    const originalNow = Date.now;
    let now = 1_000;
    Date.now = () => now;
    try {
      start();
      const calls: string[] = [];
      await restoreGuestView({
        serverUrl,
        state,
        isCurrentSession: () => true,
        readLedger: async (id) => {
          now += 10 * 60 * 1_000 + 1;
          return { id };
        },
        restore: () => calls.push("restored"),
        unavailable: () => calls.push("unavailable"),
      });
      expect(calls).toEqual([]);
      expect(guestContinuation(serverUrl, state)).toBe(null);
    } finally {
      Date.now = originalNow;
    }
  });

  for (const change of ["logout", "server", "selection", "session"] as const) {
    it(`discards a late access check after ${change} changes`, async () => {
      start();
      let resolve!: (value: { id: string }) => void;
      let currentSession = true;
      const calls: string[] = [];
      const pending = restoreGuestView({
        serverUrl,
        state,
        isCurrentSession: () => currentSession,
        readLedger: () =>
          new Promise((done) => {
            resolve = done;
          }),
        restore: () => calls.push("restored"),
        unavailable: () => calls.push("unavailable"),
      });
      if (change === "logout") clearGuestVisit();
      if (change === "server") startGuestVisit("https://other.example/");
      if (change === "selection")
        updateGuestVisit({ ledgerId: "open_ledger/example" });
      if (change === "session") currentSession = false;
      resolve({ id: "open_ledger/nvidia" });
      await pending;
      expect(calls).toEqual([]);
    });
  }
});
