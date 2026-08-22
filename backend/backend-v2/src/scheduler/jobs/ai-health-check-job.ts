import { logger } from "@/shared/logger";
import { generateGiteaUrl } from "@/shared/gitea-utils";
import { CACHE_KEYS, TTL } from "@/shared/cache";
import type { JobFactory } from "../types";

const jobLogger = logger.child({ module: "AiHealthCheckJob" });

export const AI_HEALTH_CHECK_CACHE_KEY = CACHE_KEYS.ai.healthStatus();

const CANARY_LEDGER = "open_ledger/example";
const CANARY_QUESTION = "What accounts exist in this ledger?";
const TIMEOUT_MS = 150_000; // 2.5 minutes

export interface AiHealthCheckResult {
  status: "healthy" | "unhealthy" | "unchecked";
  latency_ms: number;
  lastChecked: string;
  error?: string;
}

export const createAiHealthCheckJob: JobFactory = (layers, config) => {
  return {
    schedule: "*/30 * * * *", // Every 30 minutes
    task: async () => {
      const start = Date.now();
      let result: AiHealthCheckResult;

      try {
        const { httpUrl } = generateGiteaUrl(config.gitea, CANARY_LEDGER);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          const giteaAuth = `${config.favaApi.adminUser}:${config.favaApi.adminPassword}`;

          const res = await fetch(
            `${config.claudeCodeSandbox.apiUrl}/beancount-stream`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-admin-token": config.adminToken,
              },
              body: JSON.stringify({
                repo: httpUrl,
                githubToken: giteaAuth,
                task: CANARY_QUESTION,
                mode: "ASK",
                conversationId: "health-check-canary",
              }),
              signal: controller.signal,
            },
          );

          if (!res.ok) {
            result = {
              status: "unhealthy",
              latency_ms: Date.now() - start,
              lastChecked: new Date().toISOString(),
              error: `HTTP ${res.status}`,
            };
          } else {
            result = await parseSseResponse(res, start);
          }
        } finally {
          clearTimeout(timeout);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isAbort =
          error instanceof DOMException && error.name === "AbortError";

        result = {
          status: "unhealthy",
          latency_ms: Date.now() - start,
          lastChecked: new Date().toISOString(),
          error: isAbort ? "timeout" : errorMessage,
        };
      }

      // cacheHelper.set is fail-open and logs its own errors.
      await layers.clients.cacheHelper.set(
        AI_HEALTH_CHECK_CACHE_KEY,
        result,
        TTL.HOUR_2,
      );
      jobLogger.info("AI health check completed", {
        status: result.status,
        latency_ms: result.latency_ms,
      });
    },
  };
};

/**
 * Parses an SSE stream from the Claude Code Sandbox.
 *
 * The sandbox sends proper SSE events with both `event:` and `data:` lines:
 *   event: completed
 *   data: {"type":"completed","message":"...","progress":100,"logs":"...","isQuestion":true}
 *
 * We need to wait for a `completed` event with non-empty `logs` to confirm
 * the AI actually analyzed the ledger — intermediate events like `executing`
 * also carry `logs` but don't prove completion. An `error` event means failure.
 */
async function parseSseResponse(
  res: Response,
  start: number,
): Promise<AiHealthCheckResult> {
  const reader = res.body?.getReader();
  if (!reader) {
    return {
      status: "unhealthy",
      latency_ms: Date.now() - start,
      lastChecked: new Date().toISOString(),
      error: "No response body",
    };
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEventType = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        // Track the event type from `event:` lines
        if (line.startsWith("event:")) {
          currentEventType = line.slice(6).trim();
          continue;
        }

        // Skip comments (keepalives) and non-data lines
        if (!line.startsWith("data:")) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;

        try {
          const data = JSON.parse(jsonStr);
          // Use `type` field from data payload, fall back to the `event:` line
          const eventType = data.type || currentEventType;

          if (eventType === "error" || data.error) {
            reader.cancel();
            return {
              status: "unhealthy",
              latency_ms: Date.now() - start,
              lastChecked: new Date().toISOString(),
              error: String(data.error || data.message || "Unknown error"),
            };
          }

          if (eventType === "completed" && data.logs) {
            reader.cancel();
            return {
              status: "healthy",
              latency_ms: Date.now() - start,
              lastChecked: new Date().toISOString(),
            };
          }
        } catch {
          // Skip non-JSON data lines
        }

        // Reset event type after processing its data line
        currentEventType = "";
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    status: "unhealthy",
    latency_ms: Date.now() - start,
    lastChecked: new Date().toISOString(),
    error: "Stream ended without a completed event",
  };
}
