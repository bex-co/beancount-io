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
 * Only the generic case earns a retry button. Retrying a quota refusal earns
 * another refusal, and a deployment with no AI model configured answers 503
 * CONFIGURATION_ERROR before streaming until its operator sets a key, so
 * those show a notice instead.
 */
export type AgentErrorKind = "quota" | "auth" | "notConfigured" | "generic";

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error ?? "");

export function classifyAgentError(error: unknown): AgentErrorKind {
  const message = errorText(error);
  if (agentConfigurationError(error)) return "notConfigured";
  if (/RATE_LIMITED|\b429\b/.test(message)) return "quota";
  if (/UNAUTHENTICATED|\b401\b|\b403\b/.test(message)) return "auth";
  return "generic";
}

/** Whether the failure is worth offering a retry for. */
export function isRetryable(error: unknown): boolean {
  return classifyAgentError(error) === "generic";
}

/**
 * The server's own sentence and operator hint from a CONFIGURATION_ERROR
 * envelope, `{"ok":false,"error":{"code":"CONFIGURATION_ERROR","message":"…",
 * "metadata":{"hint":"…"}}}`, or `null` for any other failure. The hint names
 * the environment variables to set, so it is shown as sent.
 */
export function agentConfigurationError(
  error: unknown,
): { message: string; hint?: string } | null {
  const body = errorText(error)
    .trim()
    .replace(/^Error:\s*/, "");
  const start = body.indexOf("{");
  if (start < 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.slice(start));
  } catch {
    return null;
  }
  const envelope = parsed as {
    error?: {
      code?: unknown;
      message?: unknown;
      metadata?: unknown;
      hint?: unknown;
    };
  } | null;
  const inner = envelope?.error;
  if (!inner || inner.code !== "CONFIGURATION_ERROR") return null;
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;
  const metadata = inner.metadata as { hint?: unknown } | null | undefined;
  return {
    message: text(inner.message) ?? "",
    hint: text(metadata?.hint) ?? text(inner.hint),
  };
}

/** The server's message and hint as one line, each ending in punctuation. */
export function configurationErrorDetail({
  message,
  hint,
}: {
  message: string;
  hint?: string;
}): string {
  return [message, hint]
    .filter((part): part is string => Boolean(part))
    .map((part) => (/[.!?)]$/.test(part) ? part : `${part}.`))
    .join(" ");
}
