import {
  COOKIE_NAME,
  setAuthCookie,
  clearAuthCookie,
  getAuthCookieFromCtx,
} from "../cookie-utils";

const mockCtx = {
  cookies: {
    set: jest.fn(),
    get: jest.fn(),
  },
  URL: new URL("https://api.v3.beancount.io"),
} as any;

describe("cookie-utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("COOKIE_NAME", () => {
    it('should be "authSess:beancount.io"', () => {
      expect(COOKIE_NAME).toBe("authSess:beancount.io");
    });
  });

  describe("setAuthCookie", () => {
    it("should set cookie with secure=true for https context in production", () => {
      const expireAt = new Date(Date.now() + 60 * 60 * 1000);
      setAuthCookie(mockCtx, "mytoken", expireAt, true);
      expect(mockCtx.cookies.set).toHaveBeenCalledWith(
        COOKIE_NAME,
        "mytoken",
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          domain: ".beancount.io",
        }),
      );
    });

    describe("AUTH_COOKIE_DOMAIN", () => {
      const original = process.env.AUTH_COOKIE_DOMAIN;
      afterEach(() => {
        if (original === undefined) delete process.env.AUTH_COOKIE_DOMAIN;
        else process.env.AUTH_COOKIE_DOMAIN = original;
      });
      const domainSet = () => {
        setAuthCookie(mockCtx, "t", new Date(Date.now() + 1000), true);
        return mockCtx.cookies.set.mock.calls[0][2].domain;
      };

      it("uses the configured parent domain for self-hosted deployments", () => {
        process.env.AUTH_COOKIE_DOMAIN = ".example.com";
        expect(domainSet()).toBe(".example.com");
      });

      it("is host-only when set to an empty value", () => {
        process.env.AUTH_COOKIE_DOMAIN = "";
        expect(domainSet()).toBeUndefined();
      });

      it("defaults to .beancount.io when unset", () => {
        delete process.env.AUTH_COOKIE_DOMAIN;
        expect(domainSet()).toBe(".beancount.io");
      });
    });

    it("should set cookie with secure=false for http context in development", () => {
      const httpCtx = {
        cookies: { set: jest.fn(), get: jest.fn() },
        URL: new URL("http://localhost:4104"),
      } as any;
      const expireAt = new Date(Date.now() + 60 * 60 * 1000);
      setAuthCookie(httpCtx, "mytoken", expireAt, false);
      expect(httpCtx.cookies.set).toHaveBeenCalledWith(
        COOKIE_NAME,
        "mytoken",
        expect.objectContaining({
          secure: false,
          domain: undefined,
        }),
      );
    });

    it("should derive maxAge from the token's own expireAt", () => {
      const expireAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      setAuthCookie(mockCtx, "mytoken", expireAt, true);
      const options = mockCtx.cookies.set.mock.calls[0][2];
      expect(options.maxAge).toBeGreaterThan(4 * 60 * 1000);
      expect(options.maxAge).toBeLessThanOrEqual(5 * 60 * 1000);
    });
  });

  describe("clearAuthCookie", () => {
    it("should call ctx.cookies.set with empty string and maxAge 0", () => {
      clearAuthCookie(mockCtx);
      expect(mockCtx.cookies.set).toHaveBeenCalledWith(COOKIE_NAME, "", {
        maxAge: 0,
      });
    });
  });

  describe("getAuthCookieFromCtx", () => {
    it("should return value from ctx.cookies.get", () => {
      mockCtx.cookies.get.mockReturnValue("returnedtoken");
      const result = getAuthCookieFromCtx(mockCtx);
      expect(mockCtx.cookies.get).toHaveBeenCalledWith(COOKIE_NAME);
      expect(result).toBe("returnedtoken");
    });

    it("should return undefined when cookie is not set", () => {
      mockCtx.cookies.get.mockReturnValue(undefined);
      const result = getAuthCookieFromCtx(mockCtx);
      expect(result).toBeUndefined();
    });
  });
});
