/**
 * Harness sandbox-provider contract — now sourced from the REAL packages.
 *
 * backend-v2 is on ai@7 (m17/t004), so `@ai-sdk/harness` + `@ai-sdk/provider-utils`
 * are installed and this module re-exports their types directly. The provider
 * (cloudflare-sandbox-provider.ts) therefore type-checks against the actual
 * upstream contract — the conformance test is real, not against a mirror.
 *
 * The `HarnessV1*` types are exported from `@ai-sdk/harness`; the sandbox-session
 * types are exported from `@ai-sdk/provider-utils` as `Experimental_*`. The
 * per-call option types are internal upstream, so we derive them from the
 * session's own method signatures (single source of truth).
 */

import type {
  Experimental_SandboxSession,
  Experimental_SandboxProcess,
} from '@ai-sdk/provider-utils';
import type {
  HarnessV1SandboxProvider,
  HarnessV1NetworkSandboxSession,
  HarnessV1PortEndpoint,
} from '@ai-sdk/harness';

export type {
  HarnessV1SandboxProvider,
  HarnessV1NetworkSandboxSession,
  HarnessV1PortEndpoint,
};

export type SandboxSession = Experimental_SandboxSession;
export type SandboxProcess = Experimental_SandboxProcess;

// Option types are internal to provider-utils; derive them from the session's
// own method parameters so they stay locked to the real contract.
export type SandboxProcessOptions = Parameters<SandboxSession['run']>[0];
export type ReadFileOptions = Parameters<SandboxSession['readFile']>[0];
export type WriteFileOptions<CONTENT> = {
  path: string;
  content: CONTENT;
  abortSignal?: AbortSignal;
};
