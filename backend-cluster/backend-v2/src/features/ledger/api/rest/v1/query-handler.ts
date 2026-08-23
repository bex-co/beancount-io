import { z } from "@/shared/zod-openapi-setup";
import { ledgerIdOf, ledgerPathSchema } from "./schemas";
import { v1Route } from "@/server/rest/v1-route";

const queryBodySchema = z
  .object({
    query: z.string().min(1).openapi({
      description: "A Beancount Query Language statement",
      example: "SELECT account, sum(position) GROUP BY account",
    }),
  })
  .openapi("BqlQuery", {
    description: "A BQL query to run against the ledger",
  });

/**
 * `POST /v1/ledgers/{owner}/{name}/query` — BQL, the one endpoint that answers
 * questions we did not anticipate.
 *
 * POST rather than GET because a BQL statement is a program, and programs do
 * not belong in a URL (length limits, access logs, cache keys). It stays
 * **read**-classified all the same: the op-class table gives it `read`
 * explicitly, which matters because an unclassified op defaults to `write` and
 * a POST would look like one to anybody skimming.
 *
 * `Accept` picks the representation: `application/json` (the default) returns
 * the typed table, `text/plain` returns what the ledger shell would print.
 * Same service call either way — `LedgerShellService` is the shared
 * implementation GraphQL and the `runBqlQuery` MCP tool also go through, so
 * the three cannot disagree about what a query returns.
 */
export const QUERY_ROUTES = [
  v1Route({
    method: "post",
    path: "/v1/ledgers/{owner}/{name}/query",
    summary: "Run a BQL query",
    description:
      "Runs a Beancount Query Language statement against the ledger. `Accept: application/json` returns a typed table; `Accept: text/plain` returns the shell's own text rendering.",
    params: ledgerPathSchema,
    body: queryBodySchema,
    responses: {
      200: {
        description: "Query result, as a typed table or as shell text",
        content: {
          "application/json": { schema: z.unknown() },
          "text/plain": { schema: z.string() },
        },
      },
    },
    handler: async ({ layers }, { identity, params, body, ctx }) => {
      const ledgerId = ledgerIdOf(params);
      const wantsText = ctx.accepts("json", "text") === "text";
      if (wantsText) {
        const result = await layers.services.ledgerShell.queryShellText({
          ledgerId,
          identity,
          query: body.query,
        });
        ctx.type = "text/plain";
        ctx.body = result.text;
        return undefined;
      }
      return layers.services.ledgerShell.queryShell({
        ledgerId,
        identity,
        query: body.query,
      });
    },
  }),
] as const;
