import { DomainError, ErrorCategory } from "@/shared/errors";

/**
 * One shape for every MCP failure (w2/m28:t003).
 *
 * The field audit found four dialects in one session: `{ok:false,error:"…"}`
 * text from the tools' own error boundary, bare text with no
 * `structuredContent` for a pin violation, JSON-RPC `-32602` carrying a Zod
 * array dump, and `-32603` for both not-found and forbidden on resources —
 * the last of those double-prefixed, because the SDK's `McpError` stamps
 * `MCP error <code>:` onto the message it is given and the client stamps it
 * again on receipt.
 *
 * An agent cannot branch on four dialects. This module is the one translator:
 * a `DomainError` category becomes a machine `code`, a message, and a `hint`
 * naming the next call to make, and a resource failure additionally becomes
 * the right JSON-RPC code with the message left unprefixed so exactly one
 * prefix survives the round trip.
 */

/** What every MCP refusal carries, on tools and resources alike. */
export interface McpErrorEnvelope {
  /** Machine code an agent branches on — an {@link ErrorCategory} value. */
  readonly code: string;
  readonly message: string;
  /** The next thing to do about it. Never empty. */
  readonly hint: string;
  /** Seconds to wait, present only for `RATE_LIMITED`. */
  readonly retryAfter?: number;
}

/**
 * JSON-RPC codes for resource failures.
 *
 * `-32002` is MCP's convention for a resource that does not exist. `-32003`
 * is an unassigned implementation-defined code used here for a refusal the
 * caller cannot fix by changing the request. `-32000` is the generic
 * implementation-defined server error the JSON-RPC spec reserves; the SDK
 * also uses that number *client-side* for `ConnectionClosed`, which it raises
 * locally and never receives in a response, so `data.code` below — not the
 * number — is what an agent should branch on.
 */
export const JSON_RPC_INVALID_PARAMS = -32602;
export const JSON_RPC_NOT_FOUND = -32002;
export const JSON_RPC_FORBIDDEN = -32003;
export const JSON_RPC_SERVER_ERROR = -32000;

const JSON_RPC_BY_CATEGORY: Partial<Record<ErrorCategory, number>> = {
  [ErrorCategory.BAD_USER_INPUT]: JSON_RPC_INVALID_PARAMS,
  [ErrorCategory.VALIDATION_FAILED]: JSON_RPC_INVALID_PARAMS,
  [ErrorCategory.UNBALANCED]: JSON_RPC_INVALID_PARAMS,
  [ErrorCategory.NOT_FOUND]: JSON_RPC_NOT_FOUND,
  [ErrorCategory.FORBIDDEN]: JSON_RPC_FORBIDDEN,
  [ErrorCategory.UNAUTHENTICATED]: JSON_RPC_FORBIDDEN,
  [ErrorCategory.OPERATION_NOT_ALLOWED]: JSON_RPC_FORBIDDEN,
  [ErrorCategory.PREMIUM_REQUIRED]: JSON_RPC_FORBIDDEN,
  [ErrorCategory.RESOURCE_LIMIT_REACHED]: JSON_RPC_FORBIDDEN,
};

/** The JSON-RPC code a machine code travels under. */
export function jsonRpcCodeFor(code: string): number {
  return JSON_RPC_BY_CATEGORY[code as ErrorCategory] ?? JSON_RPC_SERVER_ERROR;
}

/**
 * The fallback hint per category: what to do when the message itself does not
 * name something more specific.
 */
const CATEGORY_HINTS: Record<ErrorCategory, string> = {
  [ErrorCategory.UNAUTHENTICATED]:
    "Re-authenticate: complete the OAuth flow again, or use an API key that is still live.",
  [ErrorCategory.FORBIDDEN]:
    "This credential lacks the authority for that operation. Check `beancount://{owner}/{name}/metadata` for your permission on the ledger.",
  [ErrorCategory.NOT_FOUND]:
    "Confirm the target exists: `listLedgers` for ledgers, `listLedgerFiles` or `beancount://{owner}/{name}/source-files` for files.",
  [ErrorCategory.BAD_USER_INPUT]:
    "Fix the named argument and call again; `tools/list` publishes each tool's input schema.",
  [ErrorCategory.VALIDATION_FAILED]:
    "Fix the named field and call again; `tools/list` publishes each tool's input schema.",
  [ErrorCategory.CONFLICT]:
    "Re-read the current state and retry with fresh values — `getEntryContext` returns the entry's current `sha256sum`.",
  [ErrorCategory.RATE_LIMITED]:
    "Wait `retryAfter` seconds before the next call. Reads have a much larger budget than writes; batch writes rather than looping.",
  [ErrorCategory.INTERNAL_SERVER_ERROR]:
    "Retry once. If it persists the failure is server-side and changing the request will not help.",
  [ErrorCategory.SERVICE_UNAVAILABLE]:
    "A dependency is down. Retry with backoff; this is not a problem with the request.",
  [ErrorCategory.RESOURCE_LIMIT_REACHED]:
    "The account is at its plan limit for this resource. Remove something, or upgrade the plan.",
  [ErrorCategory.OPERATION_NOT_ALLOWED]:
    "The ledger's current state forbids this operation; read its metadata before retrying.",
  [ErrorCategory.UNBALANCED]:
    "Postings do not sum to zero. Add the missing posting, elide one amount, or pass `allowInvalid: true` to record it deliberately.",
  [ErrorCategory.CONFIGURATION_ERROR]:
    "The deployment is missing configuration this operation needs. Nothing about the request will fix it.",
  [ErrorCategory.PREMIUM_REQUIRED]:
    "This operation needs a paid plan on the account the credential belongs to.",
};

