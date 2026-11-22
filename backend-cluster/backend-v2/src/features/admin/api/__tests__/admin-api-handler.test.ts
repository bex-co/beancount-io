import Router from "@koa/router";
import type { AppLayers } from "@/foundation/composition";
import { setAdminApiRoute } from "../admin-api-handler";

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
