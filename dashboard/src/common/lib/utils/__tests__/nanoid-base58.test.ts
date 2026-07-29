import { describe, it, expect } from "vitest";
import { nanoidBase58, generateDefaultUsername } from "../nanoid-base58";

describe("nanoidBase58", () => {
  it("generates a string of the default length (12)", () => {
    const id = nanoidBase58();
    expect(id).toHaveLength(12);
  });

  it("generates a string of custom length", () => {
    const id = nanoidBase58(8);
    expect(id).toHaveLength(8);

    const longId = nanoidBase58(24);
    expect(longId).toHaveLength(24);
  });

  it("generates strings containing only Base58 characters", () => {
    // Base58 alphabet (excludes 0, O, I, l)
    const base58Regex =
      /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

    for (let i = 0; i < 10; i++) {
      const id = nanoidBase58();
      expect(id).toMatch(base58Regex);
    }
  });

  it("generates unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(nanoidBase58());
    }
    // All IDs should be unique
    expect(ids.size).toBe(100);
  });
});

describe("generateDefaultUsername", () => {
  it("generates a username in un_{nanoid} format", () => {
    const username = generateDefaultUsername();
    expect(username).toMatch(/^un_[a-z0-9]+$/);
  });

  it("generates lowercase username", () => {
    // Generate multiple to ensure lowercase conversion
    for (let i = 0; i < 10; i++) {
      const username = generateDefaultUsername();
      expect(username).toBe(username.toLowerCase());
    }
  });

  it("generates usernames starting with un_", () => {
    const username = generateDefaultUsername();
    expect(username.startsWith("un_")).toBe(true);
  });

  it("generates usernames with total length of 15 (3 for 'un_' + 12 for nanoid)", () => {
    const username = generateDefaultUsername();
    expect(username).toHaveLength(15);
  });

  it("generates unique usernames", () => {
    const usernames = new Set<string>();
    for (let i = 0; i < 100; i++) {
      usernames.add(generateDefaultUsername());
    }
    // All usernames should be unique
    expect(usernames.size).toBe(100);
  });
});
