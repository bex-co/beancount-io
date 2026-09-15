import { spawn } from "node:child_process";

export interface BoundedRun {
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly cancelled: boolean;
  readonly limitReason: string | null;
  readonly spawnError: string | null;
  readonly stdout: string;
  /** The last few kilobytes of stderr, for explaining a run that produced nothing. */
  readonly stderrTail: string;
  readonly elapsedMs: number;
}

interface BoundedOptions {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly timeoutMs: number;
  /** How long a stopped client gets between SIGTERM and SIGKILL. */
  readonly graceMs?: number;
  /** Inspect each stdout line; returning a reason stops the run. */
  readonly onLine?: (line: string) => string | null;
  readonly signal?: AbortSignal;
}

const STDERR_TAIL = 4000;

/**
 * Runs one client in its own process group so a timeout, a limit, or Ctrl-C
 * stops everything it started — coding-agent CLIs spawn helpers, and killing
 * only the leader leaves those running.
 */
export function runBounded(options: BoundedOptions): Promise<BoundedRun> {
  return new Promise((resolve) => {
    const started = Date.now();
    let stdout = "";
    let stderrTail = "";
    let pending = "";
    let timedOut = false;
    let cancelled = false;
    let limitReason: string | null = null;
    let spawnError: string | null = null;
    let killTimer: NodeJS.Timeout | undefined;
    let settled = false;

    const child = spawn(options.command, [...options.args], {
      cwd: options.cwd,
      env: options.env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const signalGroup = (signal: NodeJS.Signals) => {
      if (!child.pid) return;
      try {
        process.kill(-child.pid, signal);
      } catch {
        // The group is already gone.
      }
    };
    const stop = () => {
      if (killTimer) return;
      signalGroup("SIGTERM");
      killTimer = setTimeout(() => signalGroup("SIGKILL"), options.graceMs ?? 5000);
    };
    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, options.timeoutMs);
    const onAbort = () => {
      cancelled = true;
      stop();
    };
    if (options.signal?.aborted) onAbort();
    else options.signal?.addEventListener("abort", onAbort, { once: true });

    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (killTimer) {
        clearTimeout(killTimer);
        // Helpers that ignored SIGTERM outlive their leader; a stopped run takes them too.
        signalGroup("SIGKILL");
      }
      options.signal?.removeEventListener("abort", onAbort);
      if (pending) options.onLine?.(pending);
      resolve({
        exitCode,
        timedOut,
        cancelled,
        limitReason,
        spawnError,
        stdout,
        stderrTail,
        elapsedMs: Date.now() - started,
      });
    };

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      pending += text;
      let newline: number;
      while ((newline = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, newline);
        pending = pending.slice(newline + 1);
        const reason = options.onLine?.(line);
        if (reason && !limitReason) {
          limitReason = reason;
          stop();
        }
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_TAIL);
    });
    child.on("error", (error) => {
      spawnError = error.message;
      finish(null);
    });
    child.on("close", (code) => finish(code));
  });
}
