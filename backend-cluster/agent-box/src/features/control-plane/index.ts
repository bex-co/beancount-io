// Control-plane route registration. Mounts a thin RPC surface over the
// @cloudflare/sandbox primitives at /control/sandbox/:name/*, each route behind
// the caller-supplied admin-token middleware. getSandbox(env.Sandbox, name) is
// idempotent by name, and the name IS the harness sessionId — that is what makes
// resume a second /ensure call.

import { getSandbox } from '@cloudflare/sandbox';
import type { Hono, Context, MiddlewareHandler } from 'hono';
import type { Env } from '../../types';
import {
  ensureSandbox,
  execCommand,
  spawnProcess,
  streamProcessLogs,
  getProcessStatus,
  killProcess,
  writeFile,
  readFile,
  exposePort,
  unexposePort,
  getExposedPorts,
  stopSandbox,
  destroySandbox,
  type SandboxLike,
} from './handlers';
import {
  execRequestSchema,
  spawnRequestSchema,
  killRequestSchema,
  writeFileRequestSchema,
  readFileRequestSchema,
  exposePortRequestSchema,
  unexposePortRequestSchema,
} from './schemas';
import type { ZodType } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHono = Hono<any>;

function resolveSandbox(c: Context): SandboxLike {
  const env = c.env as Env;
  const name = c.req.param('name')!;
  // getSandbox returns the concrete Sandbox; SandboxLike is the structural
  // subset the handlers touch.
  //
  // Local dev only: keepAlive stops `wrangler dev` from idle-stopping the
  // container mid-turn (which would make the harness bridge's preview URL
  // "stale"). Gated on LOCAL_KEEP_ALIVE so production keeps its default,
  // self-sleeping lifecycle.
  const options = env.LOCAL_KEEP_ALIVE ? { keepAlive: true } : undefined;
  return getSandbox(env.Sandbox, name, options) as unknown as SandboxLike;
}

async function parseBody<T>(
  c: Context,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return {
      ok: false,
      response: c.json({ error: 'Invalid JSON body' }, 400),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: c.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        400,
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Register the control-plane routes on `app`, each protected by `requireAdminToken`.
 * Additive — does not touch the existing /beancount-stream surface.
 */
export function registerControlPlaneRoutes(
  app: AnyHono,
  requireAdminToken: MiddlewareHandler,
): void {
  const base = '/control/sandbox/:name';

  // create + resume: idempotent ensure-exists.
  app.post(`${base}/ensure`, requireAdminToken, async (c: Context) => {
    const result = await ensureSandbox(resolveSandbox(c), c.req.param('name')!);
    return c.json(result);
  });

  app.post(`${base}/exec`, requireAdminToken, async (c: Context) => {
    const parsed = await parseBody(c, execRequestSchema);
    if (!parsed.ok) return parsed.response;
    return c.json(await execCommand(resolveSandbox(c), parsed.data));
  });

  app.post(`${base}/spawn`, requireAdminToken, async (c: Context) => {
    const parsed = await parseBody(c, spawnRequestSchema);
    if (!parsed.ok) return parsed.response;
    return c.json(await spawnProcess(resolveSandbox(c), parsed.data));
  });

  // Streaming process logs — the bridge output relay. Raw byte stream; the
  // request's abort signal propagates to the SDK so a disconnect stops the read.
  app.get(
    `${base}/process/:processId/logs`,
    requireAdminToken,
    async (c: Context) => {
      const stream = await streamProcessLogs(
        resolveSandbox(c),
        c.req.param('processId')!,
        c.req.raw.signal,
      );
      return new Response(stream, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      });
    },
  );

  app.get(
    `${base}/process/:processId/status`,
    requireAdminToken,
    async (c: Context) => {
      return c.json(
        await getProcessStatus(resolveSandbox(c), c.req.param('processId')!),
      );
    },
  );

  app.post(
    `${base}/process/:processId/kill`,
    requireAdminToken,
    async (c: Context) => {
      const parsed = await parseBody(c, killRequestSchema);
      if (!parsed.ok) return parsed.response;
      return c.json(
        await killProcess(
          resolveSandbox(c),
          c.req.param('processId')!,
          parsed.data.signal,
        ),
      );
    },
  );

  app.post(`${base}/write`, requireAdminToken, async (c: Context) => {
    const parsed = await parseBody(c, writeFileRequestSchema);
    if (!parsed.ok) return parsed.response;
    return c.json(await writeFile(resolveSandbox(c), parsed.data));
  });

  app.post(`${base}/read`, requireAdminToken, async (c: Context) => {
    const parsed = await parseBody(c, readFileRequestSchema);
    if (!parsed.ok) return parsed.response;
    return c.json(await readFile(resolveSandbox(c), parsed.data));
  });

  app.post(`${base}/expose`, requireAdminToken, async (c: Context) => {
    const parsed = await parseBody(c, exposePortRequestSchema);
    if (!parsed.ok) return parsed.response;
    return c.json(await exposePort(resolveSandbox(c), parsed.data));
  });

  app.post(`${base}/unexpose`, requireAdminToken, async (c: Context) => {
    const parsed = await parseBody(c, unexposePortRequestSchema);
    if (!parsed.ok) return parsed.response;
    return c.json(await unexposePort(resolveSandbox(c), parsed.data.port));
  });

  app.get(`${base}/exposed`, requireAdminToken, async (c: Context) => {
    const hostname = c.req.query('hostname');
    if (!hostname) {
      return c.json({ error: 'hostname query param is required' }, 400);
    }
    return c.json(await getExposedPorts(resolveSandbox(c), hostname));
  });

  app.post(`${base}/stop`, requireAdminToken, async (c: Context) => {
    return c.json(await stopSandbox(resolveSandbox(c)));
  });

  app.post(`${base}/destroy`, requireAdminToken, async (c: Context) => {
    return c.json(await destroySandbox(resolveSandbox(c)));
  });
}
