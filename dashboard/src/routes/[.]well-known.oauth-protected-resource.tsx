import { createFileRoute } from "@tanstack/react-router";
import { handleOAuthProviderProxy } from "@/features/oauth/funcs/handle-provider-proxy";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: { handlers: { GET: handleOAuthProviderProxy } },
});
