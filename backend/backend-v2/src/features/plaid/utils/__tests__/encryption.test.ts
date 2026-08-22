jest.mock("@/config/config", () => ({
  config: {
    jwt: {
      secret: "test-secret-key-for-unit-tests-only",
      expMins: 525600,
    },
  },
}));

import { encryptToken, decryptToken } from "../encryption";

describe("encryption", () => {
  describe("encryptToken", () => {
    it("should return an encrypted string with 4 colon-separated parts", () => {
      const plaintext = "access-sandbox-abc123";

      const encrypted = encryptToken(plaintext);
      const parts = encrypted.split(":");

      expect(parts).toHaveLength(4);
    });

    it("should produce different ciphertexts for the same plaintext (random IV/salt)", () => {
      const plaintext = "access-sandbox-abc123";

      const encrypted1 = encryptToken(plaintext);
      const encrypted2 = encryptToken(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should return a non-empty string", () => {
      const encrypted = encryptToken("some-token");

      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe("string");
    });
  });

  describe("decryptToken", () => {
    it("should decrypt a token encrypted with encryptToken", () => {
      const plaintext = "access-sandbox-abc123def456";

      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should correctly round-trip various token formats", () => {
      const tokens = [
        "access-sandbox-abc123",
        "access-production-xyz789",
        "short",
        "a".repeat(100),
        "token with spaces and special chars: !@#$%",
      ];

      for (const token of tokens) {
        const encrypted = encryptToken(token);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(token);
      }
    });

    it("should throw an error for token with wrong number of parts", () => {
      expect(() => decryptToken("only:three:parts")).toThrow(
        "Invalid encrypted token format",
      );
    });

    it("should throw an error for empty string", () => {
      expect(() => decryptToken("")).toThrow("Invalid encrypted token format");
    });

    it("should throw an error for tampered ciphertext", () => {
      const encrypted = encryptToken("original-token");
      const parts = encrypted.split(":");
      // Tamper with the ciphertext (last part)
      parts[3] = Buffer.from("tampered").toString("base64");
      const tampered = parts.join(":");

      expect(() => decryptToken(tampered)).toThrow();
    });

    it("should throw an error for tampered auth tag", () => {
      const encrypted = encryptToken("original-token");
      const parts = encrypted.split(":");
      // Tamper with the auth tag (3rd part)
      parts[2] = Buffer.from("badtag0000000000").toString("base64");
      const tampered = parts.join(":");

      expect(() => decryptToken(tampered)).toThrow();
    });
  });
});
