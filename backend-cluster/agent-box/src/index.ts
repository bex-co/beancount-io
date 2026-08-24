// Main entry point for the claude-code-sandbox worker.
//
// Post-m17 this worker is a thin **sandbox control plane** for the self-built
// HarnessV1SandboxProvider in backend-v2 (ADR 0005): it exposes the
// @cloudflare/sandbox primitives over HTTP and proxies exposed-port preview URLs
// (the harness bridge) to the container. The legacy SSE/PR execution path
// (beancount-stream, TaskManager, workflow, i18n) was deleted once the harness
// path was proven live (m17/t010).

import { fromHono } from 'chanfana';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context, Next } from 'hono';
import type { Env, ExecutionContext } from './types';

import { HealthEndpoint } from './api/health-endpoint';
import { validateAdminToken, jsonResponse } from './utils';
import { registerControlPlaneRoutes } from './features/control-plane';
import { proxyToSandbox } from '@cloudflare/sandbox';

// Create base Hono app
const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware
app.use(
  '/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['*'],
    maxAge: 86400,
  }),
);

// Create OpenAPI router from Hono
const openapi = fromHono(app, {
  docs_url: null,
  redoc_url: null,
  openapi_url: '/openapi.json',
  schema: {
    info: {
      title: 'Claude Code Sandbox Control Plane',
      version: '2.0.0',
      description:
        'Sandbox control plane for the AI SDK harness provider: exposes @cloudflare/sandbox primitives over HTTP and proxies exposed-port preview URLs to the container.',
    },
    servers: [
      {
        url: 'https://sandbox.beancount.io',
        description: 'Production server',
      },
      { url: 'http://localhost:8788', description: 'Local development server' },
    ],
  },
});

// Admin token validation middleware
const requireAdminToken = async (c: Context, next: Next) => {
  const env = c.env as Env;
  const request = c.req.raw;
  const providedToken = request.headers.get('x-admin-token');
  const expectedToken = env.ADMIN_TOKEN;

  if (!validateAdminToken(request, expectedToken)) {
    let message: string;
    if (!providedToken) {
      message = 'Missing x-admin-token header';
    } else if (!expectedToken) {
      message = 'Server error: ADMIN_TOKEN not configured';
    } else {
      message =
        'Invalid x-admin-token. Check ADMIN_TOKEN in Cloudflare Workers secrets';
    }
    return jsonResponse({ error: 'Unauthorized', message }, { status: 401 });
  }
  await next();
};

// Health check (no auth required)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
openapi.get('/healthz', HealthEndpoint as any);

// Control-plane RPC routes (create/exec/spawn/read/write/expose/stop/destroy).
registerControlPlaneRoutes(app, requireAdminToken);

// Export for Cloudflare Workers. Requests to an exposed-port preview URL (the
// harness bridge's WebSocket) must be routed to the container by proxyToSandbox
// BEFORE the normal app routing; it returns null for everything else.
export default {
  // ctx is optional so tests can call fetch(request, env); the runtime supplies it.
  async fetch(
    request: Request,
    env: Env,
    ctx?: ExecutionContext,
  ): Promise<Response> {
    const proxied = await proxyToSandbox(request, env);
    if (proxied) return proxied;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return app.fetch(request, env, ctx as any);
  },
};

// Re-export the Sandbox Durable Object (used by the control plane).
export { Sandbox } from '@cloudflare/sandbox';
