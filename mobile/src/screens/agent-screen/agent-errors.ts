/**
 * Classifying a failed turn.
 *
 * The agent route reports failures as a JSON envelope, not as a stream frame:
 * `{"ok":false,"error":{"code":"RATE_LIMITED","message":"…"}}` (captured live in
 * w1/m32/t001). The AI SDK surfaces a non-2xx response as an `Error` whose
 * message carries that body, so classification reads the code out of the text
 * rather than depending on SDK internals — which keeps this a pure function the
 * unit runner can exercise.
 *
 * Only the quota case is special: retrying a request the server just refused
 * for quota produces another refusal, so that one offers the upgrade path
 * instead of a retry button.
 */
export type AgentErrorKind = "quota" | "auth" | "generic";

export function classifyAgentError(error: unknown): AgentErrorKind {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/RATE_LIMITED|\b429\b/.test(message)) return "quota";
  if (/UNAUTHENTICATED|\b401\b|\b403\b/.test(message)) return "auth";
  return "generic";
}

/** Whether the failure is worth offering a retry for. */
export function isRetryable(error: unknown): boolean {
  return classifyAgentError(error) === "generic";
}
