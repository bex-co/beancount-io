import Router, { RouterContext } from "@koa/router";
import bodyParser from "koa-bodyparser";
import type { RouteConfig } from "@asteasolutions/zod-to-openapi";
import type { ZodType } from "zod";

import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";
import { assertLedgerScope } from "@/features/ledger/utils/authorize-ledger";
import { identityFromState } from "./identity-middleware";
import { registerRoute, V1_TAG } from "./openapi-registry";
import { validateRequest, validatedFromState } from "./validation-middleware";
import { UnauthenticatedError } from "@/shared/errors";
import { errorSchema, json } from "./v1-schemas";

/**
 * One declaration per v1 endpoint, mounted and documented from the same object.
 *
 * The drift this prevents is not hypothetical: the pre-v1 archive route
 * declares `/ledgers/{ledgerId}/archive/{archive}` to the spec while mounting
 * `/api-gateway/ledgers/:ledgerId/archive/:archive`, so the published contract
 * names a URL that 404s. That is possible because mounting and documenting were
 * two calls with two path strings. Here they are one string, transformed by
 * this module for each consumer — a route cannot be mounted without being
 * documented, and neither can name a path the other does not.
 *
 * `openapi-completeness.test.ts` then checks the invariant from the outside,
 * because a helper is only a guarantee for the routes that use it.
 */

/** The prefix every v1 path carries. */
export const V1_PREFIX = "/api-gateway/v1";

/**
 * Path syntax for a route declaration: OpenAPI-style `{param}`, plus `{*param}`
 * for a trailing wildcard that swallows slashes (file paths).
 */
type V1Path = `${typeof V1_PREFIX}/${string}`;

type V1Method = "get" | "post" | "put" | "delete";

export interface V1Deps {
  readonly layers: AppLayers;
  readonly config: AppConfig;
}

interface V1Input<P, Q, B> {
  readonly params: P;
  readonly query: Q;
  readonly body: B;
  /** The authenticated caller, required for every v1 resource route. */
  readonly identity: Identity;
  readonly ctx: RouterContext;
}

export interface V1Route<P = unknown, Q = unknown, B = unknown> {
  readonly method: V1Method;
  /** Declared path including the `/api-gateway/v1` prefix, in `{param}` form. */
  readonly path: V1Path;
  readonly summary: string;
  readonly description: string;
  readonly params?: ZodType<P>;
  readonly query?: ZodType<Q>;
  readonly body?: ZodType<B>;
  /** Response documentation, minus the shared error responses. */
  readonly responses: RouteConfig["responses"];
  /**
   * Return a value to send it as the JSON body; return `undefined` after
   * setting `ctx.body` yourself (streams, negotiated content types).
   */
  handler(deps: V1Deps, input: V1Input<P, Q, B>): Promise<unknown>;
}

/** `{param}` → `:param`; `{*param}` passes through as path-to-regexp's wildcard. */
export function toKoaPath(path: string): string {
  return path.replace(/\{([A-Za-z0-9_]+)\}/g, ":$1");
}

/** `{*param}` → `{param}`: OpenAPI has no wildcard syntax, only a parameter. */
export function toOpenApiPath(path: string): string {
  return path.replace(/\{\*([A-Za-z0-9_]+)\}/g, "{$1}");
}

/**
 * The error responses every v1 route can produce, documented once. Handlers
 * throw `DomainError`s and `restErrorMiddleware` renders them; repeating the
 * shapes per route would be four copies of one fact.
 */
const SHARED_ERROR_RESPONSES: RouteConfig["responses"] = {
  400: json(
    "Request failed validation against the documented schema",
    errorSchema,
  ),
  401: json(
    "No credential, or a credential that no longer resolves",
    errorSchema,
  ),
  403: json(
    "The credential lacks the scope this operation's class requires",
    errorSchema,
  ),
  404: json("No such ledger, or no access to it", errorSchema),
  429: json("Rate limited", errorSchema),
};

function requireIdentity(ctx: RouterContext): Identity {
  const identity = identityFromState(ctx);
  if (!identity) {
    throw new UnauthenticatedError(
      "This endpoint requires a credential: send `x-api-key: <personal-access-token>` or `Authorization: Bearer <token>`.",
    );
  }
  return identity;
}

/** The ledger named by the uniform v1 `{owner}/{name}` path convention. */
function ledgerIdFromParams(params: unknown): string | undefined {
  if (!params || typeof params !== "object") return undefined;
  const { owner, name } = params as Record<string, unknown>;
  return typeof owner === "string" && owner && typeof name === "string" && name
    ? `${owner}/${name}`
    : undefined;
}

/** Mount one route and register it with the spec, from one declaration. */
function registerV1Route<P, Q, B>(
  router: Router,
  deps: V1Deps,
  route: V1Route<P, Q, B>,
): void {
  const middlewares: Router.Middleware[] = [];
  if (route.body) middlewares.push(bodyParser());
  middlewares.push(
    validateRequest({
      params: route.params,
      query: route.query,
      body: route.body,
    }),
  );

  router[route.method](toKoaPath(route.path), ...middlewares, async (ctx) => {
    const validated = validatedFromState(ctx);
    const identity = requireIdentity(ctx);
    const ledgerId = ledgerIdFromParams(validated.params);
    if (ledgerId) assertLedgerScope(identity, ledgerId);
    const result = await route.handler(deps, {
      params: validated.params as P,
      query: validated.query as Q,
      body: validated.body as B,
      identity,
      ctx,
    });
    if (result !== undefined) ctx.body = result;
  });

  registerRoute({
    method: route.method,
    path: toOpenApiPath(route.path),
    summary: route.summary,
    description: route.description,
    tags: [V1_TAG],
    security: [{ bearerAuth: [] }, { apiKey: [] }],
    request: {
      ...(route.params ? { params: route.params } : {}),
      ...(route.query ? { query: route.query } : {}),
      ...(route.body
        ? { body: { content: { "application/json": { schema: route.body } } } }
        : {}),
    },
    responses: { ...route.responses, ...SHARED_ERROR_RESPONSES },
  } as RouteConfig);
}

/** Mount a fragment's routes in declaration order. */
export function registerV1Routes(
  router: Router,
  deps: V1Deps,
  routes: readonly V1Route<never, never, never>[],
): void {
  for (const route of routes) {
    registerV1Route(router, deps, route);
  }
}

/**
 * Declare a route with its schema types inferred, then erase them so a list of
 * differently-shaped routes still type-checks. The handler keeps its precise
 * input types at the definition site, which is the only place they matter.
 */
export function v1Route<P, Q, B>(
  route: V1Route<P, Q, B>,
): V1Route<never, never, never> {
  return route as unknown as V1Route<never, never, never>;
}
