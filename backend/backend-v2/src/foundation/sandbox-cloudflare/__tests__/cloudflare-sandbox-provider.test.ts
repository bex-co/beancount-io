import { createCloudflareSandbox } from '../cloudflare-sandbox-provider';
import type { FetchLike } from '../control-plane-client';

interface RecordedCall {
  method: string;
  path: string; // suffix after /control/sandbox/:name
  name: string;
  body?: unknown;
}

/**
 * Build a fetch stub that routes on the control-plane path suffix. `overrides`
 * lets a test change one route's response (e.g. marker read → exists).
 */
function makeFetch(
  calls: RecordedCall[],
  overrides: Record<string, (body: unknown) => unknown> = {},
): FetchLike {
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  return async (input, init) => {
    const url = new URL(input);
    // /control/sandbox/<name>/<suffix...>
    const m = url.pathname.match(/^\/control\/sandbox\/([^/]+)(\/.*)$/);
    const name = m ? decodeURIComponent(m[1]) : '';
    const suffix = m ? m[2] : url.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, path: suffix.split('?')[0], name, body });

    // Per-route override key: "<suffix without query>"
    const key = suffix.split('?')[0];
    if (overrides[key]) return json(overrides[key](body));

    if (suffix.endsWith('/ensure')) {
      return json({ id: name, defaultWorkingDirectory: '/workspace', ports: [] });
    }
    if (suffix.endsWith('/exec')) {
      return json({
        success: true,
        exitCode: 0,
        stdout: 'exec-out',
        stderr: '',
        command: (body as { command: string }).command,
        duration: 3,
      });
    }
    if (suffix.endsWith('/spawn')) {
      return json({ processId: 'proc_1', pid: 99 });
    }
    if (suffix.includes('/process/') && suffix.endsWith('/logs')) {
      return new Response(
        new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(new TextEncoder().encode('log-line\n'));
            c.close();
          },
        }),
      );
    }
    if (suffix.includes('/process/') && suffix.endsWith('/status')) {
      return json({ status: 'completed', exitCode: 0, found: true });
    }
    if (suffix.endsWith('/read')) {
      return json({ exists: false });
    }
    if (suffix.endsWith('/write')) {
      return json({ ok: true });
    }
    if (suffix.endsWith('/expose')) {
      const port = (body as { port: number }).port;
      return json({ url: `https://${port}-abc.example.com`, port });
    }
    if (suffix.endsWith('/stop') || suffix.endsWith('/destroy')) {
      return json({ ok: true });
    }
    return json({ error: 'unhandled', suffix }, 500);
  };
}

function provider(fetchImpl: FetchLike, idGenerator = () => 'gen-id') {
  return createCloudflareSandbox({
    controlPlaneUrl: 'http://worker:8788',
    adminToken: 'tok',
    previewHostname: 'example.com',
    fetchImpl,
    idGenerator,
    waitPollIntervalMs: 1,
  });
}

