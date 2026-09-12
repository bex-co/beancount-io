import Router from "@koa/router";
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
  // Every machine-reachable URL comes from the issuer (w2/m29:t002). The
  // manifest used to mix origins: `endpoint` and `openapi` from the dashboard
  // URL, `auth` from the issuer — so on a deployment where those differ it
  // advertised an MCP address that serves the dashboard's HTML. The 401's
  // `WWW-Authenticate` pointer already used the issuer and was right; this
  // makes the manifest agree with the rest of discovery.
  //
  // Scope, precisely: outside production `oauth.issuer` is `SERVER_URL`, so
  // this is the real fix for a split-origin self-host — `deploy/docker-mac`
  // serves the dashboard on :42600 and the API on :42601, and the manifest
  // now names :42601. In production `config.ts` sets `oauthIssuer =
  // dashboardUrl` and `assertOAuthInteractionHost` requires the two to share a
  // host, so both expressions are the same string and nothing changes. A
  // production-mode deployment that genuinely splits the two origins still
  // has no way to say so — `AppConfig` has no "API public URL" distinct from
  // the OIDC issuer identity. That missing concept is w2/015.
  const apiOrigin = config.oauth.issuer;

  return {
    name: "beancount",
    displayName: "Beancount.io MCP Server",
    version: "1.0.0",
    description:
      "Talk to your Beancount ledger from Claude, Cursor, and any MCP client.",
    endpoint: `${apiOrigin}/api-gateway/mcp`,
    transport: "streamable-http",
    transports: ["streamable-http"],
    // Resources are declared alongside tools because the server serves both.
    // A manifest listing only tools would tell a client the read surface does
    // not exist — and the read surface is most of it (ADR 0008 D2).
    capabilities: { tools: {}, resources: {}, streaming: true },
    // Names and addresses, nothing else. Publishing every tool's input and
    // output schema made this ~20 KB on an anonymous, cached GET whose job is
    // only to say what exists and where. A client that wants descriptions or
    // schemas calls `tools/list` and `resources/templates/list`, which answer
    // authoritatively and per credential — this document cannot, because it
    // has no caller to answer for.
    tools: MCP_TOOLS.map((tool) => tool.name),
    resources: MCP_RESOURCES.map((resource) => ({
      name: resource.name,
      uriTemplate: resourceTemplateFor(resource).uriTemplate.toString(),
    })),
    auth: {
      type: "oauth2",
      authorizationUrl: `${apiOrigin}/api-gateway/oauth/auth`,
      tokenUrl: `${apiOrigin}/api-gateway/oauth/token`,
      scopes: API_SCOPES,
    },
    openapi: `${apiOrigin}/api-gateway/v1/openapi.json`,
    /** Human-facing only: where a person mints a key or reads the guide. */
    links: {
      dashboard: config.dashboard.url,
      apiKeys: `${config.dashboard.url}/settings/api-keys`,
    },
  };
}

const IOS_BUNDLE_ID = "io.beancount.ios";
const ANDROID_PACKAGE = "io.beancount.android";

function appleAppSiteAssociation(teamId: string) {
  return {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID: `${teamId}.${IOS_BUNDLE_ID}`,
          paths: ["/ledger/*"],
        },
      ],
    },
  };
}

function assetLinks(fingerprints: readonly string[]) {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: [...fingerprints],
      },
    },
  ];
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

  // Unset env → 404 so a self-host without a native build does not advertise
  // Beancount.io's app IDs on its own domain.
  router.get("/.well-known/apple-app-site-association", (ctx) => {
    const teamId = config.appLinks.appleTeamId;
    if (!teamId) {
      ctx.status = 404;
      return;
    }
    ctx.type = "application/json";
    ctx.set("Cache-Control", "public, max-age=3600");
    ctx.body = appleAppSiteAssociation(teamId);
  });

  router.get("/.well-known/assetlinks.json", (ctx) => {
    const fingerprints = config.appLinks.androidSha256Fingerprints;
    if (fingerprints.length === 0) {
      ctx.status = 404;
      return;
    }
    ctx.type = "application/json";
    ctx.set("Cache-Control", "public, max-age=3600");
    ctx.body = assetLinks(fingerprints);
  });
}
