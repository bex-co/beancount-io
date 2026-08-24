/**
 * AskAgentWorkflow — the harness-backed replacement for the SandboxAskAIHandler
 * path (ADR 0005 / m17). Owns HarnessAgent construction, session resolution,
 * the git-clone bootstrap, permission-mode mapping, and turning the harness
 * stream into a UIMessage SSE response. Harness types stay contained here; the
 * route only sees plain params + a Response (backend-v2 CLAUDE.md layering).
 */

import { HarnessAgent } from '@ai-sdk/harness/agent';
import { createACP, type ACPPermissionModeMapping } from '@ai-sdk/harness-acp';
import type { ToolSet } from 'ai';
import { generateGiteaUrl } from '@/shared/gitea-utils';
import type { GiteaConfig } from '@/config/config';
import { logger } from '@/shared/logger';
import {
  createCloudflareSandbox,
  type HarnessV1SandboxProvider,
} from '@/foundation/sandbox-cloudflare';
import { createOpenPullRequestTool } from './open-pull-request-tool';

const workflowLogger = logger.child({ module: 'ask-agent-workflow' });

/**
 * Pinned so a new upstream release cannot silently change the in-sandbox agent.
 * Bump deliberately.
 */
const CLAUDE_AGENT_ACP_VERSION = '0.70.0';

/**
 * harness permission mode → claude-agent-acp session mode id.
 *
 * The agent advertises: default | acceptEdits | plan | dontAsk (and `auto` on
 * models that support it), plus bypassPermissions when ALLOW_BYPASS (see
 * `env.IS_SANDBOX` below).
 * This mapping must preserve the ASK/AGENT split verbatim — it is the
 * product's trust boundary, not an implementation detail.
 */
export const ACP_PERMISSION_MODES = {
  'allow-reads': { type: 'session-mode', modeId: 'default' },
  'allow-edits': { type: 'session-mode', modeId: 'acceptEdits' },
  'allow-all': { type: 'session-mode', modeId: 'bypassPermissions' },
} as const satisfies ACPPermissionModeMapping;

// ASK = read-only Q&A; AGENT = may edit files (writes gated by the PR flow).
export type AskAgentMode = 'ask' | 'agent';

export interface AskAgentDeps {
  controlPlaneUrl: string;
  adminToken: string;
  gitea: GiteaConfig;
  /** Anthropic model id for the Claude Code harness. */
  model: string;
}

export interface AskAgentCommand {
  /** The user's latest message text. */
  prompt: string;
  /** owner/name; the ledger repo cloned into the sandbox. */
  ledgerId: string;
  ledgerOwner: string;
  ledgerName: string;
  ledgerUsername: string;
  ledgerPassword: string;
  /** Stable per-conversation id → sandbox container key + harness sessionId. */
  conversationId: string;
  mode: AskAgentMode;
  abortSignal?: AbortSignal;
  /**
   * Debits this turn's tokens against the caller's AI CFO quota. Optional so
   * spikes/tests can run unmetered; the route always supplies it.
   */
  recordTokenUsage?: (totalTokens: number) => Promise<void>;
}

const ASK_INSTRUCTIONS = `You are the Beancount.io ledger assistant. The user's plain-text accounting repo is cloned at the absolute path /workspace/repo (the main ledger is typically /workspace/repo/main.bean). Always work against /workspace/repo, not your current directory.
Answer questions about the ledger by reading files and running beancount/bean-query as needed. Do NOT modify files in ASK mode.`;

const AGENT_INSTRUCTIONS = `You are the Beancount.io ledger agent. The user's plain-text accounting repo is cloned at the absolute path /workspace/repo (the main ledger is typically /workspace/repo/main.bean). Always work against /workspace/repo, not your current directory.
When asked to change the books: read the relevant files first, make the edit, run bean-check to validate, commit on a new branch named claude/<short-slug> (never commit to main), and push. Report what you changed.`;

/**
 * Build an HTTPS(S) clone URL for the ledger repo with the user's Gitea
 * credentials embedded, so the in-sandbox `git clone` authenticates as the user.
 * Same credential source as the legacy SandboxAskAIHandler.
 */
