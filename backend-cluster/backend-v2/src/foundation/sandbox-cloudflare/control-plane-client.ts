/**
 * HTTP client for the claude-code-sandbox worker's control-plane routes
 * (backend-cluster/claude-code-sandbox-worker/src/features/control-plane). Each
 * method is one `POST/GET /control/sandbox/:name/*` call, authenticated with the
 * shared admin token. This is the Node half of the self-built harness sandbox
 * provider (ADR 0005, decision (b)): backend-v2 cannot call `getSandbox()`
 * itself (no Worker DO binding), so it drives the worker over HTTP.
 */

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface ControlPlaneClientOptions {
  /** Base URL of the worker, e.g. http://host.docker.internal:8788 */
  baseUrl: string;
  /** Shared admin token (x-admin-token). */
  adminToken: string;
  /** Injectable fetch (defaults to global fetch) — for tests. */
  fetchImpl?: FetchLike;
}

export interface ExecResultWire {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string;
  duration: number;
}

export interface EnsureResultWire {
  id: string;
  defaultWorkingDirectory: string;
  ports: number[];
}

export interface ProcessStatusWire {
  status: string;
  exitCode: number | null;
  found: boolean;
}

class ControlPlaneError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = "ControlPlaneError";
  }
}

export class ControlPlaneClient {
  private readonly baseUrl: string;
  private readonly adminToken: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: ControlPlaneClientOptions) {
    // Trailing slash would double up against the leading slash of each path.
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.adminToken = options.adminToken;
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  private url(name: string, suffix: string): string {
    return `${this.baseUrl}/control/sandbox/${encodeURIComponent(name)}${suffix}`;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-admin-token": this.adminToken,
    };
  }

  private async postJson<T>(
    name: string,
    suffix: string,
    body?: unknown,
    abortSignal?: AbortSignal,
  ): Promise<T> {
    const res = await this.fetchImpl(this.url(name, suffix), {
      method: "POST",
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: abortSignal,
    });
    return this.readJson<T>(res, suffix);
  }

  private async getJson<T>(name: string, suffix: string): Promise<T> {
    const res = await this.fetchImpl(this.url(name, suffix), {
      method: "GET",
      headers: { "x-admin-token": this.adminToken },
    });
    return this.readJson<T>(res, suffix);
  }

  private async readJson<T>(res: Response, suffix: string): Promise<T> {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ControlPlaneError(
        `Control plane ${suffix} failed: ${res.status}`,
        res.status,
        text.slice(0, 500),
      );
    }
    return (await res.json()) as T;
  }

  ensure(name: string, abortSignal?: AbortSignal): Promise<EnsureResultWire> {
    return this.postJson(name, "/ensure", undefined, abortSignal);
  }

  exec(
    name: string,
    req: {
      command: string;
      cwd?: string;
      env?: Record<string, string>;
      timeout?: number;
    },
    abortSignal?: AbortSignal,
  ): Promise<ExecResultWire> {
    return this.postJson(name, "/exec", req, abortSignal);
  }

  spawn(
    name: string,
    req: { command: string; cwd?: string; env?: Record<string, string> },
    abortSignal?: AbortSignal,
  ): Promise<{ processId: string; pid?: number }> {
    return this.postJson(name, "/spawn", req, abortSignal);
  }

  /**
   * Open the raw combined-log byte stream for a running process. Returns the
   * Response so the caller can consume `.body`; a non-2xx throws.
   */
  async streamProcessLogs(
    name: string,
    processId: string,
    abortSignal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    const res = await this.fetchImpl(
      this.url(name, `/process/${encodeURIComponent(processId)}/logs`),
      {
        method: "GET",
        headers: { "x-admin-token": this.adminToken },
        signal: abortSignal,
      },
    );
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new ControlPlaneError(
        `Control plane process logs failed: ${res.status}`,
        res.status,
        text.slice(0, 500),
      );
    }
    return res.body;
  }

  processStatus(name: string, processId: string): Promise<ProcessStatusWire> {
    return this.getJson(
      name,
      `/process/${encodeURIComponent(processId)}/status`,
    );
  }

  killProcess(
    name: string,
    processId: string,
    signal?: string,
  ): Promise<{ ok: true }> {
    return this.postJson(
      name,
      `/process/${encodeURIComponent(processId)}/kill`,
      {
        signal,
      },
    );
  }

  writeFile(
    name: string,
    req: { path: string; content: string; encoding?: string },
    abortSignal?: AbortSignal,
  ): Promise<{ ok: true }> {
    return this.postJson(name, "/write", req, abortSignal);
  }

  readFile(
    name: string,
    req: { path: string; encoding?: string },
    abortSignal?: AbortSignal,
  ): Promise<{ exists: boolean; content?: string }> {
    return this.postJson(name, "/read", req, abortSignal);
  }

  exposePort(
    name: string,
    req: { port: number; hostname: string; name?: string; token?: string },
  ): Promise<{ url: string; port: number }> {
    return this.postJson(name, "/expose", req);
  }

  unexposePort(name: string, port: number): Promise<{ ok: true }> {
    return this.postJson(name, "/unexpose", { port });
  }

  getExposedPorts(
    name: string,
    hostname: string,
  ): Promise<{ ports: Array<{ url: string; port: number }> }> {
    return this.getJson(
      name,
      `/exposed?hostname=${encodeURIComponent(hostname)}`,
    );
  }

  stop(name: string): Promise<{ ok: true }> {
    return this.postJson(name, "/stop");
  }

  destroy(name: string): Promise<{ ok: true }> {
    return this.postJson(name, "/destroy");
  }
}
