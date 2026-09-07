import Router from "@koa/router";
import { toJSONSchema } from "zod";
import type { AppConfig } from "@/config/config";
import { MCP_TOOLS } from "@/features/ai-agent/api/mcp-tools";
import {
  MCP_RESOURCES,
  resourceTemplateFor,
} from "@/features/ai-agent/api/mcp-resources";
import { API_SCOPES } from "@/server/api/identity";

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
      inputSchema: toJSONSchema(tool.inputSchema, { io: "input" }),
      outputSchema: toJSONSchema(tool.outputSchema),
    })),
    resources: MCP_RESOURCES.map((resource) => ({
      name: resource.name,
      description: resource.description,
      uriTemplate: resourceTemplateFor(resource).uriTemplate.toString(),
      mimeType: resource.mimeType,
    })),
    auth: {
      type: "oauth2",
      authorizationUrl: `${config.oauth.issuer}/api-gateway/oauth/auth`,
      tokenUrl: `${config.oauth.issuer}/api-gateway/oauth/token`,
      scopes: API_SCOPES,
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

  // Everything in the manifest is static per process — tool schemas, resource
  // templates, and config never change after startup — so serialize the ~50
  // JSON-schema exports once instead of on every anonymous GET.
  let manifest: ReturnType<typeof mcpManifest> | undefined;
  router.get("/.well-known/mcp.json", (ctx) => {
    ctx.type = "application/json";
    ctx.set("Cache-Control", "public, max-age=3600");
    ctx.set("Access-Control-Allow-Origin", "*");
    manifest ??= mcpManifest(config);
    ctx.body = manifest;
  });
}
