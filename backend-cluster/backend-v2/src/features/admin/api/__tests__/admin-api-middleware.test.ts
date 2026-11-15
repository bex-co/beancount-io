import Router from "@koa/router";
import * as secureStringEqual from "@/features/auth/utils/secure-string-equal";
import { UnauthenticatedError } from "@/shared/errors";
import { apiTokenRequired } from "../admin-api-middleware";
import { errorResponseSchema } from "../admin-error-schema";

interface MockConfig {
  adminToken: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __mockAdminMiddlewareConfig__: MockConfig | undefined;
}

jest.mock("@/config/config", () => {
  if (!global.__mockAdminMiddlewareConfig__) {
    global.__mockAdminMiddlewareConfig__ = { adminToken: "" };
  }
  return {
    get config() {
      return global.__mockAdminMiddlewareConfig__;
    },
  };
});

describe("apiTokenRequired", () => {
  let mockCtx: Router.RouterContext;

  beforeEach(() => {
    jest.clearAllMocks();
    if (global.__mockAdminMiddlewareConfig__) {
      global.__mockAdminMiddlewareConfig__.adminToken = "";
    }
    mockCtx = {
      headers: {},
      request: { body: {} },
      response: { body: null },
      status: 200,
      body: null,
    } as unknown as Router.RouterContext;
  });

  afterAll(() => {
    if (global.__mockAdminMiddlewareConfig__) {
      global.__mockAdminMiddlewareConfig__.adminToken = "";
    }
  });

  it("should reject requests when API token is not configured", async () => {
    mockCtx.headers["x-admin-token"] = "";

    // Throws a transport-agnostic DomainError; the shared restErrorMiddleware
    // translates it into the 401 REST response.
    await expect(apiTokenRequired(mockCtx, async () => {})).rejects.toThrow(
      UnauthenticatedError,
    );
  });

  it("should reject requests without valid API token", async () => {
    if (global.__mockAdminMiddlewareConfig__) {
      global.__mockAdminMiddlewareConfig__.adminToken = "correct-token";
    }
    mockCtx.headers["x-admin-token"] = "invalid-token";

    await expect(apiTokenRequired(mockCtx, async () => {})).rejects.toThrow(
      UnauthenticatedError,
    );
  });

  it("should allow requests with valid API token", async () => {
    if (global.__mockAdminMiddlewareConfig__) {
      global.__mockAdminMiddlewareConfig__.adminToken = "correct-token";
    }
    mockCtx.headers["x-admin-token"] = "correct-token";
    const next = jest.fn();

    await apiTokenRequired(mockCtx, next);

    expect(next).toHaveBeenCalled();
  });

  describe("token comparison", () => {
    beforeEach(() => {
      if (global.__mockAdminMiddlewareConfig__) {
        global.__mockAdminMiddlewareConfig__.adminToken = "correct-token";
      }
    });

    it.each([
      ["a missing header", undefined],
      ["an empty header", ""],
      [
        "a longer token that starts with the real one",
        "correct-token-and-more",
      ],
      ["a shorter prefix of the real one", "correct-tok"],
      ["a repeated header", ["correct-token", "correct-token"]],
    ])("rejects %s", async (_label, header) => {
      if (header !== undefined) mockCtx.headers["x-admin-token"] = header;
      const next = jest.fn();

      await expect(apiTokenRequired(mockCtx, next)).rejects.toThrow(
        UnauthenticatedError,
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("compares in constant time, through the shared helper", async () => {
      // `!==` returns at the first differing byte; the helper hashes both sides
      // first. Pin the route, so a later edit cannot quietly go back.
      const compare = jest.spyOn(secureStringEqual, "secureStringEqual");
      mockCtx.headers["x-admin-token"] = "correct-token";

      await apiTokenRequired(mockCtx, jest.fn());

      expect(compare).toHaveBeenCalledWith("correct-token", "correct-token");
      compare.mockRestore();
    });
  });
});

describe("errorResponseSchema", () => {
  it("should accept valid error response", () => {
    const result = errorResponseSchema.safeParse({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "invalid api token" },
    });
    expect(result.success).toBe(true);
  });

  it("should require ok to be false", () => {
    const result = errorResponseSchema.safeParse({
      ok: true,
      error: { code: "UNAUTHORIZED", message: "invalid api token" },
    });
    expect(result.success).toBe(false);
  });

  it("should require error object", () => {
    const result = errorResponseSchema.safeParse({ ok: false });
    expect(result.success).toBe(false);
  });

  it("should require error.code", () => {
    const result = errorResponseSchema.safeParse({
      ok: false,
      error: { message: "invalid api token" },
    });
    expect(result.success).toBe(false);
  });

  it("should require error.message", () => {
    const result = errorResponseSchema.safeParse({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(result.success).toBe(false);
  });
});
