import { parseManagedPriceUrl } from "../managed-price-policy";

const ORIGINS = ["https://beancount.io"];

describe("parseManagedPriceUrl", () => {
  it("accepts an allowlisted origin with a /prices/<ALIAS> path", () => {
    expect(
      parseManagedPriceUrl("https://beancount.io/prices/BTC-USD", ORIGINS),
    ).toEqual({
      allowed: true,
      url: "https://beancount.io/prices/BTC-USD",
      alias: "BTC-USD",
    });
  });

  it("canonicalizes the default port and keeps the alias case", () => {
    expect(
      parseManagedPriceUrl("https://beancount.io:443/prices/spy.us", ORIGINS),
    ).toEqual({
      allowed: true,
      url: "https://beancount.io/prices/spy.us",
      alias: "spy.us",
    });
  });

  it.each([
    ["https://example.com/prices/BTC-USD", "origin https://example.com is not an allowed managed price source"],
    ["http://beancount.io/prices/BTC-USD", "origin http://beancount.io is not an allowed managed price source"],
    ["s3://bucket/prices.bean", "origin s3://bucket is not an allowed managed price source"],
    ["https://beancount.io/prices/BTC-USD?from=2026-01-01", "a managed price URL must not carry a query string or fragment"],
    ["https://beancount.io/prices/BTC-USD#latest", "a managed price URL must not carry a query string or fragment"],
    ["https://user:pw@beancount.io/prices/BTC-USD", "a managed price URL must not carry credentials"],
    ["https://beancount.io/prices/BTC-USD/", "the path must be /prices/<ALIAS> (letters, digits, . _ -)"],
    ["https://beancount.io/prices/", "the path must be /prices/<ALIAS> (letters, digits, . _ -)"],
    ["https://beancount.io/prices/../catalog", "the path must be /prices/<ALIAS> (letters, digits, . _ -)"],
    ["https://beancount.io/catalog/BTC-USD", "the path must be /prices/<ALIAS> (letters, digits, . _ -)"],
    [`https://beancount.io/prices/${"A".repeat(65)}`, "the path must be /prices/<ALIAS> (letters, digits, . _ -)"],
    ["https://beancount.io/prices/BTC USD", "the path must be /prices/<ALIAS> (letters, digits, . _ -)"],
    ["not a url", "not a valid URL"],
  ])("rejects %s", (target, detail) => {
    expect(parseManagedPriceUrl(target, ORIGINS)).toEqual({
      allowed: false,
      detail,
    });
  });

  it("rejects everything when the allowlist is empty", () => {
    expect(
      parseManagedPriceUrl("https://beancount.io/prices/BTC-USD", []),
    ).toEqual({
      allowed: false,
      detail: "managed price includes are disabled on this server",
    });
  });

  it("allows http only when that exact origin is listed", () => {
    expect(
      parseManagedPriceUrl("http://localhost:14000/prices/ETHUSD", [
        "http://localhost:14000",
      ]),
    ).toMatchObject({ allowed: true, alias: "ETHUSD" });
  });
});
