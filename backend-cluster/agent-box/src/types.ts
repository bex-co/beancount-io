// Core types for the sandbox control-plane worker.

import type { Sandbox } from '@cloudflare/sandbox';

// Cloudflare Workers ExecutionContext.
export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Environment bindings.
export interface Env {
  ADMIN_TOKEN: string;
  // eslint-disable-next-line no-undef
  Sandbox: DurableObjectNamespace<Sandbox>;
  // Local dev only (set in .dev.vars, never in production). `wrangler dev`
  // idle-stops the container between control-plane calls, which makes the
  // harness bridge's exposed-port preview URL "stale" mid-turn (the bridge
  // talks over the forwarded port, not the control plane, so the DO's activity
  // timer never renews). When truthy, sandboxes are created with keepAlive so
  // the container survives the whole turn.
  LOCAL_KEEP_ALIVE?: string;
}
