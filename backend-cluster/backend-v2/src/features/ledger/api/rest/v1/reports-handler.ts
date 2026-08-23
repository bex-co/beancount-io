import { z } from "@/shared/zod-openapi-setup";
import { json, ledgerIdOf, ledgerPathSchema } from "./schemas";
import { v1Route } from "./route";

const journalQuerySchema = z.object({
  account: z.string().optional().openapi({
    description: "Restrict to one account and its children",
    example: "Assets:Bank:Checking",
  }),
  filter: z.string().optional().openapi({
    description: "Fava filter expression",
    example: "#travel",
  }),
  time: z.string().optional().openapi({
    description: "Fava time expression",
    example: "2026",
  }),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const accountsQuerySchema = z.object({
  status: z.enum(["open", "closed"]).optional().openapi({
    description: "Only accounts that are currently open, or only closed ones",
  }),
});

const statementParamsSchema = ledgerPathSchema.extend({
  statement: z.enum(["balance-sheet", "income-statement"]).openapi({
    description: "Which statement to render",
    example: "balance-sheet",
  }),
});

const statementQuerySchema = z.object({
  filter: z.string().optional(),
  time: z.string().optional().openapi({
    description: "Reporting period as a Fava time expression",
    example: "2026-01-01 - 2026-12-31",
  }),
  conversion: z.string().optional().openapi({
    description: "Convert amounts to this currency",
    example: "USD",
  }),
  interval: z.string().optional().openapi({
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
  v1Route({
    method: "get",
    path: "/v1/ledgers/{owner}/{name}/journal",
    summary: "List journal entries",
    description:
      "The ledger's journal, optionally narrowed by account, Fava filter, or time expression, and paged with `limit`/`offset`.",
    params: ledgerPathSchema,
    query: journalQuerySchema,
    responses: {
      200: json("Journal entries"),
    },
    handler: async ({ layers }, { identity, params, query }) =>
      layers.services.ledgerJournal.getJournal({
        ledgerId: ledgerIdOf(params),
        identity,
        query,
      }),
  }),

  v1Route({
    method: "get",
    path: "/v1/ledgers/{owner}/{name}/accounts",
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
    path: "/v1/ledgers/{owner}/{name}/statements/{statement}",
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
