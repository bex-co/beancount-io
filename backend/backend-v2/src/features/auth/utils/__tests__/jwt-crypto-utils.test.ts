import { signJwt, verifyJwt } from "../jwt-crypto-utils";
import type { JwtPayload } from "../jwt-crypto-utils";

describe("JWT Crypto Utils", () => {
  const testSecret = "test-secret-key-12345";
  const alternativeSecret = "different-secret-key";

  const createTestPayload = (): JwtPayload => ({
    jti: "test-jwt-id-123",
    sub: "user-id-456",
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
  });

  describe("signJwt", () => {
    it("should sign a JWT token with valid payload", async () => {
      const payload = createTestPayload();
      const token = await signJwt(payload, testSecret);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts: header.payload.signature
    });

    it("should create different tokens for different payloads", async () => {
      const payload1 = createTestPayload();
      const payload2 = { ...createTestPayload(), sub: "different-user-id" };

      const token1 = await signJwt(payload1, testSecret);
      const token2 = await signJwt(payload2, testSecret);

      expect(token1).not.toBe(token2);
    });

    it("should create different tokens for different secrets", async () => {
      const payload = createTestPayload();

      const token1 = await signJwt(payload, testSecret);
      const token2 = await signJwt(payload, alternativeSecret);

      expect(token1).not.toBe(token2);
    });

    it("should include all payload fields in the token", async () => {
      const payload = createTestPayload();
      const token = await signJwt(payload, testSecret);

      // Decode without verifying to check payload
      const base64Payload = token.split(".")[1];
      const decodedPayload = JSON.parse(
        Buffer.from(base64Payload, "base64").toString(),
      );

      expect(decodedPayload.jti).toBe(payload.jti);
      expect(decodedPayload.sub).toBe(payload.sub);
      expect(decodedPayload.exp).toBe(payload.exp);
      expect(decodedPayload.iat).toBe(payload.iat);
    });
  });

  describe("verifyJwt", () => {
    it("should verify and decode a valid token", async () => {
      const payload = createTestPayload();
      const token = await signJwt(payload, testSecret);

      const decoded = await verifyJwt(token, testSecret);

      expect(decoded).not.toBeNull();
      expect(decoded?.jti).toBe(payload.jti);
      expect(decoded?.sub).toBe(payload.sub);
      expect(decoded?.exp).toBe(payload.exp);
      expect(decoded?.iat).toBe(payload.iat);
    });

    it("should return null for invalid token signature", async () => {
      const payload = createTestPayload();
      const token = await signJwt(payload, testSecret);

      // Try to verify with wrong secret
      const decoded = await verifyJwt(token, alternativeSecret);

      expect(decoded).toBeNull();
    });

    it("should return null for malformed token", async () => {
      const malformedToken = "not.a.valid.jwt.token";

      const decoded = await verifyJwt(malformedToken, testSecret);

      expect(decoded).toBeNull();
    });

    it("should return null for expired token", async () => {
      const expiredPayload: JwtPayload = {
        jti: "expired-jwt-id",
        sub: "user-id",
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      };

      const token = await signJwt(expiredPayload, testSecret);

      const decoded = await verifyJwt(token, testSecret);

      expect(decoded).toBeNull();
    });

    it("should return null for empty token", async () => {
      const decoded = await verifyJwt("", testSecret);

      expect(decoded).toBeNull();
    });

    it("should return null for token with tampered payload", async () => {
      const payload = createTestPayload();
      const token = await signJwt(payload, testSecret);

      // Tamper with the token by changing the payload
      const [header, , signature] = token.split(".");
      const tamperedPayload = Buffer.from(
        JSON.stringify({ ...payload, sub: "hacker-id" }),
      ).toString("base64");
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

      const decoded = await verifyJwt(tamperedToken, testSecret);

      expect(decoded).toBeNull();
    });
  });

  describe("signJwt and verifyJwt integration", () => {
    it("should successfully sign and verify a token", async () => {
      const payload = createTestPayload();

      // Sign
      const token = await signJwt(payload, testSecret);

      // Verify
      const decoded = await verifyJwt(token, testSecret);

      // Should match original payload
      expect(decoded).toEqual(payload);
    });

    it("should handle multiple tokens independently", async () => {
      const payload1 = createTestPayload();
      const payload2 = { ...createTestPayload(), sub: "another-user" };

      const token1 = await signJwt(payload1, testSecret);
      const token2 = await signJwt(payload2, testSecret);

      const decoded1 = await verifyJwt(token1, testSecret);
      const decoded2 = await verifyJwt(token2, testSecret);

      expect(decoded1?.sub).toBe(payload1.sub);
      expect(decoded2?.sub).toBe(payload2.sub);
      expect(decoded1?.sub).not.toBe(decoded2?.sub);
    });
  });
});