export function buildAuthenticatedCloneUrl(
  gitea: GiteaConfig,
  ledgerId: string,
  username: string,
  password: string,
): string {
  const { httpUrl } = generateGiteaUrl(gitea, ledgerId);
  const creds = `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;
  return httpUrl.replace(/^(https?:\/\/)/, `$1${creds}@`);
}

export interface IAskAgentWorkflow {
  streamAnswer(command: AskAgentCommand): Promise<Response>;
}

export class AskAgentWorkflow implements IAskAgentWorkflow {
  private readonly provider: HarnessV1SandboxProvider;

  constructor(private readonly deps: AskAgentDeps) {
    this.provider = createCloudflareSandbox({
      controlPlaneUrl: deps.controlPlaneUrl,
      adminToken: deps.adminToken,
      // exposePort preview URLs are built against the worker's own host.
      previewHostname: hostOf(deps.controlPlaneUrl),
    });
  }

  async streamAnswer(command: AskAgentCommand): Promise<Response> {
    const cloneUrl = buildAuthenticatedCloneUrl(
      this.deps.gitea,
      command.ledgerId,
      command.ledgerUsername,
      command.ledgerPassword,
    );

    // In AGENT mode the model can open a Gitea PR from the branch it pushed;
    // ASK mode is read-only so it gets no mutating host tools.
    const tools: ToolSet | undefined =
      command.mode === 'agent'
        ? {
            openPullRequest: createOpenPullRequestTool({
              gitea: this.deps.gitea,
              ledgerOwner: command.ledgerOwner,
              ledgerName: command.ledgerName,
              ledgerUsername: command.ledgerUsername,
              ledgerPassword: command.ledgerPassword,
            }),
          }
        : undefined;

    const agent = new HarnessAgent({
      harness: createACP({
        harnessId: 'claude-agent-acp',
        // ACP is the driver so the agent is swappable (ADR 0005 修订 A). Pointing
        // this at codex-acp/gemini is a change to `source` + `executable`, not to
        // the call stack. The package is installed inside the sandbox, so it is
        // not a backend-v2 dependency; pin it for reproducible bootstraps.
        source: {
          type: 'npm-simple',
          packageName: '@agentclientprotocol/claude-agent-acp',
          packageVersion: CLAUDE_AGENT_ACP_VERSION,
        },
        executable: 'claude-agent-acp',
        modelId: this.deps.model,
        auth: 'direct',
        // Mirrors @ai-sdk/harness-claude-code's own split: secrets go through
        // credentialEnv, the non-secret gateway root through forwardEnv.
        credentialEnv: ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'],
        forwardEnv: ['ANTHROPIC_BASE_URL'],
        // claude-agent-acp only offers `bypassPermissions` when
        // `!IS_ROOT || IS_SANDBOX` (acp-agent.js: ALLOW_BYPASS). Our container
        // runs as root, so without this flag the allow-all mapping above would
        // name a mode the agent never advertises. We *are* an isolated,
        // ephemeral sandbox, which is exactly what the flag asserts.
        env: { IS_SANDBOX: '1' },
        permissionModeMapping: ACP_PERMISSION_MODES,
        // The bridge listens on this port inside the container; our provider
        // exposes it via getPortEndpoint. Avoid 39001 (the CF sandbox runtime's
        // own internal port) and 3000 (the container's default service).
        port: 8080,
      }),
      sandbox: this.provider,
      // ASK is a frictionless read-only Q&A surface: the sandbox is an isolated,
      // ephemeral clone with no mutating host tools and nothing is pushed, so the
      // agent's read/query tools (bash `find`, `bean-query`, file reads) auto-run
      // ('allow-all') instead of stalling on a per-command approval the ask UI
      // doesn't surface. AGENT keeps 'allow-edits' so edits/PRs stay human-gated.
      permissionMode: command.mode === 'agent' ? 'allow-edits' : 'allow-all',
      tools,
      instructions:
        command.mode === 'agent' ? AGENT_INSTRUCTIONS : ASK_INSTRUCTIONS,
      // Ensure the ledger repo is cloned before the agent runs. onSession fires
      // per session start; the clone is made idempotent (skip when repo/.git
      // already exists) so a reused/resumed container is not re-cloned. This is
      // the harness-native hook available in harness@1.0.74 (the version
      // harness-claude-code pins); it replaces the caller-owned-sandbox path.
      sandboxConfig: {
        onSession: async ({ session }) => {
          // Free the bridge port before the harness (re)spawns bridge.mjs. On a
          // resumed conversation the container is kept alive (LOCAL_KEEP_ALIVE),
          // so the previous turn's bridge is still listening on 8080 — the
          // harness respawns rather than reconnects, so a second turn would die
          // with EADDRINUSE ("bridge exited before becoming ready" → the user's
          // "Something went wrong"). Killing any stale bridge makes every turn
          // start clean; the on-disk bridge-state-dir preserves continuity.
          await session.run({
            command: "pkill -f bridge.mjs 2>/dev/null; sleep 1; true",
            workingDirectory: '/workspace',
          });
          const already = await session.run({
            command: 'test -d repo/.git && echo yes || echo no',
            workingDirectory: '/workspace',
          });
          if (already.stdout.trim() === 'yes') return;
          workflowLogger.debug('Cloning ledger into sandbox', {
            ledgerId: command.ledgerId,
          });
          const clone = await session.run({
            command: `git clone ${cloneUrl} repo`,
            workingDirectory: '/workspace',
          });
          if (clone.exitCode !== 0) {
            throw new Error(
              `git clone failed (exit ${clone.exitCode}): ${clone.stderr || clone.stdout}`,
            );
          }
        },
      },
    });

    const agentSession = await agent.createSession({
      sessionId: command.conversationId,
      abortSignal: command.abortSignal,
    });

    const result = await agent.stream({
      prompt: command.prompt,
      session: agentSession,
      abortSignal: command.abortSignal,
      // The route checks the quota before the turn; this is the matching debit.
      // Before this, the harness path checked and never debited — ask-agent
      // burned tokens for free (ADR 0005 修订 A).
      onFinish: async ({ totalUsage }) => {
        const totalTokens =
          (totalUsage?.inputTokens ?? 0) + (totalUsage?.outputTokens ?? 0);
        if (totalTokens === 0) {
          // ACP v1 carries no per-step usage, so a turn may report nothing.
          // Log it rather than debiting a bogus 0.
          workflowLogger.warn('Turn reported no token usage; nothing debited', {
            ledgerId: command.ledgerId,
            conversationId: command.conversationId,
          });
          return;
        }
        try {
          await command.recordTokenUsage?.(totalTokens);
        } catch (err) {
          // Never fail the user's answer over accounting.
          workflowLogger.error('Failed to record token usage', {
            ledgerId: command.ledgerId,
            totalTokens,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
