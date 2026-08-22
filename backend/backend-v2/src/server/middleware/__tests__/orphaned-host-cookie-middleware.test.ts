import { Context, Next } from "koa";
import type { IJwtModel } from "@/features/auth/data/jwt-model";
import type { IModels } from "@/foundation/models/types";
import type { DbExecutor } from "@/drizzle/drizzle";
import {
  createOrphanedHostCookieMiddleware,
  ORPHANED_HOST_AUTH_COOKIE_NAME,
} from "../orphaned-host-cookie-middleware";

describe("orphanedHostCookieMiddleware", () => {
  const db = {} as DbExecutor;

  let jwt: jest.Mocked<Pick<IJwtModel, "revoke">>;
  let cookies: { get: jest.Mock; set: jest.Mock };
  let ctx: Context;
  let next: Next;

  const runWithCookie = (value: string | undefined) => {
    cookies.get.mockReturnValue(value);
    const middleware = createOrphanedHostCookieMiddleware(
      { jwt } as unknown as Pick<IModels, "jwt">,
      db,
    );
    return middleware(ctx, next);
  };

  beforeEach(() => {
    jwt = { revoke: jest.fn().mockResolvedValue(undefined) };
    cookies = { get: jest.fn(), set: jest.fn() };
    ctx = { cookies } as unknown as Context;
    next = jest.fn().mockResolvedValue(undefined);
  });

  it("revokes the stranded token and clears the cookie", async () => {
    await runWithCookie("stranded.jwt.token");

    expect(cookies.get).toHaveBeenCalledWith(ORPHANED_HOST_AUTH_COOKIE_NAME);
    expect(jwt.revoke).toHaveBeenCalledWith(db, "stranded.jwt.token");
    expect(cookies.set).toHaveBeenCalledWith(
      ORPHANED_HOST_AUTH_COOKIE_NAME,
      "",
      expect.objectContaining({
        maxAge: 0,
        httpOnly: true,
        // A __Host- deletion without these is rejected by the browser.
        secure: true,
        path: "/",
      }),
    );
    // No `domain` — the __Host- prefix forbids it.
    expect(cookies.set.mock.calls[0][2]).not.toHaveProperty("domain");
    expect(next).toHaveBeenCalled();
  });

  it("does nothing when the cookie is absent", async () => {
    await runWithCookie(undefined);

    expect(jwt.revoke).not.toHaveBeenCalled();
    expect(cookies.set).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("still clears the cookie and serves the request when revoke fails", async () => {
    jwt.revoke.mockRejectedValue(new Error("database unavailable"));

    await expect(runWithCookie("stranded.jwt.token")).resolves.toBeUndefined();

    expect(cookies.set).toHaveBeenCalledWith(
      ORPHANED_HOST_AUTH_COOKIE_NAME,
      "",
      expect.objectContaining({ maxAge: 0 }),
    );
    expect(next).toHaveBeenCalled();
  });
});
