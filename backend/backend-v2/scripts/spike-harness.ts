import "dotenv/config";

/**
 * m17/t006 live spike — does HarnessAgent + claudeCode + our Cloudflare provider
 * actually run Claude in the container and stream an answer back over the bridge?
 *
 * Run on the HOST (not Docker) so `*.localhost` preview URLs resolve to
 * 127.0.0.1 → wrangler dev → proxyToSandbox → container bridge:
 *   npx tsx -r tsconfig-paths/register scripts/spike-harness.ts
 *
 * Prereqs: worker `wrangler dev --port 8788` up; llm-cli-proxy on :4322.
 */

import { createCloudflareSandbox } from "@/foundation/sandbox-cloudflare";
import { HarnessAgent } from "@ai-sdk/harness/agent";
import { createClaudeCode } from "@ai-sdk/harness-claude-code";

const ADMIN_TOKEN = process.env.SANDBOX_ADMIN_TOKEN ?? process.env.ADMIN_TOKEN ?? "";
// The container reaches the host's llm-cli-proxy via the host LAN IP.
const PROXY = process.env.SPIKE_ANTHROPIC_BASE_URL ?? "http://192.168.4.49:4322";
const MODEL = process.env.SPIKE_MODEL ?? "claude-sonnet-4-5-20250929";

function log(m: string, x?: unknown) {
  // eslint-disable-next-line no-console
  console.log(`[spike] ${m}`, x ?? "");
}

async function main() {
  if (!ADMIN_TOKEN) throw new Error("ADMIN_TOKEN required");

  const sandbox = createCloudflareSandbox({
    controlPlaneUrl: "http://localhost:8788",
    adminToken: ADMIN_TOKEN,
    previewHostname: "localhost:8788",
  });

  const agent = new HarnessAgent({
    harness: createClaudeCode({
      model: MODEL,
      auth: "direct",
      // The bridge listens on this port in the container; our provider exposes
      // it via getPortEndpoint so the harness host can connect.
      port: 8080,
      env: {
        ANTHROPIC_BASE_URL: PROXY,
        ANTHROPIC_API_KEY: "dummy",
      },
    }),
    sandbox,
    permissionMode: "allow-reads",
    instructions: "You are a helpful assistant running in a sandbox.",
    sandboxConfig: {
      onSession: async ({ session }) => {
        await session.writeTextFile({
          path: "/workspace/hello.txt",
          content: "The secret number is 42.",
        });
      },
    },
  });

  const t0 = Date.now();
  log("creating session");
  const session = await agent.createSession({ sessionId: `spike-${process.pid}` });
  log("session ready, streaming", { ms: Date.now() - t0 });

  const result = await agent.stream({
    prompt: "Read /workspace/hello.txt and tell me the secret number.",
    session,
  });

  let text = "";
  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      const delta = (part as { text?: string; textDelta?: string }).text ??
        (part as { textDelta?: string }).textDelta ?? "";
      text += delta;
      process.stdout.write(delta);
    } else if (part.type === "error") {
      log("STREAM ERROR", (part as { error?: unknown }).error);
    }
  }
  process.stdout.write("\n");
  log("done", { ms: Date.now() - t0, gotSecret: text.includes("42") });
  log(text.includes("42") ? "SPIKE OK" : "SPIKE INCOMPLETE (no '42' in answer)");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[spike] FAILED:", err);
  process.exit(1);
});
