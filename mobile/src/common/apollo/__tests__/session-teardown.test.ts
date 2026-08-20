/**
 * Proves sign-out tears down the persisted Apollo cache. Behavioral coverage
 * lives on `teardownSessionCaches`; the logout path is pinned to call it.
 */
const { teardownSessionCaches } = require("../session-teardown");
const fs = require("fs");
const path = require("path");

describe("teardownSessionCaches", () => {
  it("clears the session, purges disk, and clears the in-memory store", async () => {
    const calls: string[] = [];
    await teardownSessionCaches({
      clearSession: () => calls.push("session"),
      purgePersistedCache: async () => {
        calls.push("purge");
      },
      clearInMemoryStore: async () => {
        calls.push("clearStore");
      },
    });
    expect(calls).toEqual(["session", "purge", "clearStore"]);
  });

  it("still clears the session when purge rejects", async () => {
    let sessionCleared = false;
    let clearStoreCalls = 0;
    await teardownSessionCaches({
      clearSession: () => {
        sessionCleared = true;
      },
      purgePersistedCache: async () => {
        throw new Error("purge failed");
      },
      clearInMemoryStore: async () => {
        clearStoreCalls += 1;
      },
    });
    expect(sessionCleared).toBe(true);
    expect(clearStoreCalls).toBe(1);
  });
});

describe("actionLogout purge wiring", () => {
  it("calls teardownSessionCaches on the sign-out path", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../../../screens/setting/logout.ts"),
      "utf8",
    );
    expect(src.includes("teardownSessionCaches")).toBe(true);
    expect(src.includes("purgePersistedCache: purgeApolloCache")).toBe(true);
    expect(
      src.includes("clearInMemoryStore: () => apolloClient.clearStore()"),
    ).toBe(true);
  });
});