describe('createCloudflareSandbox', () => {
  it('createSession ensures by sessionId and reports id + workdir', async () => {
    const calls: RecordedCall[] = [];
    const session = await provider(makeFetch(calls)).createSession({
      sessionId: 'conv_1',
    });
    expect(session.id).toBe('conv_1');
    expect(session.defaultWorkingDirectory).toBe('/workspace');
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/ensure', name: 'conv_1' });
  });

  it('lowercases the sandbox name (CF preview URLs reject uppercase ids)', async () => {
    const calls: RecordedCall[] = [];
    // base58 conversationIds contain uppercase; the container name must be lowercased.
    await provider(makeFetch(calls)).createSession({ sessionId: 'conv_JRwkRitaFJ3E' });
    expect(calls[0].name).toBe('conv_jrwkritafj3e');
  });

  it('createSession without sessionId falls back to the id generator', async () => {
    const calls: RecordedCall[] = [];
    await provider(makeFetch(calls), () => 'prewarm-xyz').createSession();
    expect(calls[0].name).toBe('prewarm-xyz');
  });

  it('runs onFirstCreate once when the marker is absent, then writes the marker', async () => {
    const calls: RecordedCall[] = [];
    const onFirstCreate = jest.fn(async () => {});
    await provider(makeFetch(calls)).createSession({
      sessionId: 'conv_1',
      onFirstCreate,
    });
    expect(onFirstCreate).toHaveBeenCalledTimes(1);
    // Marker read then marker write to /workspace/.harness-session-initialized
    const writes = calls.filter((c) => c.path === '/write');
    expect(writes).toHaveLength(1);
    expect((writes[0].body as { path: string }).path).toBe(
      '/workspace/.harness-session-initialized',
    );
  });

  it('skips onFirstCreate when the marker already exists (resumed container)', async () => {
    const calls: RecordedCall[] = [];
    const onFirstCreate = jest.fn(async () => {});
    const fetchImpl = makeFetch(calls, {
      '/read': () => ({ exists: true, content: '2026-01-01' }),
    });
    await provider(fetchImpl).createSession({
      sessionId: 'conv_1',
      onFirstCreate,
    });
    expect(onFirstCreate).not.toHaveBeenCalled();
    expect(calls.some((c) => c.path === '/write')).toBe(false);
  });

  it('resumeSession ensures without ever running onFirstCreate', async () => {
    const calls: RecordedCall[] = [];
    const p = provider(makeFetch(calls));
    const session = await p.resumeSession!({ sessionId: 'conv_1' });
    expect(session.id).toBe('conv_1');
    expect(calls.filter((c) => c.path === '/ensure')).toHaveLength(1);
    expect(calls.some((c) => c.path === '/read')).toBe(false);
  });

  it('run maps exec to { exitCode, stdout, stderr }', async () => {
    const calls: RecordedCall[] = [];
    const session = await provider(makeFetch(calls)).createSession({
      sessionId: 'conv_1',
    });
    const result = await session.run({ command: 'git clone x', workingDirectory: '/workspace' });
    expect(result).toEqual({ exitCode: 0, stdout: 'exec-out', stderr: '' });
    const exec = calls.find((c) => c.path === '/exec');
    expect(exec?.body).toMatchObject({ command: 'git clone x', cwd: '/workspace' });
  });

  it('readTextFile returns null for a missing file and content when present', async () => {
    const callsMissing: RecordedCall[] = [];
    const missing = await provider(makeFetch(callsMissing)).createSession({
      sessionId: 'c',
    });
    expect(await missing.readTextFile({ path: '/workspace/x' })).toBeNull();

    const callsPresent: RecordedCall[] = [];
    const present = await provider(
      makeFetch(callsPresent, {
        '/read': () => ({ exists: true, content: 'a\nb\nc' }),
      }),
    ).createSession({ sessionId: 'c' });
    expect(await present.readTextFile({ path: '/workspace/x' })).toBe('a\nb\nc');
    // Line slicing applied client-side
    expect(
      await present.readTextFile({ path: '/workspace/x', startLine: 2, endLine: 3 }),
    ).toBe('b\nc');
  });

  it('writeTextFile posts content + encoding', async () => {
    const calls: RecordedCall[] = [];
    const session = await provider(makeFetch(calls)).createSession({
      sessionId: 'c',
    });
    await session.writeTextFile({ path: '/workspace/a.txt', content: 'hi' });
    const write = calls.find(
      (c) => c.path === '/write' && (c.body as { path: string }).path === '/workspace/a.txt',
    );
    expect(write?.body).toMatchObject({ content: 'hi', encoding: 'utf-8' });
  });

  it('readBinaryFile round-trips base64 bytes', async () => {
    const original = new Uint8Array([1, 2, 3, 250]);
    const b64 = Buffer.from(original).toString('base64');
    const session = await provider(
      makeFetch([], { '/read': () => ({ exists: true, content: b64 }) }),
    ).createSession({ sessionId: 'c' });
    const bytes = await session.readBinaryFile({ path: '/x' });
    expect(Array.from(bytes!)).toEqual([1, 2, 3, 250]);
  });

  it('getPortEndpoint exposes the port and rewrites scheme for ws', async () => {
    const calls: RecordedCall[] = [];
    const session = await provider(makeFetch(calls)).createSession({
      sessionId: 'conv_1',
    });
    const https = await session.getPortEndpoint({ port: 4000 });
    expect(https.url).toBe('https://4000-abc.example.com');
    const ws = await session.getPortEndpoint({ port: 4000, protocol: 'ws' });
    expect(ws.url).toBe('wss://4000-abc.example.com');
    const expose = calls.find((c) => c.path === '/expose');
    expect(expose?.body).toMatchObject({ port: 4000, hostname: 'example.com' });
  });

  it('spawn returns a process whose wait() polls status to completion', async () => {
    const calls: RecordedCall[] = [];
    const session = await provider(makeFetch(calls)).createSession({
      sessionId: 'conv_1',
    });
    const proc = await session.spawn({ command: 'node bridge.js' });
    expect(proc.pid).toBe(99);
    const { exitCode } = await proc.wait();
    expect(exitCode).toBe(0);
    expect(calls.some((c) => c.path.endsWith('/status'))).toBe(true);
    // stdout stream carries the combined logs
    const chunk = await proc.stdout.getReader().read();
    expect(new TextDecoder().decode(chunk.value)).toContain('log-line');
  });

  it('stop and destroy hit their routes', async () => {
    const calls: RecordedCall[] = [];
    const session = await provider(makeFetch(calls)).createSession({
      sessionId: 'conv_1',
    });
    await session.stop();
    await session.destroy!();
    expect(calls.some((c) => c.path === '/stop')).toBe(true);
    expect(calls.some((c) => c.path === '/destroy')).toBe(true);
  });
});
