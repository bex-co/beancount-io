import { JOURNAL_READS } from "./journal-reads";
import { z } from "@/shared/zod-openapi-setup";
import { ledgerIdOf, ledgerPathSchema } from "./schemas";
import { json } from "@/server/rest/v1-schemas";
import { v1Route } from "@/server/rest/v1-route";

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
      "Renders the balance sheet or the income statement for the period, with optional currency conversion and interval bucketing.",
    params: statementParamsSchema,
    query: statementQuerySchema,
    responses: {
      200: json("The rendered statement"),
    },
    handler: async ({ layers }, { identity, params, query }) => {
      const args = { ledgerId: ledgerIdOf(params), identity, ...query };
      return params.statement === "balance-sheet"
        ? layers.services.ledgerFinance.getBalanceSheet(args)
        : layers.services.ledgerFinance.getIncomeStatement(args);
    },
  }),
] as const;
