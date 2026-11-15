import { ServerError } from "@apollo/client/errors";

/**
 * A feature the operator of this deployment has not set up (an LLM key,
 * object storage). The backend refuses it as CONFIGURATION_ERROR with a hint
 * naming the environment variables to set. It answers the same way until the
 * operator acts, so it is never a retry, never an upgrade and never an outage.
 */
export interface ConfigurationError {
  /** The server's sentence, e.g. "LLM is not configured on this deployment". */
  message: string;
  /** The operator instruction, shown verbatim, e.g. "Set ANTHROPIC_API_KEY…". */
  hint?: string;
}

const CODE = "CONFIGURATION_ERROR";

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * The REST envelope `{ ok: false, error: { code, message, metadata: { hint } } }`
 * (or the MCP-style `error.hint`), already parsed or as response text.
 */
function fromEnvelope(body: unknown): ConfigurationError | null {
  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed.startsWith("{")) return null;
    try {
      return fromEnvelope(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }
  if (!isRecord(body) || !isRecord(body.error)) return null;
  const { code, message, metadata, hint } = body.error;
  if (code !== CODE) return null;
  return {
    message: text(message) ?? "",
    hint: text(isRecord(metadata) ? metadata.hint : undefined) ?? text(hint),
  };
}

/**
 * Reads a CONFIGURATION_ERROR from a GraphQL refusal (`extensions.code`,
 * `extensions.hint`, in Apollo's CombinedGraphQLErrors or a bare `errors`
 * list), an Apollo server error carrying the REST envelope, the envelope
 * itself, or an Error whose message is the envelope's text (the AI SDK chat
 * transport throws a non-2xx response body that way). `null` for any other
 * error.
 */
export function getConfigurationError(
  error: unknown,
): ConfigurationError | null {
  // Apollo's CombinedGraphQLErrors and a bare `{ errors }` share this shape.
  const graphQLErrors: readonly unknown[] | null =
    isRecord(error) && Array.isArray(error.errors) ? error.errors : null;
  if (graphQLErrors) {
    for (const gqlError of graphQLErrors) {
      if (!isRecord(gqlError) || !isRecord(gqlError.extensions)) continue;
      if (gqlError.extensions.code !== CODE) continue;
      return {
        message: text(gqlError.message) ?? "",
        hint: text(gqlError.extensions.hint),
      };
    }
    return null;
  }
  if (ServerError.is(error)) return fromEnvelope(error.bodyText);
  if (error instanceof Error) return fromEnvelope(error.message);
  return fromEnvelope(error);
}

/** The server's message and hint as one line, each kept as sent. */
export function configurationErrorDetail({
  message,
  hint,
}: ConfigurationError): string {
  return [message, hint]
    .filter((part): part is string => Boolean(part))
    .map((part) => (/[.!?)]$/.test(part) ? part : `${part}.`))
    .join(" ");
}
