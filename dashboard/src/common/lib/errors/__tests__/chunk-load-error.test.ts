import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isChunkLoadError, reloadOnceForStaleChunk } from "../chunk-load-error";

describe("isChunkLoadError", () => {
  it.each([
    "Failed to fetch dynamically imported module: https://x/lgassets/a.js",
    "error loading dynamically imported module: https://x/lgassets/a.js",
    "Importing a module script failed.",
    "Unable to preload CSS for /lgassets/a.css",
  ])("recognizes %s", (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it("ignores ordinary failures", () => {
    expect(isChunkLoadError(new Error("x is not a function"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError("Failed to fetch")).toBe(false);
  });
});

describe("reloadOnceForStaleChunk", () => {
  const reload = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockClear();
    vi.useFakeTimers();
    vi.stubGlobal("location", { ...window.location, reload });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reloads the first time", () => {
    expect(reloadOnceForStaleChunk()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload again while the chunk is still missing", () => {
    reloadOnceForStaleChunk();
    vi.advanceTimersByTime(5_000);
    expect(reloadOnceForStaleChunk()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads again for a later deploy", () => {
    reloadOnceForStaleChunk();
    vi.advanceTimersByTime(61_000);
    expect(reloadOnceForStaleChunk()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("does not reload without a working loop guard", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(reloadOnceForStaleChunk()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
