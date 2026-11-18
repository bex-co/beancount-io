import type Router from "@koa/router";
import { type AppLayers } from "@/foundation/composition";
import {
  OIDC_CALLBACK_PATH,
  OIDC_START_PATH,
} from "@/features/auth/service/oidc-login-service";
import { UNKNOWN_CLIENT_ADDRESS } from "@/server/client-address";
import { identityFromState } from "@/server/rest/identity-middleware";

const STATE_COOKIE = "oidcState";

const queryValue = (value: unknown) =>
  typeof value === "string" ? value : undefined;

/** Browser redirects for signing in through the configured OIDC provider. */
export function setOidcLoginRoutes(router: Router, layers: AppLayers): void {
  const oidc = layers.services.oidcLogin;

  router.get(OIDC_START_PATH, async (ctx) => {
    if (!oidc.providerName()) ctx.throw(404);
    const identity = identityFromState(ctx);
    const { redirectUrl, state } = await oidc.start({
      next: queryValue(ctx.query.next),
      linkTicket: queryValue(ctx.query.link),
      sessionUserId:
        identity?.method === "session" ? identity.userId : undefined,
    });
    if (state) {
      // Binds the callback to the browser that started the sign-in.
      ctx.cookies.set(STATE_COOKIE, state, {
        httpOnly: true,
        secure: ctx.URL.protocol === "https:",
        sameSite: "lax",
        path: OIDC_CALLBACK_PATH,
        maxAge: 10 * 60 * 1000,
      });
    }
    ctx.redirect(redirectUrl);
  });

  router.get(OIDC_CALLBACK_PATH, async (ctx) => {
    if (!oidc.providerName()) ctx.throw(404);
    const cookieState = ctx.cookies.get(STATE_COOKIE);
    ctx.cookies.set(STATE_COOKIE, "", { path: OIDC_CALLBACK_PATH, maxAge: 0 });
    ctx.redirect(
      await oidc.finish({
        code: queryValue(ctx.query.code),
        state: queryValue(ctx.query.state),
        cookieState,
        ip: ctx.ip || UNKNOWN_CLIENT_ADDRESS,
      }),
    );
  });
}
