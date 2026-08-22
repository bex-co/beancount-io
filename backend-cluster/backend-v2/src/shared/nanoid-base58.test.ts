import { nanoidBase58, prefixedNanoidBase58 } from "./nanoid-base58";

describe("nanoidBase58", () => {
  // Base58 alphabet (Bitcoin/IPFS style - excludes 0, O, I, l)
  const BASE58_ALPHABET =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  it("should generate a string of default length 12", () => {
    const id = nanoidBase58();

    expect(typeof id).toBe("string");
    expect(id.length).toBe(12);
  });

  it("should generate a string of custom length", () => {
    const id = nanoidBase58(8);
    expect(id.length).toBe(8);

    const longId = nanoidBase58(24);
    expect(longId.length).toBe(24);

    const shortId = nanoidBase58(4);
    expect(shortId.length).toBe(4);
  });

  it("should only use Base58 characters", () => {
    // Generate multiple IDs to increase test coverage
    for (let i = 0; i < 10; i += 1) {
      const id = nanoidBase58();

      for (const char of id) {
        expect(BASE58_ALPHABET).toContain(char);
      }
    }
  });

  it("should not contain confusing characters (0, O, I, l)", () => {
    // Generate multiple IDs to ensure confusing characters are never included
    for (let i = 0; i < 50; i += 1) {
      const id = nanoidBase58();

      expect(id).not.toMatch(/[0OIl]/);
    }
  });

  it("should generate unique IDs", () => {
    const ids = new Set<string>();
    const numIds = 100;

    for (let i = 0; i < numIds; i += 1) {
      ids.add(nanoidBase58());
    }

    // All IDs should be unique
    expect(ids.size).toBe(numIds);
  });

  it("should work with length 1", () => {
    const id = nanoidBase58(1);

    expect(id.length).toBe(1);
    expect(BASE58_ALPHABET).toContain(id);
  });

  it("should work with very long length", () => {
    const id = nanoidBase58(100);

    expect(id.length).toBe(100);
    for (const char of id) {
      expect(BASE58_ALPHABET).toContain(char);
    }
  });

  it("should be suitable for username generation", () => {
    const username = `un_${nanoidBase58()}`;

    expect(username).toMatch(
      /^un_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{12}$/,
    );
  });
});

describe("prefixedNanoidBase58", () => {
  const BASE58_REGEX =
    /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

  it("should return string starting with given prefix", () => {
    const id = prefixedNanoidBase58("ftusg_");
    expect(id.startsWith("ftusg_")).toBe(true);
  });

  it("should have valid base58 suffix of default length 20", () => {
    const id = prefixedNanoidBase58("ftusg_");
    const suffix = id.slice("ftusg_".length);
    expect(suffix).toHaveLength(20);
    expect(suffix).toMatch(BASE58_REGEX);
  });

  it("should support custom length", () => {
    const id = prefixedNanoidBase58("test_", 10);
    const suffix = id.slice("test_".length);
    expect(suffix).toHaveLength(10);
    expect(suffix).toMatch(BASE58_REGEX);
  });

  it("should produce correct format for different prefixes", () => {
    const id1 = prefixedNanoidBase58("usr_");
    expect(id1).toMatch(
      /^usr_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{20}$/,
    );

    const id2 = prefixedNanoidBase58("ftusg_");
    expect(id2).toMatch(
      /^ftusg_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{20}$/,
    );
  });
});
