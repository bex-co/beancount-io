import { createFileRoute } from "@tanstack/react-router";
import { handleOAuthProviderProxy } from "@/features/oauth/funcs/handle-provider-proxy";

export const Route = createFileRoute("/api-gateway/oauth/$")({
  server: {
    handlers: {
      GET: handleOAuthProviderProxy,
      POST: handleOAuthProviderProxy,
    },
  },
});
