import { CLI_AUTH_V1_ROUTES } from "../cli-auth-routes";
import { COOKIE_NAME } from "@/shared/cookie-utils";
import type { V1Deps } from "@/server/rest/v1-route";

// REST logout clears the browser cookie the same way GraphQL's `logout` does
// (auth-resolver.test.ts): on the setter's domain and path, plus any host-only copy.
describe("POST /api-gateway/v1/logout", () => {
  const route = CLI_AUTH_V1_ROUTES.find(
    (r) => r.path === "/api-gateway/v1/logout",
  )!;
  const original = process.env.AUTH_COOKIE_DOMAIN;
  const logout = jest.fn().mockResolvedValue(undefined);

  const call = async (env: string) => {
    const set = jest.fn();
    const ctx = {
      headers: { authorization: "Bearer session-token" },
      cookies: { set, get: jest.fn() },
    };
    const deps = {
      layers: { services: { auth: { logout } } },
      config: { env },
    } as unknown as V1Deps;
    const result = await route.handler(deps, { ctx } as never);
    return { result, set };
  };

  beforeEach(() => {
    logout.mockClear();
    delete process.env.AUTH_COOKIE_DOMAIN;
  });
  afterAll(() => {
    if (original !== undefined) process.env.AUTH_COOKIE_DOMAIN = original;
  });

  it("revokes the token and expires the cookie on the shared parent domain in production", async () => {
    const { result, set } = await call("production");

    expect(result).toEqual({ success: true });
    expect(logout).toHaveBeenCalledWith("session-token");
    expect(set).toHaveBeenCalledWith(COOKIE_NAME, "", {
      maxAge: 0,
      path: "/",
      domain: ".beancount.io",
    });
    expect(set).toHaveBeenCalledWith(COOKIE_NAME, "", {
      maxAge: 0,
      path: "/",
    });
  });

  it("expires only the host-only cookie outside production", async () => {
    const { set } = await call("development");

    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(COOKIE_NAME, "", {
      maxAge: 0,
      path: "/",
    });
  });
});
