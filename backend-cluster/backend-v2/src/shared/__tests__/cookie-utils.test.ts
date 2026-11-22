import http from "node:http";
import type { AddressInfo } from "node:net";
import Koa from "koa";
import {
  COOKIE_NAME,
  setAuthCookie,
  clearAuthCookie,
  getAuthCookieFromCtx,
  cookieDomainNeedsConfig,
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

      it("keeps .beancount.io when set to a blank value", () => {
        process.env.AUTH_COOKIE_DOMAIN = "  ";
        expect(domainSet()).toBe(".beancount.io");
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
    const original = process.env.AUTH_COOKIE_DOMAIN;
    afterEach(() => {
      if (original === undefined) delete process.env.AUTH_COOKIE_DOMAIN;
      else process.env.AUTH_COOKIE_DOMAIN = original;
    });

    it("expires the cookie on the domain and path the setter used in production", () => {
      delete process.env.AUTH_COOKIE_DOMAIN;
      setAuthCookie(mockCtx, "t", new Date(Date.now() + 1000), true);
      const { domain, path } = mockCtx.cookies.set.mock.calls[0][2];
      mockCtx.cookies.set.mockClear();

      clearAuthCookie(mockCtx, true);

      expect(domain).toBe(".beancount.io");
      expect(mockCtx.cookies.set).toHaveBeenCalledWith(COOKIE_NAME, "", {
        maxAge: 0,
        path,
        domain,
      });
    });

    it("also expires a host-only copy in production", () => {
      clearAuthCookie(mockCtx, true);
      expect(mockCtx.cookies.set).toHaveBeenCalledTimes(2);
      expect(mockCtx.cookies.set).toHaveBeenCalledWith(COOKIE_NAME, "", {
        maxAge: 0,
        path: "/",
      });
    });

    it("expires the cookie on the configured AUTH_COOKIE_DOMAIN", () => {
      process.env.AUTH_COOKIE_DOMAIN = ".example.com";
      clearAuthCookie(mockCtx, true);
      expect(mockCtx.cookies.set).toHaveBeenCalledWith(COOKIE_NAME, "", {
        maxAge: 0,
        path: "/",
        domain: ".example.com",
      });
    });

    it("sends only the host-only expiry outside production, matching the host-only setter", () => {
      clearAuthCookie(mockCtx, false);
      expect(mockCtx.cookies.set).toHaveBeenCalledTimes(1);
      expect(mockCtx.cookies.set).toHaveBeenCalledWith(COOKIE_NAME, "", {
        maxAge: 0,
        path: "/",
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

// The real Koa cookie jar renders the headers a browser receives. A browser
// replaces a cookie only when name, domain and path all match, so sign-out must
// emit an already-expired cookie under the same three as sign-in.
describe("auth cookie Set-Cookie headers through Koa", () => {
  type ParsedCookie = {
    name: string;
    value: string;
    attrs: Record<string, string>;
  };
  const parse = (header: string): ParsedCookie => {
    const [pair, ...attrs] = header.split(";").map((part) => part.trim());
    const eq = pair.indexOf("=");
    return {
      name: pair.slice(0, eq),
      value: pair.slice(eq + 1),
      attrs: Object.fromEntries(
        attrs.map((attr) => {
          const i = attr.indexOf("=");
          return i === -1
            ? [attr.toLowerCase(), ""]
            : [attr.slice(0, i).toLowerCase(), attr.slice(i + 1)];
        }),
      ),
    };
  };
  const isExpiry = (cookie: ParsedCookie) =>
    cookie.value === "" &&
    new Date(cookie.attrs.expires).getTime() <= Date.now();

  let server: http.Server;
  let base: string;
  let isProduction: boolean;
  const original = process.env.AUTH_COOKIE_DOMAIN;

  beforeAll(async () => {
    const app = new Koa();
    app.use(async (ctx) => {
      if (ctx.path === "/login") {
        setAuthCookie(
          ctx,
          "session-token",
          new Date(Date.now() + 60 * 60 * 1000),
          isProduction,
        );
      } else {
        clearAuthCookie(ctx, isProduction);
      }
      ctx.body = "ok";
    });
    server = http.createServer(app.callback());
    await new Promise<void>((resolve) => server.listen(0, resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_COOKIE_DOMAIN;
    else process.env.AUTH_COOKIE_DOMAIN = original;
  });

  const setCookies = async (path: string) =>
    (await fetch(`${base}${path}`)).headers.getSetCookie().map(parse);

  it("logout expires the cookie on .beancount.io at path=/ in production", async () => {
    delete process.env.AUTH_COOKIE_DOMAIN;
    isProduction = true;
    const [login] = await setCookies("/login");
    const logout = await setCookies("/logout");

    expect(login.attrs.domain).toBe(".beancount.io");
    expect(login.attrs.path).toBe("/");
    expect(
      logout.find(
        (cookie) =>
          cookie.name === COOKIE_NAME &&
          cookie.attrs.domain === ".beancount.io" &&
          cookie.attrs.path === "/" &&
          isExpiry(cookie),
      ),
    ).toBeDefined();
  });

  it("logout also expires a host-only copy in production", async () => {
    isProduction = true;
    const logout = await setCookies("/logout");
    expect(logout).toHaveLength(2);
    expect(
      logout.find(
        (cookie) =>
          cookie.name === COOKIE_NAME &&
          cookie.attrs.domain === undefined &&
          cookie.attrs.path === "/" &&
          isExpiry(cookie),
      ),
    ).toBeDefined();
  });

  it("logout expires the cookie under the name, domain and path login set, in both modes", async () => {
    for (const mode of [true, false]) {
      isProduction = mode;
      const [login] = await setCookies("/login");
      const logout = await setCookies("/logout");
      expect(
        logout.find(
          (cookie) =>
            cookie.name === login.name &&
            cookie.attrs.domain === login.attrs.domain &&
            cookie.attrs.path === login.attrs.path &&
            isExpiry(cookie),
        ),
      ).toBeDefined();
    }
  });
});

describe("cookieDomainNeedsConfig", () => {
  const original = process.env.AUTH_COOKIE_DOMAIN;
  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_COOKIE_DOMAIN;
    else process.env.AUTH_COOKIE_DOMAIN = original;
  });

  it("is false for hosted beancount.io deployments", () => {
    delete process.env.AUTH_COOKIE_DOMAIN;
    expect(cookieDomainNeedsConfig("https://v3.beancount.io")).toBe(false);
    expect(cookieDomainNeedsConfig("https://beancount.io")).toBe(false);
  });

  it("is true for another domain with no override", () => {
    delete process.env.AUTH_COOKIE_DOMAIN;
    expect(cookieDomainNeedsConfig("https://books.example.com")).toBe(true);
  });

  it("is false once the override is set", () => {
    process.env.AUTH_COOKIE_DOMAIN = ".example.com";
    expect(cookieDomainNeedsConfig("https://books.example.com")).toBe(false);
  });
});
