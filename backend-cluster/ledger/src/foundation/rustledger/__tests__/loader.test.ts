/**
 * Load-failure retry semantics of the memoized `loadRustledger`. The live WASM
 * path is deliberately NOT exercised (unit tests stay off it — see loader.ts):
 * `readFileSync` is mocked to fail, which aborts the load BEFORE the dynamic
 * `import()` is ever reached.
 */
jest.mock("node:fs", () => ({
  ...jest.requireActual("node:fs"),
  readFileSync: jest.fn(),
}));

import { readFileSync } from "node:fs";
import { loadRustledger } from "../loader";

const mockReadFileSync = readFileSync as jest.Mock;

describe("loadRustledger", () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
  });

  it("does not memoize a rejected load — the next call retries", async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("transient FS failure");
    });

    await expect(loadRustledger()).rejects.toThrow("transient FS failure");
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);

    // The second call must RE-ATTEMPT the load (readFileSync runs again),
    // not hand back the same forever-dead memoized promise.
    await expect(loadRustledger()).rejects.toThrow("transient FS failure");
    expect(mockReadFileSync).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent callers into one in-flight attempt", async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("boom");
    });

    const first = loadRustledger();
    const second = loadRustledger();

    expect(second).toBe(first);
    await expect(first).rejects.toThrow("boom");
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
  });
});
