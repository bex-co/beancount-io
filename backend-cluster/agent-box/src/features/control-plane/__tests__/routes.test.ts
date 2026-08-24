import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Context, Next } from 'hono';

// Mock getSandbox to return a controllable stub.
const mockSandbox = {
  exec: vi.fn().mockResolvedValue({
    success: true,
    exitCode: 0,
    stdout: '/workspace',
    stderr: '',
    command: 'echo',
    duration: 1,
  }),
  startProcess: vi.fn().mockResolvedValue({ id: 'proc_1', pid: 7 }),
  streamProcessLogs: vi.fn().mockResolvedValue(new ReadableStream()),
  getProcess: vi
    .fn()
    .mockResolvedValue({ id: 'proc_1', status: 'running', exitCode: undefined }),
  killProcess: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue({ success: true }),
  readFile: vi.fn().mockResolvedValue({ success: true, content: 'x' }),
  exposePort: vi
    .fn()
    .mockResolvedValue({ url: 'https://4000-x.example.com', port: 4000, name: undefined }),
  unexposePort: vi.fn().mockResolvedValue(undefined),
  getExposedPorts: vi.fn().mockResolvedValue([]),
  stop: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@cloudflare/sandbox', () => ({
  Sandbox: vi.fn(),
  getSandbox: vi.fn(() => mockSandbox),
  proxyToSandbox: vi.fn(() => Promise.resolve(null)),
}));

import { registerControlPlaneRoutes } from '../index';

// Admin-token middleware mirroring the real one: rejects without the header.
const requireAdminToken = async (c: Context, next: Next) => {
  if (c.req.header('x-admin-token') !== 'secret') {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};

function buildApp() {
  const app = new Hono();
  registerControlPlaneRoutes(app, requireAdminToken);
  return app;
}

const auth = { 'x-admin-token': 'secret', 'Content-Type': 'application/json' };
const env = { Sandbox: {}, TASK_MANAGER: {}, ADMIN_TOKEN: 'secret' };

describe('control-plane routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects requests without the admin token', async () => {
    const app = buildApp();
    const res = await app.request(
      '/control/sandbox/conv_1/ensure',
      { method: 'POST' },
      env,
    );
    expect(res.status).toBe(401);
    expect(mockSandbox.exec).not.toHaveBeenCalled();
  });

  it('ensure returns id + default workdir', async () => {
    const app = buildApp();
    const res = await app.request(
      '/control/sandbox/conv_1/ensure',
      { method: 'POST', headers: auth },
      env,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: 'conv_1',
      defaultWorkingDirectory: '/workspace',
      ports: [],
    });
    expect(mockSandbox.exec).toHaveBeenCalledWith('pwd');
  });

  it('exec validates the body and forwards to the sandbox', async () => {
    const app = buildApp();
    const res = await app.request(
      '/control/sandbox/conv_1/exec',
      { method: 'POST', headers: auth, body: JSON.stringify({ command: 'ls' }) },
      env,
    );
    expect(res.status).toBe(200);
    expect(mockSandbox.exec).toHaveBeenCalledWith('ls', {
      cwd: undefined,
      env: undefined,
      timeout: undefined,
    });
  });

  it('exec rejects an empty command with 400', async () => {
    const app = buildApp();
    const res = await app.request(
      '/control/sandbox/conv_1/exec',
      { method: 'POST', headers: auth, body: JSON.stringify({ command: '' }) },
      env,
    );
    expect(res.status).toBe(400);
    expect(mockSandbox.exec).not.toHaveBeenCalled();
  });

  it('expose validates port range', async () => {
    const app = buildApp();
    const bad = await app.request(
      '/control/sandbox/conv_1/expose',
      {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ port: 80, hostname: 'example.com' }),
      },
      env,
    );
    expect(bad.status).toBe(400);

    const good = await app.request(
      '/control/sandbox/conv_1/expose',
      {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ port: 4000, hostname: 'example.com' }),
      },
      env,
    );
    expect(good.status).toBe(200);
    expect(await good.json()).toEqual({
      url: 'https://4000-x.example.com',
      port: 4000,
    });
  });

  it('exposed requires the hostname query param', async () => {
    const app = buildApp();
    const res = await app.request(
      '/control/sandbox/conv_1/exposed',
      { method: 'GET', headers: auth },
      env,
    );
    expect(res.status).toBe(400);
  });

  it('process logs returns a streaming response', async () => {
    const app = buildApp();
    const res = await app.request(
      '/control/sandbox/conv_1/process/proc_1/logs',
      { method: 'GET', headers: auth },
      env,
    );
    expect(res.status).toBe(200);
    // The DO RPC boundary cannot serialize an AbortSignal, so the control plane
    // calls streamProcessLogs WITHOUT forwarding one.
    expect(mockSandbox.streamProcessLogs).toHaveBeenCalledWith('proc_1');
  });

  it('stop and destroy are wired', async () => {
    const app = buildApp();
    const stop = await app.request(
      '/control/sandbox/conv_1/stop',
      { method: 'POST', headers: auth },
      env,
    );
    expect(stop.status).toBe(200);
    expect(mockSandbox.stop).toHaveBeenCalled();

    const destroy = await app.request(
      '/control/sandbox/conv_1/destroy',
      { method: 'POST', headers: auth },
      env,
    );
    expect(destroy.status).toBe(200);
    expect(mockSandbox.destroy).toHaveBeenCalled();
  });
});
