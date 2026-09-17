import { parseForwardedContext } from "../forwarded-context";

describe("parseForwardedContext", () => {
  it("parses the envelope backend-v2 sends", () => {
    expect(parseForwardedContext("request-id=abc-123")).toEqual({
      "request-id": "abc-123",
    });
  });

  it("keeps unknown keys so a new field needs no change here", () => {
    expect(parseForwardedContext("request-id=a,platform=web,locale=en-US")).toEqual({
      "request-id": "a",
      platform: "web",
      locale: "en-US",
    });
  });

  it("tolerates surrounding whitespace and an empty value", () => {
    expect(parseForwardedContext("  request-id = a , platform=")).toEqual({
      "request-id": "a",
      platform: "",
    });
  });

  it("keeps a value containing '=' whole", () => {
    expect(parseForwardedContext("opaque=a=b=c")).toEqual({ opaque: "a=b=c" });
  });

  it.each([
    ["absent", undefined],
    ["empty", ""],
    ["no separator", "request-id"],
    ["an empty key", "=value"],
    ["an uppercase key", "Request-Id=a"],
    ["a key with an underscore", "request_id=a"],
    ["a key starting with a digit", "1key=a"],
    ["a value with a comma", "k=a,b=,"],
  ])("yields nothing useful for %s", (_label, raw) => {
    expect(parseForwardedContext(raw)).not.toHaveProperty("request-id");
  });

  it("drops a value carrying control characters rather than logging them", () => {
    expect(parseForwardedContext("request-id=a\nfake-line=1")).toEqual({});
    expect(parseForwardedContext("request-id=a\u0000b")).toEqual({});
  });

  it("lets the first occurrence of a key win", () => {
    expect(parseForwardedContext("request-id=first,request-id=second")).toEqual({
      "request-id": "first",
    });
  });

  it("refuses an over-long header outright, before splitting it", () => {
    const huge = `request-id=a,${"k=v,".repeat(4000)}`;
    expect(huge.length).toBeGreaterThan(8192);
    expect(parseForwardedContext(huge)).toEqual({});
  });

  it("stops after 32 entries instead of parsing the rest", () => {
    const raw = Array.from({ length: 60 }, (_, i) => `k${i}=v`).join(",");
    expect(raw.length).toBeLessThanOrEqual(8192);
    expect(Object.keys(parseForwardedContext(raw))).toHaveLength(32);
  });

  it("drops an over-long key or value but keeps its neighbours", () => {
    const longKey = "k".repeat(65);
    const longValue = "v".repeat(2049);
    expect(
      parseForwardedContext(`${longKey}=v,request-id=a,big=${longValue}`),
    ).toEqual({ "request-id": "a" });
  });

  it("accepts a header of exactly the maximum length and refuses one character more", () => {
    // Padded across several well-formed entries, since no single value may
    // exceed 2048 characters.
    const pad = (total: number) => {
      const parts = ["request-id=a"];
      let length = parts[0].length;
      for (let i = 0; length < total; i += 1) {
        const prefix = `,k${i}=`;
        const room = Math.min(2048, total - length - prefix.length);
        parts.push(`${prefix}${"v".repeat(room)}`);
        length += prefix.length + room;
      }
      return parts.join("");
    };
    const atLimit = pad(8192);
    expect(atLimit).toHaveLength(8192);
    expect(parseForwardedContext(atLimit)).toHaveProperty("request-id");

    const overLimit = pad(8193);
    expect(overLimit).toHaveLength(8193);
    expect(parseForwardedContext(overLimit)).toEqual({});
  });

  it("accepts exactly 32 entries and never sees the 33rd", () => {
    const entries = Array.from({ length: 33 }, (_, i) => `k${i}=v`);
    const atLimit = entries.slice(0, 32).join(",");
    expect(Object.keys(parseForwardedContext(atLimit))).toHaveLength(32);

    const overLimit = entries.join(",");
    const parsed = parseForwardedContext(overLimit);
    expect(Object.keys(parsed)).toHaveLength(32);
    expect(parsed).not.toHaveProperty("k32");
  });

  it("counts entries examined, not entries accepted, so junk cannot buy a scan", () => {
    // 32 entries that all fail validation still exhaust the budget: a header
    // of separators must not cost a full scan while a counter never moves.
    const junk = Array.from({ length: 32 }, () => "=x").join(",");
    const raw = `${junk},request-id=a`;
    expect(parseForwardedContext(raw)).toEqual({});
  });

  it("accepts a key of exactly the maximum length and refuses one character more", () => {
    const atLimit = "k".repeat(64);
    expect(parseForwardedContext(`${atLimit}=v`)).toEqual({ [atLimit]: "v" });

    const overLimit = "k".repeat(65);
    expect(parseForwardedContext(`${overLimit}=v`)).toEqual({});
  });

  it("accepts a value of exactly the maximum length and refuses one character more", () => {
    const atLimit = "v".repeat(2048);
    expect(parseForwardedContext(`opaque=${atLimit}`)).toEqual({
      opaque: atLimit,
    });

    const overLimit = "v".repeat(2049);
    expect(parseForwardedContext(`opaque=${overLimit}`)).toEqual({});
  });

  it("measures a value after trimming, so padding does not push it over", () => {
    const atLimit = "v".repeat(2048);
    expect(parseForwardedContext(`opaque=   ${atLimit}   `)).toEqual({
      opaque: atLimit,
    });
  });

  it.each([
    ["a single-letter key", "a=1", { a: "1" }],
    ["a key ending in a hyphen", "request-=1", { "request-": "1" }],
    ["a key carrying digits", "sha256=abc", { sha256: "abc" }],
    ["the lowest non-space printable value byte", "k=!", { k: "!" }],
    ["the highest printable value byte", "k=~", { k: "~" }],
    ["a value with inner spaces", "k=a b c", { k: "a b c" }],
    ["base64 padding in a value", "k=YWJj==", { k: "YWJj==" }],
  ])("keeps %s", (_label, raw, expected) => {
    expect(parseForwardedContext(raw)).toEqual(expected);
  });

  it.each([
    ["a DEL byte", "k=a\u007Fb"],
    ["a non-ASCII byte", "k=caf\u00E9"],
    ["a tab", "k=a\tb"],
  ])("drops a value carrying %s", (_label, raw) => {
    expect(parseForwardedContext(raw)).toEqual({});
  });

  it("admits a credential-sized value, which is what session-token needs", () => {
    // A session JWT of backend-v2's shape measures 220-248 characters.
    const token = `${"h".repeat(36)}.${"p".repeat(200)}.${"s".repeat(43)}`;
    expect(token.length).toBeGreaterThan(256);
    expect(parseForwardedContext(`session-token=${token}`)).toEqual({
      "session-token": token,
    });
  });
});
