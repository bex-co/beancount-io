import {
  deviceCodeDigest,
  deviceCodeDigestsMatch,
  generateDeviceCode,
  generateUserCode,
  normalizeUserCode,
} from "../cli-auth-codes";

describe("cli-auth-codes", () => {
  describe("generateDeviceCode", () => {
    it("returns a URL-safe 256-bit value", () => {
      const code = generateDeviceCode();

      expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(Buffer.from(code, "base64url")).toHaveLength(32);
    });

    it("does not repeat", () => {
      const codes = new Set(
        Array.from({ length: 200 }, () => generateDeviceCode()),
      );

      expect(codes.size).toBe(200);
    });
  });

  describe("deviceCodeDigest", () => {
    it("is a stable sha256 that does not contain the code", () => {
      const code = generateDeviceCode();
      const digest = deviceCodeDigest(code);

      expect(digest).toMatch(/^[0-9a-f]{64}$/);
      expect(digest).toBe(deviceCodeDigest(code));
      expect(digest).not.toContain(code);
    });

    it("separates two codes", () => {
      expect(deviceCodeDigest("left")).not.toBe(deviceCodeDigest("right"));
    });
  });

  describe("deviceCodeDigestsMatch", () => {
    it("accepts a digest of the same code and rejects any other", () => {
      const digest = deviceCodeDigest("device-code");

      expect(
        deviceCodeDigestsMatch(digest, deviceCodeDigest("device-code")),
      ).toBe(true);
      expect(deviceCodeDigestsMatch(digest, deviceCodeDigest("other"))).toBe(
        false,
      );
      expect(deviceCodeDigestsMatch(digest, digest.slice(0, 32))).toBe(false);
    });
  });

  describe("generateUserCode", () => {
    it("is short, grouped, and typed off a terminal without ambiguity", () => {
      for (let i = 0; i < 200; i += 1) {
        const code = generateUserCode();

        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
        // No 0/O/1/I/L, and no vowels: the glyphs people mistype, and the
        // letters that would let a random draw spell something at the user.
        expect(code).not.toMatch(/[0O1ILAEIOU]/);
      }
    });

    it("does not repeat across a realistic burst of logins", () => {
      const codes = new Set(
        Array.from({ length: 500 }, () => generateUserCode()),
      );

      expect(codes.size).toBe(500);
    });
  });

  describe("normalizeUserCode", () => {
    it("accepts the ways a person actually types the code", () => {
      for (const input of [
        "BCDF-GHJK",
        "bcdf-ghjk",
        "BCDFGHJK",
        " bcdf ghjk ",
        "bcdf_ghjk",
      ]) {
        expect(normalizeUserCode(input)).toBe("BCDF-GHJK");
      }
    });

    it("rejects anything that could not be a code we issued", () => {
      for (const input of [
        "",
        "BCDF",
        "BCDF-GHJKL",
        "BCDF-GHJ0", // a digit this alphabet never generates
        "AEIO-UBCD", // vowels
        "../../etc",
      ]) {
        expect(normalizeUserCode(input)).toBeNull();
      }
    });

    it("round-trips every generated code", () => {
      for (let i = 0; i < 100; i += 1) {
        const code = generateUserCode();
        expect(normalizeUserCode(code)).toBe(code);
      }
    });
  });
});
