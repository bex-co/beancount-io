import Router, { RouterContext } from "@koa/router";
import { assertNoNulDeep } from "@/shared/assert-no-nul";
import { NUL_EXEMPT_PATHS } from "@/shared/nul-exempt-paths";
import type { ZodType } from "zod";
import { BadUserInputError, ValidationError } from "@/shared/errors";

/**
 * Runtime request validation from the same zod schemas that generate the spec
 * (ADR 0006 D8).
 *
 * The point is not that requests get validated — it is that the *same* schema
 * object does both jobs. A spec generated from one description and a handler
 * validating against another is two descriptions of one endpoint, and two
 * descriptions drift. Feeding one schema to `registerRoute` and to this
 * middleware makes the documented contract and the enforced contract the same
 * object, so they cannot disagree.
 */
export interface RequestSchemas {
  readonly params?: ZodType;
  readonly query?: ZodType;
  readonly body?: ZodType;
}

/** Where the parsed request lands, keyed so a handler reads it without re-parsing. */
interface ValidatedState {
  validated?: {
    params: unknown;
    query: unknown;
    body: unknown;
  };
}

/** The parsed request for this route, or empty objects when it declared none. */
export function validatedFromState(ctx: RouterContext): {
  params: unknown;
  query: unknown;
  body: unknown;
} {
  return (
    (ctx.state as ValidatedState).validated ?? {
      params: {},
      query: {},
      body: {},
    }
  );
}

function parseOrThrow(
  schema: ZodType | undefined,
  value: unknown,
  part: string,
) {
  if (!schema) return value ?? {};
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  // The first issue is the one a caller can act on; the rest usually follow
  // from it. `field` names the part and the path so a 400 says where to look
  // without echoing the value back — validation messages are logged, and a
  // rejected body can hold a credential.
  const issue = result.error.issues[0];
  const path = issue.path.length > 0 ? `${part}.${issue.path.join(".")}` : part;
  throw new ValidationError(path, issue.message);
}

const ENCODING_HINT =
  "Percent-encode each path segment and query value as UTF-8 (`encodeURIComponent`) and send it again.";

/** `decodeURIComponent`, or a refusal naming where the bad encoding was. */
function assertDecodes(raw: string, where: string): void {
  try {
    decodeURIComponent(raw);
  } catch {
    throw new BadUserInputError(
      `Invalid URI encoding in ${where}`,
      undefined,
      ENCODING_HINT,
    );
  }
}

/**
 * A path or query whose percent-encoding does not decode is refused (w1/201).
 * The framework keeps an invalid `%XX` literally and maps invalid UTF-8 to
 * U+FFFD, so a truncated or double-encoded filter reached the service as a
 * different value and answered an empty success. MCP refuses the same input
 * in a resource URI. Read from the raw request, since the parsed values have
 * already lost what was wrong.
 */
function assertWellEncoded(ctx: RouterContext): void {
  for (const segment of ctx.path.split("/")) {
    assertDecodes(segment, "request path");
  }
  if (!ctx.querystring) return;
  for (const pair of ctx.querystring.split("&")) {
    const [name, ...value] = pair.split("=");
    assertDecodes(name.replace(/\+/g, " "), "query parameter name");
    assertDecodes(
      value.join("=").replace(/\+/g, " "),
      `query parameter ${name}`,
    );
  }
}

/**
 * Validate params/query/body against the route's schemas, publishing the parsed
 * values on `ctx.state.validated`.
 *
 * Refusals leave as a `ValidationError`, which `restErrorMiddleware` renders as
 * the standard 400 `{ ok: false, error: { code: "VALIDATION_FAILED" } }` — the
 * REST dialect of the same refusal GraphQL spells as an extension code.
 */
export function validateRequest(schemas: RequestSchemas): Router.Middleware {
  return async (ctx: RouterContext, next: () => Promise<void>) => {
    assertWellEncoded(ctx);
    // U+0000 in a path segment, query value or body string is the caller's
    // mistake, refused before any schema or service sees it (w23/m22). Only
    // the body can carry file content verbatim.
    assertNoNulDeep(ctx.params);
    assertNoNulDeep(ctx.query);
    assertNoNulDeep(ctx.request.body, NUL_EXEMPT_PATHS);
    ctx.state.validated = {
      params: parseOrThrow(schemas.params, ctx.params, "params"),
      query: parseOrThrow(schemas.query, ctx.query, "query"),
      body: parseOrThrow(schemas.body, ctx.request.body, "body"),
    };
    await next();
  };
}
