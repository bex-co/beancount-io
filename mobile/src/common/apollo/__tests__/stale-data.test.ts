/**
 * Pure decision table for the stale-data indicator (m34).
 * Relative require: jest-lite has no `@/` alias for value imports.
 */
const {
  isShowingStaleData,
  isShowingStaleDataFromQueries,
} = require("../stale-data");

describe("isShowingStaleData", () => {
  it("is stale when cached data is present and the refetch errored", () => {
    expect(
      isShowingStaleData({ hasCachedData: true, error: new Error("offline") }),
    ).toBe(true);
  });

  it("is not stale when cached data is present and refetch succeeded", () => {
    expect(isShowingStaleData({ hasCachedData: true, error: null })).toBe(
      false,
    );
    expect(isShowingStaleData({ hasCachedData: true, error: undefined })).toBe(
      false,
    );
  });

  it("is not stale on first-load failure (error, no cache) — existing error UI", () => {
    expect(
      isShowingStaleData({ hasCachedData: false, error: new Error("offline") }),
    ).toBe(false);
  });

  it("is not stale when there is neither cache nor error", () => {
    expect(isShowingStaleData({ hasCachedData: false, error: null })).toBe(
      false,
    );
  });
});

describe("isShowingStaleDataFromQueries", () => {
  it("is true when any query is cached+errored", () => {
    expect(
      isShowingStaleDataFromQueries([
        { data: { ok: true }, error: null },
        { data: { ok: true }, error: new Error("x") },
      ]),
    ).toBe(true);
  });

  it("is false when errors have no cached data", () => {
    expect(
      isShowingStaleDataFromQueries([
        { data: undefined, error: new Error("x") },
        { data: null, error: new Error("y") },
      ]),
    ).toBe(false);
  });
});
