import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isChunkLoadError,
  isLocallyHandledChunkError,
  reloadOnceForStaleChunk,
  rethrowLocallyHandledChunkError,
} from "../chunk-load-error";

describe("locally handled chunk failures", () => {
  it("rethrows the original error and claims only its identity", () => {
    const message =
      "Failed to fetch dynamically imported module: https://x/lgassets/ja.js";
    const optionalFailure = new TypeError(message);
    const unrelatedFailure = new TypeError(message);

    expect(isLocallyHandledChunkError(optionalFailure)).toBe(false);
    let rejected: unknown;
    try {
      rethrowLocallyHandledChunkError(optionalFailure);
    } catch (error) {
      rejected = error;
    }

    expect(rejected).toBe(optionalFailure);
    expect(isChunkLoadError(rejected)).toBe(true);
    expect(isLocallyHandledChunkError(optionalFailure)).toBe(true);
    // A separate critical import can report the same URL/message. It still
    // belongs to global recovery rather than this optional import's owner.
    expect(isLocallyHandledChunkError(unrelatedFailure)).toBe(false);
  });

  it("claims both independently caught imports even when the second fails after Promise.all settles", async () => {
    let failTranslation!: (error: unknown) => void;
    let failDate!: (error: unknown) => void;
    const translationFailure = new TypeError("Translation import failed");
    const dateFailure = new TypeError("Date locale import failed");
    const translation = new Promise((_, reject) => {
      failTranslation = reject;
    }).catch(rethrowLocallyHandledChunkError);
    const date = new Promise((_, reject) => {
      failDate = reject;
    }).catch(rethrowLocallyHandledChunkError);
    const request = Promise.all([translation, date]);
    // Observe the aggregate before triggering either failure.
    const firstRejection = request.catch((error: unknown) => error);
    failTranslation(translationFailure);

    expect(await firstRejection).toBe(translationFailure);
    expect(isLocallyHandledChunkError(translationFailure)).toBe(true);
    expect(isLocallyHandledChunkError(dateFailure)).toBe(false);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        failDate(dateFailure);
        resolve();
      }, 0);
    });
    const settled = await Promise.allSettled([translation, date]);
    for (const [index, result] of settled.entries()) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") {
        expect(result.reason).toBe([translationFailure, dateFailure][index]);
      }
    }
    expect(isLocallyHandledChunkError(dateFailure)).toBe(true);
  });

  it("does not replace an unusual thrown value with a WeakSet type error", () => {
    const failure = "module evaluation failed";
    let rejected: unknown;
    try {
      rethrowLocallyHandledChunkError(failure);
    } catch (error) {
      rejected = error;
    }

    expect(rejected).toBe(failure);
    expect(isLocallyHandledChunkError(failure)).toBe(false);
    expect(isLocallyHandledChunkError(null)).toBe(false);
  });
});

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
