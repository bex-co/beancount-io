import { createFileRoute } from "@tanstack/react-router";
import { handleApiGatewayProxy } from "@/features/oauth/funcs/handle-api-gateway-proxy";

export const Route = createFileRoute("/api-gateway/$")({
  server: {
    handlers: {
      GET: handleApiGatewayProxy,
      HEAD: handleApiGatewayProxy,
      POST: handleApiGatewayProxy,
      PUT: handleApiGatewayProxy,
      PATCH: handleApiGatewayProxy,
      DELETE: handleApiGatewayProxy,
      OPTIONS: handleApiGatewayProxy,
    },
  },
});
