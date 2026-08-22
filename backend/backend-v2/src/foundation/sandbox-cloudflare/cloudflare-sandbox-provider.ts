/**
 * Self-built HarnessV1SandboxProvider backed by the claude-code-sandbox worker
 * (ADR 0005, decision (b) — the piece upstream tracks as `@ai-sdk/sandbox-cloudflare`
 * in cloudflare/agents#1829). Every method is an HTTP call to the worker's
 * control plane; the harness framework only ever sees the standard contract.
 *
 * Contract types are vendored (see ./harness-contract) until the ai@7 migration
 * (m17/t004) makes the real `@ai-sdk/harness` package installable.
 */

import { ControlPlaneClient, type FetchLike } from './control-plane-client';
import type {
  HarnessV1SandboxProvider,
  HarnessV1NetworkSandboxSession,
  HarnessV1PortEndpoint,
  SandboxSession,
  SandboxProcess,
  SandboxProcessOptions,
  ReadFileOptions,
  WriteFileOptions,
} from './harness-contract';

export interface CloudflareSandboxOptions {
  /** Worker base URL, e.g. http://host.docker.internal:8788 */
  controlPlaneUrl: string;
  /** Shared admin token. */
  adminToken: string;
  /**
   * The worker's public hostname, used to construct exposePort preview URLs
   * (`exposePort(port, { hostname })`). In local dev this is the wrangler-dev
   * host; in production the worker's domain.
   */
  previewHostname: string;
  /** Injectable fetch (tests). */
  fetchImpl?: FetchLike;
  /** Injectable id generator for prewarm sessions without a sessionId (tests). */
  idGenerator?: () => string;
  /** Poll interval (ms) for spawn().wait(). */
  waitPollIntervalMs?: number;
}

// Marker file written after onFirstCreate succeeds. Its presence means this
// physical container has already been bootstrapped (repo cloned), so a later
// createSession against the same live container skips re-cloning. If the
// container is destroyed and recreated under the same name, the marker is gone
// and onFirstCreate runs again — exactly the "once per fresh create" semantic.
const BOOTSTRAP_MARKER = '.harness-session-initialized';

const DEFAULT_WAIT_POLL_MS = 750;

function isTerminalStatus(status: string): boolean {
  return (
    status === 'completed' ||
    status === 'failed' ||
    status === 'killed' ||
    status === 'error' ||
    status === 'unknown'
  );
}

async function collectStream(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

function bytesToStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (bytes.byteLength > 0) controller.enqueue(bytes);
      controller.close();
    },
  });
}

function emptyStream(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close();
    },
  });
}

