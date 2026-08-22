import { serialize, deserialize } from "../cache-codec";

describe("cache-codec", () => {
  it("round-trips a Date nested in the Keyv envelope as a real Date", () => {
    const date = new Date("2024-06-01T10:00:00.000Z");
    const encoded = serialize({ value: { publishedAt: date }, expires: 123 });

    expect(typeof encoded).toBe("string");

    const decoded = deserialize<{ publishedAt: Date }>(encoded);
    const value = decoded.value!;

    expect(value.publishedAt).toBeInstanceOf(Date);
    expect(value.publishedAt.getTime()).toBe(date.getTime());
    expect(decoded.expires).toBe(123);
  });

  it("preserves Map, Set, and BigInt values", () => {
    const original = {
      map: new Map([["a", 1]]),
      set: new Set([1, 2, 3]),
      big: BigInt(42),
    };

    const value = deserialize<typeof original>(
      serialize({ value: original, expires: undefined }),
    ).value!;

    expect(value.map).toBeInstanceOf(Map);
    expect(value.map.get("a")).toBe(1);
    expect(value.set).toBeInstanceOf(Set);
    expect(value.set.has(2)).toBe(true);
    expect(value.big).toBe(BigInt(42));
  });

  it("round-trips plain JSON values unchanged", () => {
    const original = {
      id: "abc",
      count: 3,
      nested: { ok: true },
      list: [1, 2],
    };

    const value = deserialize<typeof original>(
      serialize({ value: original, expires: undefined }),
    ).value;

    expect(value).toEqual(original);
  });

  it("round-trips a primitive string value (connection-test path)", () => {
    const value = deserialize<string>(
      serialize({ value: "ok", expires: undefined }),
    ).value;

    expect(value).toBe("ok");
  });
});
