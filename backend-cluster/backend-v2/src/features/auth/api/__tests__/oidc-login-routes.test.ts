import Router from "@koa/router";
import {
  OIDC_CALLBACK_PATH,
  OIDC_START_PATH,
} from "@/features/auth/service/oidc-login-service";
import { setOidcLoginRoutes } from "../oidc-login-routes";

function setup(providerName: string | null = "Home") {
  const oidc = {
    providerName: jest.fn(() => providerName),
    start: jest.fn(async () => ({
      redirectUrl: "https://id.example.com/auth",
      state: "s1",
    })),
    finish: jest.fn(async () => "https://money.example.com/auth/callback"),
  };
  const router = new Router();
  router.get = jest.fn() as never;
  setOidcLoginRoutes(router, { services: { oidcLogin: oidc } } as never);
  const handler = (path: string) =>
    (router.get as unknown as jest.Mock).mock.calls.find(
      (call) => call[0] === path,
    )[1];
  const ctx = (query: Record<string, string>, state = {}) => ({
    query,
    state,
    ip: "1.2.3.4",
    URL: new URL("https://money.example.com"),
    cookies: { get: jest.fn(() => "s1"), set: jest.fn() },
    redirect: jest.fn(),
    throw: jest.fn((status: number) => {
      throw new Error(String(status));
    }),
  });
  return { oidc, handler, ctx };
}

describe("setOidcLoginRoutes", () => {
  it("answers 404 when OIDC is off", async () => {
    const { handler, ctx } = setup(null);
    await expect(handler(OIDC_START_PATH)(ctx({}))).rejects.toThrow("404");
  });

  it("starts with the signed-in account and sets the state cookie", async () => {
    const { oidc, handler, ctx } = setup();
    const c = ctx(
      { link: "ticket", next: "/settings/general" },
      { identity: { userId: "user-1", method: "session" } },
    );
    await handler(OIDC_START_PATH)(c);
    expect(oidc.start).toHaveBeenCalledWith({
      next: "/settings/general",
      linkTicket: "ticket",
      sessionUserId: "user-1",
    });
    expect(c.cookies.set).toHaveBeenCalledWith(
      "oidcState",
      "s1",
      expect.objectContaining({ httpOnly: true, path: OIDC_CALLBACK_PATH }),
    );
    expect(c.redirect).toHaveBeenCalledWith("https://id.example.com/auth");
  });

  it("sets no cookie when start goes to an error page", async () => {
    const { oidc, handler, ctx } = setup();
    oidc.start.mockResolvedValueOnce({
      redirectUrl: "https://money.example.com/auth/login?oidcError=failed",
    } as never);
    const c = ctx({});
    await handler(OIDC_START_PATH)(c);
    expect(c.cookies.set).not.toHaveBeenCalled();
  });

  it("finishes with the cookie state and clears the cookie", async () => {
    const { oidc, handler, ctx } = setup();
    const c = ctx({ code: "c", state: "s1" });
    await handler(OIDC_CALLBACK_PATH)(c);
    expect(oidc.finish).toHaveBeenCalledWith({
      code: "c",
      state: "s1",
      cookieState: "s1",
      ip: "1.2.3.4",
    });
    expect(c.cookies.set).toHaveBeenCalledWith(
      "oidcState",
      "",
      expect.objectContaining({ maxAge: 0 }),
    );
    expect(c.redirect).toHaveBeenCalledWith(
      "https://money.example.com/auth/callback",
    );
  });
});
