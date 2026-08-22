import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { koaMiddleware } from "@as-integrations/koa";
import { buildSchema } from "type-graphql";
import { printSchema } from "graphql";
import Router from "@koa/router";
import http from "http";
import type { Middleware } from "koa";
import { config } from "@/config/config";
import { apolloMetricsPlugin } from "@/metrics/apollo-plugin";
import { type AppLayers } from "@/foundation/composition";
import { resolvers, buildResolverContainer } from "./resolver-registry";

import type { IContext } from "./context";
import { createContext } from "./context";
import { customAuthChecker } from "./auth-checker";
import { errorLoggingPlugin } from "./plugins/error-logging";
import { formatError } from "./format-error";
import { setAuthCookie, getAuthCookieFromCtx } from "@/shared/cookie-utils";
import { verifyJwt } from "@/features/auth/utils/jwt-crypto-utils";

export async function setApiGateway(
  httpServer: http.Server,
  router: Router,
  layers: AppLayers,
): Promise<void> {
  const localSchema = await buildSchema({
    resolvers,
    container: buildResolverContainer(
      layers.services,
      layers.workflows,
      layers.database,
      layers.clients,
    ),
    authChecker: customAuthChecker,
    validate: true,
  });

  const sdl = printSchema(localSchema);
  router.get("/api-gateway/schema.graphql", (ctx) => {
    ctx.type = "text/plain";
    ctx.body = sdl;
  });

  const server = new ApolloServer({
    schema: localSchema,
    introspection: true,
    formatError,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      errorLoggingPlugin,
      apolloMetricsPlugin,
    ],
  });

  await server.start();

  const gPath = "/api-gateway/";

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
    gPath,
    cookieMiddleware,
    koaMiddleware(server, {
      context: async ({ ctx }): Promise<IContext> => {
        return createContext(ctx, layers.database, config);
      },
    }),
  );
}
