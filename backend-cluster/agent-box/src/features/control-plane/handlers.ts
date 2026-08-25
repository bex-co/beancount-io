// Pure control-plane handlers: one thin function per @cloudflare/sandbox
// primitive. Each takes a Sandbox-like object plus a validated request and
// returns a plain JSON-serializable result. No Hono/HTTP concerns here so the
// wire contract can be unit-tested against a mock sandbox.
//
// This is the worker half of the self-built HarnessV1SandboxProvider (ADR 0005,
// decision (b)): backend-v2 (Node) cannot call getSandbox() itself because that
// needs a Worker DO binding, so it drives these routes over HTTP instead.

// The subset of `@cloudflare/sandbox`'s Sandbox we actually call. Kept
// structural (not an import of the concrete class) so tests pass a plain mock.
export interface SandboxLike {
  exec(
    command: string,
    options?: {
      cwd?: string;
      env?: Record<string, string | undefined>;
      timeout?: number;
    },
  ): Promise<{
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    command: string;
    duration: number;
  }>;
  startProcess(
    command: string,
    options?: {
      cwd?: string;
      env?: Record<string, string | undefined>;
    },
  ): Promise<{ id: string; pid?: number }>;
  streamProcessLogs(
    processId: string,
    options?: { signal?: AbortSignal },
  ): Promise<ReadableStream<Uint8Array>>;
  getProcess(
    id: string,
  ): Promise<{ id: string; status: string; exitCode?: number } | null>;
  killProcess(id: string, signal?: string): Promise<void>;
  writeFile(
    path: string,
    content: string,
    options?: { encoding?: string },
  ): Promise<unknown>;
  readFile(
    path: string,
    options?: { encoding?: string },
  ): Promise<{ success: boolean; content: string }>;
  exposePort(
    port: number,
    options: { hostname: string; name?: string; token?: string },
  ): Promise<{ url: string; port: number; name: string | undefined }>;
  unexposePort(port: number): Promise<void>;
  getExposedPorts(
    hostname: string,
  ): Promise<Array<{ url: string; port: number; status: 'active' }>>;
  stop(): Promise<void>;
  destroy(): Promise<void>;
}

// Fallback if the live container does not report a working directory.
export const DEFAULT_WORKING_DIRECTORY = '/workspace';

export interface EnsureResult {
  id: string;
  defaultWorkingDirectory: string;
  ports: number[];
}

// create/resume both land here: getSandbox(ns, name) is idempotent by name, so
// "ensure the container for this session exists" is a cheap exec that also boots
// the container. We use `pwd` rather than ping() because the Sandbox DO stub
// does NOT expose ping() over RPC (verified live 2026-08-19), and it lets us
// read the real working directory instead of hardcoding it (harness contract:
// defaultWorkingDirectory is read from the live sandbox). The name IS the
// harness sessionId — that is what makes cross-process resume a second ensure.
export async function ensureSandbox(
  sandbox: SandboxLike,
  name: string,
): Promise<EnsureResult> {
  const res = await sandbox.exec('pwd');
  const cwd = res.stdout.trim();
  return {
    id: name,
    defaultWorkingDirectory: cwd || DEFAULT_WORKING_DIRECTORY,
    ports: [],
  };
}

export interface ExecRequest {
  command: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
  timeout?: number;
}

export interface ExecResultWire {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string;
  duration: number;
}

export async function execCommand(
  sandbox: SandboxLike,
  req: ExecRequest,
): Promise<ExecResultWire> {
  const res = await sandbox.exec(req.command, {
    cwd: req.cwd,
    env: req.env,
    timeout: req.timeout,
  });
  return {
    success: res.success,
    exitCode: res.exitCode,
    stdout: res.stdout,
    stderr: res.stderr,
    command: res.command,
    duration: res.duration,
  };
}

export interface SpawnRequest {
  command: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
}

export interface SpawnResultWire {
  processId: string;
  pid?: number;
}

export async function spawnProcess(
  sandbox: SandboxLike,
  req: SpawnRequest,
): Promise<SpawnResultWire> {
  const proc = await sandbox.startProcess(req.command, {
    cwd: req.cwd,
    env: req.env,
  });
  return { processId: proc.id, pid: proc.pid };
}

