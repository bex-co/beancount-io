import { getTokenFromCtx, getBasicAuthHeader } from "./auth";
import type { RouterContext } from "@koa/router";

describe("auth utilities", () => {
  describe("getTokenFromCtx", () => {
    it("should extract token from Bearer authorization header", () => {
      const ctx = {
        headers: {
          authorization: "Bearer abc123token",
        },
        cookies: {
          get: jest.fn(),
        },
      } as unknown as RouterContext;

      const result = getTokenFromCtx(ctx);

      expect(result).toBe("abc123token");
    });

    it("should handle token with spaces", () => {
      const ctx = {
        headers: {
          authorization: "Bearer   token-with-spaces  ",
        },
        cookies: {
          get: jest.fn(),
        },
      } as unknown as RouterContext;

      const result = getTokenFromCtx(ctx);

      expect(result).toBe("token-with-spaces  ");
    });

    it("should return undefined when no authorization header", () => {
      const ctx = {
        headers: {},
        cookies: {
          get: jest.fn().mockReturnValue(undefined),
        },
      } as unknown as RouterContext;

      const result = getTokenFromCtx(ctx);

      expect(result).toBeUndefined();
    });

    it("should handle non-Bearer authorization header", () => {
      const ctx = {
        headers: {
          authorization: "Basic dXNlcjpwYXNz",
        },
        cookies: {
          get: jest.fn(),
        },
      } as unknown as RouterContext;

      const result = getTokenFromCtx(ctx);

      // The regex only removes "Bearer " (case-sensitive), so Basic stays
      expect(result).toBe("Basic dXNlcjpwYXNz");
    });

    it("should strip a lowercase bearer prefix", () => {
      const ctx = {
        headers: {
          authorization: "bearer token123",
        },
        cookies: {
          get: jest.fn(),
        },
      } as unknown as RouterContext;

      const result = getTokenFromCtx(ctx);

      // Case-insensitive since w1/m18: RFC 7235 defines auth-scheme as
      // case-insensitive, and MCP — which now authenticates through this
      // helper — previously parsed its own header with `/^Bearer\s+(.+)$/i`.
      // Matching case-sensitively here would have started refusing third-party
      // agents that send `bearer` and had always worked.
      expect(result).toBe("token123");
    });

    it("should handle authorization header without Bearer prefix", () => {
      const ctx = {
        headers: {
          authorization: "justtoken",
        },
        cookies: {
          get: jest.fn(),
        },
      } as unknown as RouterContext;

      const result = getTokenFromCtx(ctx);

      expect(result).toBe("justtoken");
    });
  });

  describe("getBasicAuthHeader", () => {
    it("should create basic auth header from username and password", () => {
      const result = getBasicAuthHeader("user", "pass");

      expect(result).toHaveProperty("Authorization");
      expect(result.Authorization).toMatch(/^Basic /);
    });

    it("should base64 encode credentials", () => {
      const result = getBasicAuthHeader("admin", "secret");

      // "admin:secret" in base64 is "YWRtaW46c2VjcmV0"
      expect(result.Authorization).toBe("Basic YWRtaW46c2VjcmV0");
    });

    it("should handle empty username and password", () => {
      const result = getBasicAuthHeader("", "");

      // ":" in base64 is "Og=="
      expect(result.Authorization).toBe("Basic Og==");
    });

    it("should handle special characters in credentials", () => {
      const result = getBasicAuthHeader("user@domain.com", "p@ssw0rd!");

      const decoded = Buffer.from(
        result.Authorization.replace("Basic ", ""),
        "base64",
      ).toString();
      expect(decoded).toBe("user@domain.com:p@ssw0rd!");
    });

    it("should handle unicode characters", () => {
      const result = getBasicAuthHeader("用户", "密码");

      const decoded = Buffer.from(
        result.Authorization.replace("Basic ", ""),
        "base64",
      ).toString();
      expect(decoded).toBe("用户:密码");
    });

    it("should handle credentials with colons", () => {
      const result = getBasicAuthHeader("user:name", "pass:word");

      const decoded = Buffer.from(
        result.Authorization.replace("Basic ", ""),
        "base64",
      ).toString();
      expect(decoded).toBe("user:name:pass:word");
    });
  });
});
