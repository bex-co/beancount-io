import { describe, expect, it } from "vitest";
import {
  managedPriceSourceUrl,
  readEntrySourceLocation,
} from "../entry-source-location";

describe("readEntrySourceLocation", () => {
  it("returns a navigable location when filename and positive lineno are present", () => {
    expect(
      readEntrySourceLocation({
        meta: { filename: "main.bean", lineno: 42 },
      }),
    ).toEqual({ filename: "main.bean", lineno: 42 });
  });

  it("rejects missing, blank, or nonpositive locations", () => {
    expect(readEntrySourceLocation({ meta: null })).toBeNull();
    expect(
      readEntrySourceLocation({ meta: { filename: "", lineno: 1 } }),
    ).toBeNull();
    expect(
      readEntrySourceLocation({ meta: { filename: "main.bean", lineno: 0 } }),
    ).toBeNull();
    expect(
      readEntrySourceLocation({
        meta: { filename: "main.bean", lineno: 1.5 },
      }),
    ).toBeNull();
  });
});

describe("managedPriceSourceUrl", () => {
  it.each([
    [
      "https:/beancount.io/prices/BTC-USD",
      "https://beancount.io/prices/BTC-USD",
    ],
    // Included from a nested file: the key is resolved against its directory.
    [
      "books/2026/https:/beancount.io/prices/ETH-EUR",
      "https://beancount.io/prices/ETH-EUR",
    ],
    ["http:/localhost:8080/prices/X", "http://localhost:8080/prices/X"],
  ])("recovers the feed URL from the virtual key %s", (filename, url) => {
    expect(managedPriceSourceUrl(filename)).toBe(url);
  });

  it.each([
    "main.bean",
    "prices/btc.bean",
    "notes:2026.bean",
    "books/Assets:Cash.bean",
    "",
  ])("treats the repository path %j as an ordinary file", (filename) => {
    expect(managedPriceSourceUrl(filename)).toBeNull();
  });
});
