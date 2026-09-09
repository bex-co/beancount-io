import { generateText } from "ai";
import { logger } from "@/shared/logger";
import {
  createFallbackLanguageModel,
  isLlmConfigured,
} from "./fallback-language-model";

const probeLogger = logger.child({ module: "llm-probe" });

const PROBE_TIMEOUT_MS = 10_000;

export type LlmProbeResult =
  | { status: "skipped" }
  | { status: "ok"; latencyMs: number }
  | { status: "failed"; latencyMs: number; error: string };

/**
 * Synthetic Path B liveness probe (ADR 0011 D6, w2/m30/t005). A dead or
 * revoked provider credential otherwise stays invisible until a user hits
 * scan-receipt — which is exactly how a placeholder key survived in
 * production. This makes a trivial model call and reports the outcome to the
 * logs, distinguishing "not configured" (a legitimate, quiet state) from
 * "configured but broken" (a loud warning).
 *
 * Never throws: a probe is diagnostics, not a request path.
 */
export async function probeLlm(
  now: () => number = Date.now,
): Promise<LlmProbeResult> {
  if (!isLlmConfigured()) {
    probeLogger.info("LLM probe skipped — no provider configured");
    return { status: "skipped" };
  }

  const start = now();
  try {
    await generateText({
      model: createFallbackLanguageModel(),
      prompt: "Reply with the single word: ok",
      maxOutputTokens: 4,
      abortSignal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const latencyMs = now() - start;
    probeLogger.info("LLM probe ok", { latencyMs });
    return { status: "ok", latencyMs };
  } catch (error) {
    const latencyMs = now() - start;
    const message = error instanceof Error ? error.message : String(error);
    probeLogger.warn("LLM probe failed — AI features will not work", {
      latencyMs,
      error: message,
    });
    return { status: "failed", latencyMs, error: message };
  }
}

/**
 * Fire the probe once at startup without blocking boot. Fire-and-forget: the
 * result only reaches the logs.
 */
export function runStartupLlmProbe(): void {
  void probeLlm();
}
