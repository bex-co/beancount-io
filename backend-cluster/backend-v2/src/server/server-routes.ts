import { AppConfig } from "@/config/config";
import Router from "@koa/router";
import http from "http";
import { type AppLayers } from "@/foundation/composition";
import { setApiGateway } from "@/server/graphql";
import { setupRestRoutes } from "@/server/rest";

/**
 * Main server route orchestrator
 *
 * This module coordinates the setup of both RESTful and GraphQL APIs:
 * - RESTful API: Authentication, admin, webhooks, metrics, etc. (see rest/rest-routes.ts)
 * - GraphQL API: All GraphQL resolvers and schema (see graphql-server/api-gateway.ts)
 */
export async function setServerRoutes(
  httpServer: http.Server,
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): Promise<void> {
  // Set up GraphQL API (Apollo Server with all resolvers)
  await setApiGateway(httpServer, router, layers);

  // Set up RESTful API (all REST endpoints)
  await setupRestRoutes(router, layers, config);
}
