import Router from "@koa/router";
import type { AppLayers } from "@/foundation/composition";
import { BadUserInputError } from "@/shared/errors";
import { setAdminApiRoute } from "../admin-api-handler";
import { registerListActivePaidUsersRoute } from "../list-active-paid-users-handler";
import { registerListRecentUsersRoute } from "../list-recent-users-handler";
import type { IAdminService } from "../../service/admin-service";

/** Registration only stores the layers; it never calls into them. */
const stubLayers = new Proxy(function stub() {} as never, {
  get: (_target, prop) => (prop === "then" ? undefined : stubLayers),
  apply: () => stubLayers,
  construct: () => stubLayers,
}) as unknown as AppLayers;

describe("setAdminApiRoute", () => {
  it("mounts exactly the operator routes, and none that issue a sign-in link", () => {
    const router = new Router();
    setAdminApiRoute(router, stubLayers, {
      dashboard: { url: "https://books.example.test" },
    } as never);

    const mounted = router.stack
      .flatMap((layer) =>
        layer.methods
          .filter((method) => method !== "HEAD")
          .map((method) => `${method} ${layer.path}`),
      )
      .sort();

    // Adding an operator route is a deliberate change to this list. Account
    // recovery goes through password-reset-link, which the user redeems on
    // the reset page; no route hands an operator a session.
    expect(mounted).toEqual([
      "GET /api/admin/active-paid-users",
      "GET /api/admin/ledger-limits/:ledgerUsername",
      "GET /api/admin/recent-users",
      "GET /api/admin/stats",
      "POST /api/admin/fix-user-email",
      "POST /api/admin/get-signup-otp",
      "POST /api/admin/password-reset-link",
      "POST /api/admin/run-migrations",
      "POST /api/admin/unblock-user",
      "POST /api/admin/user-detail",
      "POST /api/admin/user-ledgers",
    ]);
  });
});

describe("admin numeric query strictness (w31/071)", () => {
  function extractHandler(
    register: (router: Router, service: IAdminService) => void,
    path: string,
    service: Partial<IAdminService>,
  ): Router.Middleware {
    const router = new Router();
    const getSpy = jest.fn();
    router.get = getSpy;
    register(router, service as unknown as IAdminService);
    const call = getSpy.mock.calls.find((args) => args[0] === path);
    return call[2] as Router.Middleware;
  }

  it("refuses empty/whitespace/hex/scientific numeric params on active-paid-users and keeps defaults", async () => {
    const listActivePaidUsers = jest.fn(async () => ({
      users: [],
      pagination: { limit: 50, offset: 0, total: 0 },
    }));
    const handler = extractHandler(
      registerListActivePaidUsersRoute,
      "/api/admin/active-paid-users",
      { listActivePaidUsers },
    );

    for (const query of [
      { offset: "" },
      { offset: "  " },
      { limit: "" },
      { limit: "0x2" },
      { limit: "1e1" },
      { offset: "1.0" },
    ]) {
      const ctx = { query, body: null } as unknown as Router.RouterContext;
      await expect(handler(ctx, async () => {})).rejects.toThrow(
        BadUserInputError,
      );
    }
    expect(listActivePaidUsers).not.toHaveBeenCalled();

    const defaultCtx = {
      query: {},
      body: null,
    } as unknown as Router.RouterContext;
    await handler(defaultCtx, async () => {});
    expect(listActivePaidUsers).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
      clientId: "beancount-web-prod",
    });
  });

  it("refuses empty/whitespace/hex/scientific numeric params on recent-users and keeps defaults", async () => {
    const listRecentUsers = jest.fn(async () => ({
      users: [],
      pagination: { limit: 50, offset: 0, count: 0 },
    }));
    const handler = extractHandler(
      registerListRecentUsersRoute,
      "/api/admin/recent-users",
      { listRecentUsers },
    );

    for (const query of [
      { offset: "" },
      { offset: "  " },
      { limit: "" },
      { limit: "0x2" },
      { sinceHours: "1e1" },
      { sinceHours: "1.0" },
    ]) {
      const ctx = { query, body: null } as unknown as Router.RouterContext;
      await expect(handler(ctx, async () => {})).rejects.toThrow(
        BadUserInputError,
      );
    }
    expect(listRecentUsers).not.toHaveBeenCalled();

    const defaultCtx = {
      query: {},
      body: null,
    } as unknown as Router.RouterContext;
    await handler(defaultCtx, async () => {});
    expect(listRecentUsers).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
      sinceHours: 24,
    });
  });
});
