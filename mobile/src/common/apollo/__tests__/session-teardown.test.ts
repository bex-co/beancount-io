const { teardownSessionCaches } = require("../session-teardown");

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
