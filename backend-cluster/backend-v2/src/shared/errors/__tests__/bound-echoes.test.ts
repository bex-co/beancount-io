import "reflect-metadata";
import { GraphQLError } from "graphql";
import type { RouterContext } from "@koa/router";
import { boundEchoes, NotFoundError, BadUserInputError } from "@/shared/errors";
import { ECHO_MAX } from "../bound-echoes";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { formatError } from "@/server/graphql/format-error";
import {
  envelopeFromThrown,
  splitToolFailure,
} from "@/features/ai-agent/api/mcp-errors";

/**
 * w1/225. A refusal interpolated the caller's value whole: a 5,000-character
 * path came back as a 5,021-character message, ESC and CRLF intact, on MCP,
 * REST and GraphQL.
 */
const LONG = "z".repeat(5000);
const bounded = `${"z".repeat(ECHO_MAX)}…`;
/** A quoted echo keeps its opening quote within the limit, and its closing one. */
const quoted = (q: string) => `${q}${"z".repeat(ECHO_MAX - 1)}…${q}`;

describe("boundEchoes", () => {
  it("keeps the first characters of a long run and an ellipsis", () => {
    expect(boundEchoes(`file not found: ${LONG}`)).toBe(
      `file not found: ${bounded}`,
    );
  });

  it("leaves ordinary text, and a run at the limit, as it is", () => {
    const atLimit = "a".repeat(ECHO_MAX);
    expect(boundEchoes(`Ledger ${atLimit} not found`)).toBe(
      `Ledger ${atLimit} not found`,
    );
  });

  it("escapes control characters but keeps tab and line feed", () => {
    expect(boundEchoes("a\u001b[31mb\r\nc\td\u007f")).toBe(
      "a\\u001b[31mb\\u000d\nc\td\\u007f",
    );
  });

  it("is idempotent", () => {
    const once = boundEchoes(`x ${LONG}\u001b`);
    expect(boundEchoes(once)).toBe(once);
  });

  it("never splits a character outside the BMP", () => {
    const out = boundEchoes("😀".repeat(500));
    expect([...out.replace("…", "")]).toHaveLength(ECHO_MAX);
    expect(out).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/u);
  });
});

describe("a DomainError", () => {
  it("bounds what its message and metadata echo, never its hint", () => {
    const error = new NotFoundError("File", LONG, `hint ${LONG}`);
    expect(error.message).toBe(`File with ID ${quoted("'")} not found`);
    expect(error.metadata).toMatchObject({
      id: bounded,
      hint: `hint ${LONG}`,
    });
  });
});

describe("on each surface", () => {
  it("REST answers the bounded message and metadata", async () => {
    const ctx = {
      method: "GET",
      path: "/api-gateway/v1/x",
      get: () => "",
      set: () => undefined,
    } as unknown as RouterContext;
    await restErrorMiddleware()(ctx, async () => {
      throw new NotFoundError("File", `${LONG}\u001b[31m`);
    });
    const body = ctx.body as {
      error: { message: string; metadata: { id: string } };
    };
    expect(body.error.message).toBe(`File with ID ${quoted("'")} not found`);
    expect(body.error.metadata.id).toBe(bounded);
  });

  it("GraphQL bounds its own validation messages as well", () => {
    const formatted = formatError(
      { message: `Variable "$x" got invalid value "${LONG}".` },
      new GraphQLError(`Variable "$x" got invalid value "${LONG}".`),
    );
    expect(formatted.message).toBe(
      `Variable "$x" got invalid value "${"z".repeat(ECHO_MAX - 1)}…`,
    );
  });

  it("MCP bounds a thrown refusal and a returned tool failure", () => {
    expect(
      envelopeFromThrown(new BadUserInputError(`no such type ${LONG}`)).message,
    ).toBe(`no such type ${bounded}`);
    const { envelope } = splitToolFailure({
      ok: false,
      error: `preview refused: ${LONG}`,
      errorCode: "BAD_USER_INPUT",
    });
    expect(envelope.message).toBe(`preview refused: ${bounded}`);
  });
});
