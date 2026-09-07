import type Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import {
  anonymousV1Route,
  v1Route,
  registerV1Routes,
  type V1Deps,
} from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { getTokenFromCtx } from "@/features/auth/utils/auth";
import { clearAuthCookie } from "@/shared/cookie-utils";
import {
  CLI_AUTH_WIRE_STATUSES,
  firstForwardedIp,
  toCliAuthWireStatus,
} from "@/features/auth/api/cli-auth-wire";

/**
 * REST transport for the CLI's side of the device-authorization ceremony, plus
 * logout. The browser's side (describe, confirm, deny — keyed by the short
 * user code) stays GraphQL-only with the dashboard; these routes carry only
 * what the CLI itself drives, keyed by the device code that never leaves its
 * process. The wire vocabulary is shared with the GraphQL resolver via
 * `cli-auth-wire.ts`, so both transports tell one story structurally.
 */

const clientInfoInput = z
  .object({
    name: z.string().optional().openapi({ description: "Client name, e.g. `bea`." }),
    version: z.string().optional(),
    deviceLabel: z.string().optional().openapi({ description: "Machine name the client runs on." }),
    platform: z.string().optional(),
  })
  .strict();

const createSessionBody = z
  .object({
    client: clientInfoInput.optional().openapi({
      description:
        "How the requesting device describes itself. Self-reported and unverified: shown so a person can recognize their own terminal, never treated as evidence.",
    }),
  })
  .strict();

const createSessionResponse = z.object({
  deviceCode: z.string().openapi({
    description:
      "The CLI's private verifier. Keep it in the process; never put it in a URL, a log, or the browser.",
  }),
  userCode: z.string().openapi({
    description: "Short code to display so the person can enter it in the browser.",
  }),
  expiresAt: z.string(),
  pollIntervalSeconds: z.number().int().openapi({
    description: "Seconds the CLI should wait between status polls.",
  }),
});

const deviceCodeParams = z.object({
  deviceCode: z.string().min(1).openapi({
    description: "The private verifier returned when the session was created.",
  }),
});

export const CLI_AUTH_V1_ROUTES = [
  anonymousV1Route({
    method: "post",
    path: "/api-gateway/v1/cli-sessions",
    operationId: "createCliAuthSession",
    summary: "Initiate a CLI authentication session",
    description:
      "Starts the device-authorization ceremony. Returns the device code the CLI polls with and the user code to display for the person to enter in the browser. Anonymous by design: the caller is the terminal that does not have a credential yet.",
    body: createSessionBody,
    responses: { 200: json("The new session's codes and polling contract", createSessionResponse) },
    handler: async ({ layers }, { body, ctx }) =>
      layers.services.cliAuth.createSession(
        body.client ?? {},
        firstForwardedIp(ctx.get("x-forwarded-for")),
      ),
  }),
  anonymousV1Route({
    method: "get",
    path: "/api-gateway/v1/cli-sessions/{deviceCode}",
    operationId: "getCliAuthSession",
    summary: "Poll a CLI authentication session's status",
    description:
      "Only the initiating CLI can call this: it takes the device code, which never leaves that process. A missing session and an unrecognized device code are the same answer: EXPIRED.",
    params: deviceCodeParams,
    responses: {
      200: json("The session status", z.object({ status: z.enum(CLI_AUTH_WIRE_STATUSES) })),
    },
    handler: async ({ layers }, { params }) => {
      const status = await layers.services.cliAuth.getSessionStatus(params.deviceCode);
      return { status: toCliAuthWireStatus(status) };
    },
  }),
  anonymousV1Route({
    method: "post",
    path: "/api-gateway/v1/cli-sessions/{deviceCode}/consume",
    operationId: "consumeCliAuthSession",
    summary: "Retrieve and consume the token from an authorized CLI session",
    description:
      "Single-use, and only redeemable by the device code the session was created with. The returned token is a 30-day CLI session credential; store it with owner-only file permissions.",
    params: deviceCodeParams,
    responses: {
      200: json(
        "The minted CLI credential",
        z.object({ token: z.string(), expireAt: z.string() }),
      ),
    },
    handler: async ({ layers }, { params }) =>
      layers.services.cliAuth.consumeSession(params.deviceCode),
  }),
  v1Route({
    method: "post",
    path: "/api-gateway/v1/logout",
    operationId: "logout",
    summary: "Revoke the calling credential and end the session",
    description:
      "Revokes the presented session token server-side and clears the browser cookie when one was used. Session-only: an API key or OAuth access token cannot log out, because a delegated credential does not own the session it rides on.",
    responses: { 200: json("Logout confirmation", z.object({ success: z.boolean() })) },
    handler: async ({ layers }, { ctx }) => {
      const token = getTokenFromCtx(ctx);
      if (token) await layers.services.auth.logout(token);
      clearAuthCookie(ctx);
      return { success: true };
    },
  }),
] as const;

export function setCliAuthRoutes(router: Router, deps: V1Deps): void {
  registerV1Routes(router, deps, CLI_AUTH_V1_ROUTES);
}
