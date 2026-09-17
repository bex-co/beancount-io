import {
  managedPriceCookieFor,
  parseManagedPriceUrl,
} from "../managed-price-policy";

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

describe("managedPriceCookieFor", () => {
  const TOKEN = "header.payload.signature";
  const GATE = { host: "beancount.io", cookieName: "authSess:beancount.io" };

  it("presents the caller's token as the session cookie", () => {
    expect(
      managedPriceCookieFor("https://beancount.io/prices/BTC-USD", TOKEN, GATE),
    ).toBe(`authSess:beancount.io=${TOKEN}`);
  });

  it("covers both schemes, because the gate redirects https to http", () => {
    expect(
      managedPriceCookieFor("http://beancount.io/prices/BTC-USD", TOKEN, GATE),
    ).toBe(`authSess:beancount.io=${TOKEN}`);
  });

  it("passes any credential kind through unchanged", () => {
    // beancount.io resolves OAuth tokens, bcio_ keys, and session JWTs from
    // this one cookie alike, so narrowing by shape would break working cases.
    for (const token of ["bcio_AAAABBBBCCCC", "oauth-access-token", TOKEN]) {
      expect(
        managedPriceCookieFor("https://beancount.io/prices/BTC-USD", token, GATE),
      ).toBe(`authSess:beancount.io=${token}`);
    }
  });

  it.each([
    ["another host", "https://evil.example/prices/BTC-USD"],
    ["a lookalike host", "https://beancount.io.evil.example/prices/BTC-USD"],
    ["a non-price path", "https://beancount.io/auth/login"],
    ["the bare prices path", "https://beancount.io/prices"],
    ["a target that is not a URL", "prices/BTC-USD"],
  ])("sends nothing to %s", (_label, url) => {
    expect(managedPriceCookieFor(url, TOKEN, GATE)).toBeNull();
  });

  it("sends nothing when the request carried no credential", () => {
    expect(
      managedPriceCookieFor("https://beancount.io/prices/BTC-USD", undefined, GATE),
    ).toBeNull();
  });

  it.each([
    ["a non-http(s) scheme", "ftp://beancount.io/prices/BTC-USD"],
    ["userinfo spoofing the host", "https://beancount.io@evil.example/prices/BTC-USD"],
    ["embedded credentials", "https://u:p@beancount.io/prices/BTC-USD"],
    ["a query string", "https://beancount.io/prices/BTC-USD?raw=1"],
    ["a fragment", "https://beancount.io/prices/BTC-USD#latest"],
  ])("refuses to release the credential for %s", (_label, url) => {
    // parseManagedPriceUrl rejects these before any fetch, so none is
    // reachable today. Re-checked here anyway: releasing a credential must
    // not depend on a caller two layers up having validated first.
    expect(managedPriceCookieFor(url, TOKEN, GATE)).toBeNull();
  });

  it("sends nothing when no gated host is configured", () => {
    expect(
      managedPriceCookieFor("https://beancount.io/prices/BTC-USD", TOKEN, {
        ...GATE,
        host: "",
      }),
    ).toBeNull();
  });

  it("follows the configured host, so a staging deployment still relays", () => {
    const gate = { host: "staging.beancount.io", cookieName: "authSess:stg" };
    expect(
      managedPriceCookieFor("https://staging.beancount.io/prices/BTC-USD", TOKEN, gate),
    ).toBe(`authSess:stg=${TOKEN}`);
    expect(
      managedPriceCookieFor("https://beancount.io/prices/BTC-USD", TOKEN, gate),
    ).toBeNull();
  });

  it("matches the host regardless of the case the include was written in", () => {
    // `URL` lowercases the hostname, so an include shouting the host still
    // reaches the same gate.
    expect(
      managedPriceCookieFor("https://BEANCOUNT.IO/prices/BTC-USD", TOKEN, GATE),
    ).toBe(`authSess:beancount.io=${TOKEN}`);
  });

  it("sends nothing when the configured host is not already lowercase", () => {
    // The comparison is exact against `URL.hostname`, which is always
    // lowercase; a mixed-case env value therefore never matches.
    expect(
      managedPriceCookieFor("https://beancount.io/prices/BTC-USD", TOKEN, {
        ...GATE,
        host: "BeanCount.io",
      }),
    ).toBeNull();
  });

  it("matches on hostname alone, so a non-default port still relays", () => {
    // Deliberately looser than the origin allowlist: the gate answers on a
    // development port, and it is still the same host.
    expect(
      managedPriceCookieFor("http://beancount.io:8080/prices/BTC-USD", TOKEN, GATE),
    ).toBe(`authSess:beancount.io=${TOKEN}`);
    expect(
      managedPriceCookieFor("https://beancount.io:443/prices/BTC-USD", TOKEN, GATE),
    ).toBe(`authSess:beancount.io=${TOKEN}`);
  });

  it.each([
    ["a parent domain", "https://io/prices/BTC-USD"],
    ["a sibling subdomain", "https://www.beancount.io/prices/BTC-USD"],
    ["a host that merely ends with the gate", "https://notbeancount.io/prices/BTC-USD"],
    ["a userinfo-spoofed host", "https://beancount.io@evil.example/prices/BTC-USD"],
  ])("sends nothing to %s", (_label, url) => {
    expect(managedPriceCookieFor(url, TOKEN, GATE)).toBeNull();
  });

  it("sends nothing when the relayed credential is the empty string", () => {
    expect(
      managedPriceCookieFor("https://beancount.io/prices/BTC-USD", "", GATE),
    ).toBeNull();
  });

  it("accepts the alias shapes the grammar allows", () => {
    for (const alias of ["spy.us", "BTC_USD", "a", "A".repeat(64)]) {
      expect(
        managedPriceCookieFor(`https://beancount.io/prices/${alias}`, TOKEN, GATE),
      ).toBe(`authSess:beancount.io=${TOKEN}`);
    }
  });

  it("applies the same alias grammar parseManagedPriceUrl enforces", () => {
    // Shares PRICES_PATH_RE, so the cookie decision cannot drift looser than
    // the "is this a managed price URL" decision.
    for (const path of [
      `/prices/${"A".repeat(65)}`,
      "/prices/BTC USD",
      "/prices/BTC-USD/",
      "/prices/../catalog",
    ]) {
      expect(
        managedPriceCookieFor(`https://beancount.io${path}`, TOKEN, GATE),
      ).toBeNull();
    }
  });
});
