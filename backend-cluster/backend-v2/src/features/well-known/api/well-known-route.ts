import Router from "@koa/router";
import { toJSONSchema } from "zod";
import type { AppConfig } from "@/config/config";
import { MCP_TOOLS } from "@/features/ai-agent/api/mcp-tools";
import { MCP_RESOURCES } from "@/features/ai-agent/api/mcp-resources";

const SECURITY_TXT = `Contact: mailto:hello@beancount.io
Contact: https://beancount.io/security#report-a-vulnerability
Expires: 2027-08-01T00:00:00.000Z
Preferred-Languages: en
Canonical: https://beancount.io/.well-known/security.txt
Policy: https://beancount.io/security#report-a-vulnerability
`;

function mcpManifest(config: AppConfig) {
  const publicOrigin = config.dashboard.url;

  return {
    name: "beancount",
    displayName: "Beancount.io MCP Server",
    version: "1.0.0",
    description:
      "Talk to your Beancount ledger from Claude, Cursor, and any MCP client.",
    endpoint: `${publicOrigin}/api-gateway/mcp`,
    transport: "streamable-http",
    transports: ["streamable-http"],
    // Resources are declared alongside tools because the server serves both.
    // A manifest listing only tools would tell a client the read surface does
    // not exist — and the read surface is most of it (ADR 0008 D2).
    capabilities: { tools: {}, resources: {}, streaming: true },
    tools: MCP_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: toJSONSchema(tool.inputSchema),
    })),
    resources: MCP_RESOURCES.map((resource) => ({
      name: resource.name,
      description: resource.description,
      uriTemplate: resource.uriTemplate,
      mimeType: resource.mimeType,
    })),
    auth: {
      type: "oauth2",
      authorizationUrl: `${config.oauth.issuer}/api-gateway/oauth/auth`,
      tokenUrl: `${config.oauth.issuer}/api-gateway/oauth/token`,
      scopes: ["read", "write"],
    },
    openapi: `${publicOrigin}/api-gateway/v1/openapi.json`,
  };
}

export function setWellKnownRoutes(router: Router, config: AppConfig): void {
  router.get("/.well-known/security.txt", (ctx) => {
    ctx.type = "text/plain";
    ctx.set("Cache-Control", "public, max-age=3600");
    ctx.body = SECURITY_TXT;
  });

  router.get("/.well-known/mcp.json", (ctx) => {
    ctx.type = "application/json";
    ctx.set("Cache-Control", "public, max-age=3600");
    ctx.set("Access-Control-Allow-Origin", "*");
    ctx.body = mcpManifest(config);
  });
}
