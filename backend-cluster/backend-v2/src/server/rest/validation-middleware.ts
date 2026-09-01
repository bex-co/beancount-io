import Router, { RouterContext } from "@koa/router";
import type { ZodType } from "zod";
import { ValidationError } from "@/shared/errors";

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
    ctx.state.validated = {
      params: parseOrThrow(schemas.params, ctx.params, "params"),
      query: parseOrThrow(schemas.query, ctx.query, "query"),
      body: parseOrThrow(schemas.body, ctx.request.body, "body"),
    };
    await next();
  };
}