/**
 * Zod's prose, reduced to the field that is wrong.
 *
 * The SDK hands a validation failure over as the whole issue array
 * pretty-printed — a screenful per bad argument. What an agent needs is which
 * argument and why, so the path is kept and the dump is dropped.
 */
function compactZodMessage(message: string): string | undefined {
  const trimmed = message.trim();
  if (!trimmed.startsWith("[") && !trimmed.includes('"path"')) return undefined;
  try {
    const issues = JSON.parse(
      trimmed.slice(trimmed.indexOf("[")),
    ) as (unknown & { path?: unknown[]; message?: string })[];
    if (!Array.isArray(issues) || issues.length === 0) return undefined;
    return issues
      .map((issue) => {
        const path = Array.isArray(issue.path) ? issue.path.join(".") : "";
        return path ? `${path}: ${issue.message}` : String(issue.message);
      })
      .join("; ");
  } catch {
    return undefined;
  }
}

/** The envelope for a thrown failure, whatever threw it. */
export function envelopeFromThrown(error: unknown): McpErrorEnvelope {
  if (error instanceof DomainError) {
    const metadata = error.metadata as
      { hint?: unknown; retryAfter?: unknown } | undefined;
    // The throw site's own hint wins; the category fallback is what a
    // refusal that has nothing more specific to say still carries (w2/013).
    const hint =
      typeof metadata?.hint === "string"
        ? metadata.hint
        : CATEGORY_HINTS[error.category];
    return {
      code: error.category,
      message: error.message,
      hint,
      ...(typeof metadata?.retryAfter === "number" && {
        retryAfter: metadata.retryAfter,
      }),
    };
  }
  const raw = error instanceof Error ? error.message : String(error);
  const compacted = compactZodMessage(raw);
  if (compacted) {
    return {
      code: ErrorCategory.BAD_USER_INPUT,
      message: compacted,
      hint: CATEGORY_HINTS[ErrorCategory.BAD_USER_INPUT],
    };
  }
  const category = categoryForMessage(raw);
  return { code: category, message: raw, hint: CATEGORY_HINTS[category] };
}

/**
 * The category for a failure that arrived as prose only.
 *
 * A plain `Error` from a tool's own guard — `No such file in …` and friends —
 * still has to say something an agent can branch on.
 */
function categoryForMessage(message: string): ErrorCategory {
  return /no such file|not found/i.test(message)
    ? ErrorCategory.NOT_FOUND
    : ErrorCategory.INTERNAL_SERVER_ERROR;
}

/**
 * The envelope for a failure a tool *returned* rather than threw, and whatever
 * else that failure carried.
 *
 * `runToolSafely` is the tools' error boundary: it catches and returns
 * `{ok:false, error}`, so the class of the original throw is gone by the time
 * the MCP boundary sees it. The boundary therefore preserves the category and
 * hint alongside the message, and this reads them back.
 *
 * Splitting is one operation rather than two because the carrier fields
 * (`errorCode`, `errorHint`, `retryAfter`) must not also travel on as loose
 * fields — and a caller that had to remember to strip them would eventually
 * forget.
 */
export function splitToolFailure(result: Record<string, unknown>): {
  envelope: McpErrorEnvelope;
  /** Everything the failure carried besides its error, for the wire. */
  rest: Record<string, unknown>;
} {
  const {
    ok: _ok,
    error,
    errorCode,
    errorHint,
    retryAfter,
    ...rest
  } = result as {
    ok?: unknown;
    error?: unknown;
    errorCode?: unknown;
    errorHint?: unknown;
    retryAfter?: unknown;
  } & Record<string, unknown>;
  const message = typeof error === "string" ? error : "The tool failed.";
  const code =
    typeof errorCode === "string" ? errorCode : categoryForMessage(message);
  return {
    envelope: {
      code,
      message,
      hint:
        typeof errorHint === "string"
          ? errorHint
          : (CATEGORY_HINTS[code as ErrorCategory] ??
            CATEGORY_HINTS[ErrorCategory.INTERNAL_SERVER_ERROR]),
      ...(typeof retryAfter === "number" && { retryAfter }),
    },
    rest,
  };
}

/**
 * A resource failure, in the one form the SDK serializes without adding a
 * prefix of its own.
 *
 * The protocol layer reads `code`, `message`, and `data` straight off the
 * thrown value, so a plain `Error` carrying a numeric `code` produces the
 * JSON-RPC error we want. Throwing the SDK's `McpError` instead would stamp
 * `MCP error <code>:` onto the message here, and the client stamps it again on
 * receipt — which is precisely the double prefix the audit reported.
 */
export class McpResourceFailure extends Error {
  readonly code: number;
  readonly data: McpErrorEnvelope;

  constructor(envelope: McpErrorEnvelope) {
    super(envelope.message);
    this.name = "McpResourceFailure";
    this.code = jsonRpcCodeFor(envelope.code);
    this.data = envelope;
  }
}

/** Render an envelope as the text block beside the structured one. */
export function renderErrorText(envelope: McpErrorEnvelope): string {
  const retry =
    envelope.retryAfter !== undefined
      ? `\nRetry after: ${envelope.retryAfter}s`
      : "";
  return `${envelope.code}: ${envelope.message}\nHint: ${envelope.hint}${retry}`;
}
