import { JOURNAL_READS } from "./journal-reads";
import { z } from "@/shared/zod-openapi-setup";
import { ledgerIdOf, ledgerPathSchema } from "./schemas";
import { json } from "@/server/rest/v1-schemas";
import { v1Route } from "@/server/rest/v1-route";
import type { ServiceLayer } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";
import {
  summarizeBalanceSheet,
  summarizeIncomeStatement,
} from "@/features/ledger/utils/report-summaries";

export const accountsQuerySchema = z.object({
  status: z.string().optional().openapi({
    description:
      "Use open or closed to filter; other values return all accounts, matching GraphQL",
  }),
});

const statementParamsSchema = ledgerPathSchema.extend({
  statement: z.enum(["balance-sheet", "income-statement"]).openapi({
    description: "Which statement to render",
    example: "balance-sheet",
  }),
});

/**
 * Which shape a report comes back in (w2/m28:t002).
 *
 * `summary` is the default because it is what a caller asking for a balance
 * sheet wants: totals and the accounts carrying them, in one stated currency.
 * `fava` returns the chart payload the dashboard consumes — every interval
 * series and the full account tree — which is the only shape that existed
 * before and is preserved exactly.
 */
export const shapeQuery = z.object({
  shape: z.enum(["summary", "fava"]).default("summary").openapi({
    description:
      "summary returns totals and non-zero accounts in one currency; fava returns the full chart payload.",
    example: "summary",
  }),
});

export const statementQuerySchema = z.object({
  account: z.string().optional(),
  filter: z.string().optional(),
  time: z.string().optional().openapi({
    description: "Reporting period as a Fava time expression",
    example: "2026-01-01 - 2026-12-31",
  }),
  conversion: z.string().default("USD").openapi({
    description: "Convert amounts to this currency",
    example: "USD",
  }),
  interval: z.string().default("monthly").openapi({
    description: "Bucket the period: day, week, month, quarter, year",
    example: "month",
  }),
});

/** The statements' query contract, on both surfaces. */
export const statementReadQuery = statementQuerySchema.extend(shapeQuery.shape);

/**
 * Fetch one statement in the requested shape.
 *
 * The one seam REST and MCP both call (ADR 0008 D5): the projection is applied
 * here rather than in each adapter, so the two surfaces cannot come to return
 * different things for the same `shape`.
 */
export async function fetchStatement(
  services: Pick<ServiceLayer, "ledgerFinance">,
  params: {
    ledgerId: string;
    identity: Identity | undefined;
    statement: "balance-sheet" | "income-statement";
    query: z.infer<typeof statementReadQuery>;
  },
): Promise<unknown> {
  const { shape, ...rest } = params.query;
  const args = {
    ledgerId: params.ledgerId,
    identity: params.identity,
    ...rest,
  };
  if (params.statement === "balance-sheet") {
    const data = await services.ledgerFinance.getBalanceSheet(args);
    return shape === "fava" ? data : summarizeBalanceSheet(data, rest.conversion);
  }
  const data = await services.ledgerFinance.getIncomeStatement(args);
  return shape === "fava"
    ? data
    : summarizeIncomeStatement(data, rest.conversion);
}

/**
 * The read core of v1: journal, accounts, and the two statements.
 *
 * Each is a thin adapter over the service the GraphQL twin calls — the
 * authorization decision (`authorizeLedger`) and the data both live down there,
 * so "does REST agree with GraphQL" is not a thing anyone has to keep true by
 * hand. What v1 adds is a resource-shaped URL and a documented query string.
 *
 * Deliberately absent: the dashboard's screen-shaped reads (chart series,
 * account trees, screen-tuned paging). v1 publishes ledger resources, not
 * screens; the op-class table carries that as a written exemption rather than
 * as silence.
 */
export const REPORT_ROUTES = [
  ...JOURNAL_READS.map((read) =>
    v1Route({
      method: "get",
      path: `/api-gateway/v1/ledgers/{owner}/{name}/${read.segment}`,
      summary: read.summary,
      description: read.summary,
      params: ledgerPathSchema,
      query: read.query,
      responses: { 200: json(read.summary) },
      handler: async ({ layers }, { identity, params, query }) =>
        read.fetch(layers.services, {
          identity,
          ledgerId: ledgerIdOf(params),
          query,
        }),
    }),
  ),

  v1Route({
    method: "get",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/accounts",
    summary: "List accounts",
    description:
      "Every account name in the ledger. `status=open` or `status=closed` narrows it to accounts with or without a close directive.",
    params: ledgerPathSchema,
    query: accountsQuerySchema,
    responses: {
      200: json("Account names", z.array(z.string())),
    },
    handler: async ({ layers }, { identity, params, query }) =>
      layers.services.ledgerAccount.getAccounts(
        params.owner,
        params.name,
        query.status,
        identity,
      ),
  }),

  v1Route({
    method: "get",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/statements/{statement}",
    summary: "Get a financial statement",
    description:
      "Renders the balance sheet or the income statement for the period, with optional currency conversion and interval bucketing. `shape=summary` (the default) returns totals and non-zero accounts; `shape=fava` returns the full chart payload.",
    params: statementParamsSchema,
    query: statementReadQuery,
    responses: {
      200: json("The rendered statement"),
    },
    handler: async ({ layers }, { identity, params, query }) =>
      fetchStatement(layers.services, {
        ledgerId: ledgerIdOf(params),
        identity,
        statement: params.statement,
        query,
      }),
  }),
] as const;
