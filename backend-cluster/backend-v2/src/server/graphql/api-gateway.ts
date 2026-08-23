import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { koaMiddleware } from "@as-integrations/koa";
import { buildSchema } from "type-graphql";
import type { GraphQLSchema } from "graphql";
import { printSchema } from "graphql";
import Router from "@koa/router";
import http from "http";
import type { Middleware } from "koa";
import { config as appConfig, type AppConfig } from "@/config/config";
import { apolloMetricsPlugin } from "@/metrics/apollo-plugin";
import { type AppLayers } from "@/foundation/composition";
import { resolvers, type ResolverContainer } from "./resolver-registry";

import type { IContext } from "./context";
import { createContext } from "./context";
import { customAuthChecker } from "./auth-checker";
import { graphqlScopeMiddleware } from "./scope-middleware";
import { errorLoggingPlugin } from "./plugins/error-logging";
import { formatError } from "./format-error";
import { setAuthCookie, getAuthCookieFromCtx } from "@/shared/cookie-utils";
import { verifyJwt } from "@/features/auth/utils/jwt-crypto-utils";
import type { ScopeEnforcementMode } from "@/server/api/op-class";

/**
 * Build the one GraphQL schema.
 *
 * The container is optional so the guard tests can enumerate the schema's ops
 * without standing up the service layer: TypeGraphQL instantiates resolvers
 * lazily, at execution time, so a schema built without one is structurally
 * identical to the served schema.
 */
export async function buildGraphqlSchema(options?: {
  container?: ResolverContainer;
  scopeEnforcement?: ScopeEnforcementMode;
}): Promise<GraphQLSchema> {
  return buildSchema({
    resolvers,
    ...(options?.container ? { container: options.container } : {}),
    authChecker: customAuthChecker,
    globalMiddlewares: [
      graphqlScopeMiddleware(options?.scopeEnforcement ?? "shadow"),
    ],
    validate: true,
  });
}

/**
 * Publish the schema's SDL. Deliberately its own registration: it is the one
 * GraphQL mount that carries no caller and no op, so keeping it separate is
 * what lets the composition root mark it public without also excusing the
 * transport beside it.
 */
export function registerGraphqlSdlRoute(
  router: Router,
  schema: GraphQLSchema,
): void {
  const sdl = printSchema(schema);
  router.get("/api-gateway/schema.graphql", (ctx) => {
    ctx.type = "text/plain";
    ctx.body = sdl;
  });
}

/** Mount Apollo on the router — the GraphQL surface's transport. */
export async function registerGraphqlTransport(
  httpServer: http.Server,
  router: Router,
  schema: GraphQLSchema,
  layers: AppLayers,
  config: AppConfig = appConfig,
): Promise<void> {
  const server = new ApolloServer({
    schema,
    introspection: true,
    formatError,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      errorLoggingPlugin,
      apolloMetricsPlugin,
    ],
  });

  await server.start();

  const cookieMiddleware: Middleware = async (ctx, next) => {
    const authHeader = ctx.headers.authorization;
    const existingCookie = getAuthCookieFromCtx(ctx);

    if (authHeader && !existingCookie) {
      const token = String(authHeader).replace(/^Bearer\s+/, "");
      const decoded = await verifyJwt(token, config.jwt.secret);
      if (decoded) {
        setAuthCookie(
          ctx,
          token,
          new Date(decoded.exp * 1000),
          config.env === "production",
        );
      }
    }

    await next();
  };

  router.all(
    "/api-gateway/",
    cookieMiddleware,
    koaMiddleware(server, {
      context: async ({ ctx }): Promise<IContext> => {
        return createContext(ctx, layers.database, config);
      },
    }),
  );
}