function sliceLines(
  content: string,
  startLine?: number,
  endLine?: number,
): string {
  if (startLine === undefined && endLine === undefined) return content;
  const lines = content.split('\n');
  const start = startLine ? Math.max(1, startLine) - 1 : 0;
  const end = endLine ? endLine : lines.length;
  return lines.slice(start, end).join('\n');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the SandboxSession surface (file I/O + run/spawn) for one sandbox `name`.
 * Both the network session and its `restricted()` view share this.
 */
function buildSandboxSession(
  client: ControlPlaneClient,
  name: string,
  defaultWorkingDirectory: string,
  waitPollIntervalMs: number,
): SandboxSession {
  const run: SandboxSession['run'] = async (options: SandboxProcessOptions) => {
    const res = await client.exec(
      name,
      {
        command: options.command,
        cwd: options.workingDirectory,
        env: options.env,
      },
      options.abortSignal,
    );
    return { exitCode: res.exitCode, stdout: res.stdout, stderr: res.stderr };
  };

  const spawn: SandboxSession['spawn'] = async (
    options: SandboxProcessOptions,
  ): Promise<SandboxProcess> => {
    const { processId, pid } = await client.spawn(
      name,
      {
        command: options.command,
        cwd: options.workingDirectory,
        env: options.env,
      },
      options.abortSignal,
    );

    // The control-plane log stream is combined stdout+stderr; we surface it all
    // as stdout and leave stderr empty. The harness bridge adapter reads the
    // in-sandbox WebSocket (an exposed port), not these streams, so combined
    // logs are sufficient for bridge-ready detection and diagnostics.
    const stdout = await client.streamProcessLogs(
      name,
      processId,
      options.abortSignal,
    );

    return {
      pid,
      stdout,
      stderr: emptyStream(),
      wait: async () => {
        for (;;) {
          if (options.abortSignal?.aborted) {
            await client.killProcess(name, processId).catch(() => undefined);
            throw new Error('spawn wait aborted');
          }
          const status = await client.processStatus(name, processId);
          if (isTerminalStatus(status.status)) {
            return { exitCode: status.exitCode ?? 0 };
          }
          await delay(waitPollIntervalMs);
        }
      },
      kill: async () => {
        await client.killProcess(name, processId);
      },
    };
  };

  return {
    description: `Cloudflare Sandbox (name=${name}, cwd=${defaultWorkingDirectory})`,

    readFile: async (options: ReadFileOptions) => {
      const res = await client.readFile(
        name,
        { path: options.path, encoding: 'base64' },
        options.abortSignal,
      );
      if (!res.exists || res.content === undefined) return null;
      return bytesToStream(base64ToBytes(res.content));
    },

    readBinaryFile: async (options: ReadFileOptions) => {
      const res = await client.readFile(
        name,
        { path: options.path, encoding: 'base64' },
        options.abortSignal,
      );
      if (!res.exists || res.content === undefined) return null;
      return base64ToBytes(res.content);
    },

    readTextFile: async (options) => {
      const res = await client.readFile(
        name,
        { path: options.path, encoding: options.encoding ?? 'utf-8' },
        options.abortSignal,
      );
      if (!res.exists || res.content === undefined) return null;
      return sliceLines(res.content, options.startLine, options.endLine);
    },

    writeFile: async (options: WriteFileOptions<ReadableStream<Uint8Array>>) => {
      const bytes = await collectStream(options.content);
      await client.writeFile(
        name,
        { path: options.path, content: bytesToBase64(bytes), encoding: 'base64' },
        options.abortSignal,
      );
    },

    writeBinaryFile: async (options: WriteFileOptions<Uint8Array>) => {
      await client.writeFile(
        name,
        {
          path: options.path,
          content: bytesToBase64(options.content),
          encoding: 'base64',
        },
        options.abortSignal,
      );
    },

    writeTextFile: async (options) => {
      await client.writeFile(
        name,
        {
          path: options.path,
          content: options.content,
          encoding: options.encoding ?? 'utf-8',
        },
        options.abortSignal,
      );
    },

    run,
    spawn,
  };
}

function mapPortProtocol(url: string, protocol?: 'http' | 'https' | 'ws'): string {
  if (protocol === 'ws') {
    return url.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  }
  if (protocol === 'http') {
    return url.replace(/^https:/, 'http:');
  }
  return url;
}

/**
 * Local-dev exposePort target. In production the control plane is
 * `https://<worker>.workers.dev` and exposePort preview URLs are real
 * `https://<port>-<id>-<token>.<worker>.workers.dev` names that resolve over
 * public DNS. In local dev the control plane is a plaintext `wrangler dev`
 * (e.g. `http://host.docker.internal:8788`), and the CF sandbox lib emits an
 * unreachable preview URL: it only keeps the usable `http://…:<port>` shape for
 * `isLocalhostPattern()` hosts, so `host.docker.internal` falls to the `https`
 * branch — https to a plaintext port, and the `:8788` in the passed hostname
 * collapses the subdomain routing entirely. We detect this case and rewrite the
 * bridge URL back to `http://<sub>.host.docker.internal:<port>` (the dnsmasq
 * sidecar in `_infra-mac` resolves `*.host.docker.internal` to the host gateway).
 */
interface LocalBridge {
  /** Bare hostname (no port) passed to exposePort so the subdomain survives. */
  hostname: string;
  /** Control-plane port folded back into the preview URL (wrangler dev port). */
  port: string;
}

function isLocalPreviewHost(hostname: string): boolean {
  return (
    hostname === 'host.docker.internal' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost')
  );
}

/** Derive local-bridge rewrite info from the control-plane URL, or undefined in prod. */
function computeLocalBridge(controlPlaneUrl: string): LocalBridge | undefined {
  try {
    const u = new URL(controlPlaneUrl);
    // Only plaintext, local hosts are the broken case; https/workers.dev is fine.
    if (u.protocol !== 'http:' || !isLocalPreviewHost(u.hostname)) {
      return undefined;
    }
    return { hostname: u.hostname, port: u.port || '80' };
  } catch {
    return undefined;
  }
}

/** Force the exposePort preview URL back to reachable `http://<sub>:<port>`. */
function rewriteLocalBridgeUrl(rawUrl: string, local: LocalBridge): string {
  try {
    const u = new URL(rawUrl);
    u.protocol = 'http:';
    u.port = local.port;
    return u.toString();
  } catch {
    return rawUrl;
  }
}

function buildNetworkSession(
  client: ControlPlaneClient,
  name: string,
  ensure: { id: string; defaultWorkingDirectory: string; ports: number[] },
  previewHostname: string,
  waitPollIntervalMs: number,
  localBridge?: LocalBridge,
): HarnessV1NetworkSandboxSession {
  const base = buildSandboxSession(
    client,
    name,
    ensure.defaultWorkingDirectory,
    waitPollIntervalMs,
  );

  // In local dev call exposePort with the bare hostname (no port) so the CF
  // sandbox lib keeps the `<port>-<id>-<token>` subdomain; otherwise use the
  // configured preview hostname (bare workers.dev host in prod).
  const exposeHostname = localBridge?.hostname ?? previewHostname;

  const getPortEndpoint = async (opts: {
    port: number;
    protocol?: 'http' | 'https' | 'ws';
  }): Promise<HarnessV1PortEndpoint> => {
    const exposed = await client.exposePort(name, {
      port: opts.port,
      hostname: exposeHostname,
    });
    const url = localBridge
      ? rewriteLocalBridgeUrl(exposed.url, localBridge)
      : exposed.url;
    return { url: mapPortProtocol(url, opts.protocol) };
  };

  return {
    ...base,
    id: ensure.id,
    defaultWorkingDirectory: ensure.defaultWorkingDirectory,
    ports: ensure.ports,
    getPortEndpoint,
    getPortUrl: async (opts) => (await getPortEndpoint(opts)).url,
    stop: async () => {
      await client.stop(name);
    },
    destroy: async () => {
      await client.destroy(name);
    },
    setPorts: async (ports) => {
      // Full-replacement semantics: expose the requested set. We do not track a
      // prior set to unexpose here — the harness only grows the set for the
      // bridge port, and container teardown drops all forwards.
      for (const port of ports) {
        await client.exposePort(name, { port, hostname: exposeHostname });
      }
    },
    // setNetworkPolicy / set|addRequestTransformations intentionally omitted:
    // no Cloudflare primitive backs them (ADR 0005). The adapter falls back to
    // direct credential forwarding, which is what today's sandbox path does.
    restricted: () =>
      buildSandboxSession(
        client,
        name,
        ensure.defaultWorkingDirectory,
        waitPollIntervalMs,
      ),
  };
}

/**
 * Construct a Cloudflare-backed HarnessV1SandboxProvider. Module-scope, no I/O:
 * the sandbox is created (or resumed) when the harness calls createSession().
 */
export function createCloudflareSandbox(
  options: CloudflareSandboxOptions,
): HarnessV1SandboxProvider {
  const client = new ControlPlaneClient({
    baseUrl: options.controlPlaneUrl,
    adminToken: options.adminToken,
    fetchImpl: options.fetchImpl,
  });
  const previewHostname = options.previewHostname;
  const localBridge = computeLocalBridge(options.controlPlaneUrl);
  const generateId = options.idGenerator ?? (() => crypto.randomUUID());
  const waitPollIntervalMs = options.waitPollIntervalMs ?? DEFAULT_WAIT_POLL_MS;

  // The sandbox name becomes the container's preview-URL subdomain, and
  // Cloudflare rejects uppercase sandbox IDs there (DNS is case-insensitive).
  // conversationIds are base58 and DO contain uppercase, so lowercase the name
  // consistently — the same conversationId still maps to the same container.
  const toName = (id: string): string => id.toLowerCase();

  return {
    specificationVersion: 'harness-sandbox-v1',
    providerId: 'cloudflare-sandbox',

    createSession: async (opts) => {
      const name = toName(opts?.sessionId ?? generateId());
      const ensure = await client.ensure(name, opts?.abortSignal);
      const session = buildNetworkSession(
        client,
        name,
        ensure,
        previewHostname,
        waitPollIntervalMs,
        localBridge,
      );

      // Run onFirstCreate exactly once per physical container: gated on a marker
      // file so a resumed (still-live) container is not re-bootstrapped.
      if (opts?.onFirstCreate) {
        const markerPath = `${ensure.defaultWorkingDirectory}/${BOOTSTRAP_MARKER}`;
        const marker = await client.readFile(name, { path: markerPath });
        if (!marker.exists) {
          await opts.onFirstCreate(session.restricted(), {
            abortSignal: opts.abortSignal,
          });
          await client.writeFile(name, {
            path: markerPath,
            content: new Date().toISOString(),
            encoding: 'utf-8',
          });
        }
      }

      return session;
    },

    resumeSession: async (opts) => {
      const name = toName(opts.sessionId);
      const ensure = await client.ensure(name, opts.abortSignal);
      // Resume never runs onFirstCreate — the workspace is assumed intact.
      return buildNetworkSession(
        client,
        name,
        ensure,
        previewHostname,
        waitPollIntervalMs,
        localBridge,
      );
    },
  };
}