// Streams a running process's combined stdout/stderr as raw bytes. This is the
// only non-trivial route: the harness bridge's output relay rides on it. The
// caller (Node provider) is responsible for turning a dropped stream into a
// failed read rather than a silent hang.
export async function streamProcessLogs(
  sandbox: SandboxLike,
  processId: string,
  _signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  // NOTE: do not forward the HTTP request's AbortSignal into the Durable Object
  // call — an AbortSignal is not structured-cloneable across the DO RPC boundary
  // (DataCloneError: "AbortSignal serialization is not enabled"). The stream ends
  // when the process exits or the client disconnects.
  return sandbox.streamProcessLogs(processId);
}

export interface ProcessStatusWire {
  status: string;
  exitCode: number | null;
  // The process id is unknown to the SDK's registry once cleaned up; report it
  // as "unknown" so the Node provider can stop polling instead of hanging.
  found: boolean;
}

export async function getProcessStatus(
  sandbox: SandboxLike,
  processId: string,
): Promise<ProcessStatusWire> {
  const proc = await sandbox.getProcess(processId);
  if (!proc) return { status: 'unknown', exitCode: null, found: false };
  return {
    status: proc.status,
    exitCode: proc.exitCode ?? null,
    found: true,
  };
}

export async function killProcess(
  sandbox: SandboxLike,
  processId: string,
  signal?: string,
): Promise<{ ok: true }> {
  await sandbox.killProcess(processId, signal);
  return { ok: true };
}

export interface WriteFileRequest {
  path: string;
  content: string;
  encoding?: string;
}

// Harness contract: file writes "create parent directories recursively and
// overwrite any existing file". The SDK's writeFile is a plain shell redirect
// and fails with ENOENT on a missing parent, so ensure the directory first.
export async function writeFile(
  sandbox: SandboxLike,
  req: WriteFileRequest,
): Promise<{ ok: true }> {
  const dir = posixDirname(req.path);
  if (dir !== '' && dir !== '/' && dir !== '.') {
    await sandbox.exec(`mkdir -p ${singleQuote(dir)}`);
  }
  await sandbox.writeFile(req.path, req.content, { encoding: req.encoding });
  return { ok: true };
}

function posixDirname(path: string): string {
  const idx = path.lastIndexOf('/');
  if (idx < 0) return '';
  if (idx === 0) return '/';
  return path.slice(0, idx);
}

function singleQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export interface ReadFileRequest {
  path: string;
  encoding?: string;
}

export interface ReadFileResultWire {
  exists: boolean;
  content?: string;
}

// A missing file must surface as { exists: false } (→ null in the harness
// contract), NOT as a 500. Classify by explicit signals — the SDK either
// returns success:false or throws a not-found-shaped error — and rethrow
// anything that is not clearly a missing file so real errors stay loud.
export async function readFile(
  sandbox: SandboxLike,
  req: ReadFileRequest,
): Promise<ReadFileResultWire> {
  try {
    const res = await sandbox.readFile(req.path, { encoding: req.encoding });
    if (!res.success) return { exists: false };
    return { exists: true, content: res.content };
  } catch (err) {
    if (isFileNotFound(err)) return { exists: false };
    throw err;
  }
}

function isFileNotFound(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /no such file|not found|enoent|does not exist/i.test(message);
}

export interface ExposePortRequest {
  port: number;
  hostname: string;
  name?: string;
  token?: string;
}

export interface ExposePortResultWire {
  url: string;
  port: number;
}

export async function exposePort(
  sandbox: SandboxLike,
  req: ExposePortRequest,
): Promise<ExposePortResultWire> {
  const res = await sandbox.exposePort(req.port, {
    hostname: req.hostname,
    name: req.name,
    token: req.token,
  });
  return { url: res.url, port: res.port };
}

export async function unexposePort(
  sandbox: SandboxLike,
  port: number,
): Promise<{ ok: true }> {
  await sandbox.unexposePort(port);
  return { ok: true };
}

export async function getExposedPorts(
  sandbox: SandboxLike,
  hostname: string,
): Promise<{ ports: Array<{ url: string; port: number }> }> {
  const exposed = await sandbox.getExposedPorts(hostname);
  return { ports: exposed.map((p) => ({ url: p.url, port: p.port })) };
}

export async function stopSandbox(
  sandbox: SandboxLike,
): Promise<{ ok: true }> {
  await sandbox.stop();
  return { ok: true };
}

// destroy() must tolerate an already-stopped or never-created sandbox (harness
// contract: idempotent, handles both running and previously-stopped).
export async function destroySandbox(
  sandbox: SandboxLike,
): Promise<{ ok: true }> {
  await sandbox.destroy();
  return { ok: true };
}
