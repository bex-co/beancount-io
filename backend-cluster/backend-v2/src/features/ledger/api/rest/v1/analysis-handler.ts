import { z } from "@/shared/zod-openapi-setup";
import { ledgerIdOf, ledgerPathSchema } from "./schemas";
import { v1Route } from "@/server/rest/v1-route";
import type { ServiceLayer } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";

/**
 * Analysis reads: what happened in this ledger.
 *
 * The vocabulary reads (`vocabulary-handler.ts`) say what a ledger *contains*;
 * these say what it *did* — a trial balance, an account's report, totals per
 * interval, the transactions behind a payee, the context around one entry.
 *
 * Ten of the sixteen in this family. The other six keep reasons that survived
 * re-reading (w3/m7/t001): two journals and a plaintext journal are already
 * covered by the paged `/journal` endpoint, two ledger-list reads are
 * client-side filtering over `GET /v1/ledgers`, `journalEntries` is a legacy
 * resolver on the removal path, and `getLedgerOverview` really is eleven chart
 * series assembled for one screen.
 *
 * Parameters reuse `/journal`'s names — `account`, `filter`, `time`,
 * `interval`, `conversion` — because a verb should behave the same everywhere,
 * and that includes what its arguments are called (ADR 0008 D5a).
 */

/** Fava's own narrowing expressions, as `/journal` already publishes them. */
const filterQuery = z.object({
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
});

/** Filtering plus period grouping and currency conversion. */
const conversionQuery = filterQuery.extend({
  interval: z.string().optional().openapi({
    description: "Period grouping: day, week, month, quarter, or year",
    example: "month",
  }),
  conversion: z.string().optional().openapi({
    description: "Convert postings to this currency before totalling",
    example: "USD",
  }),
});

/**
 * The services this family reaches, and no more.
 *
 * Narrowed rather than taking `AppLayers` so both surfaces can pass what they
 * already hold — the REST route has `layers.services`, an MCP resource has
 * `toolCtx.services`, and neither has to fake the other's wrapper.
 */
type AnalysisServices = Pick<
  ServiceLayer,
  "ledgerData" | "ledgerFinance" | "ledgerJournal" | "ledgerAccount"
>;

type ReadParams = {
  ledgerId: string;
  identity: Identity | undefined;
  query: Record<string, string | undefined>;
};

/**
 * One analysis read.
 *
 * Kept as data for the reason m6's vocabulary list is: both surfaces build from
 * this one array, so a REST route and its MCP template cannot resolve through
 * different service calls. Unlike m6's, these differ in their query shape, so
 * each entry carries its own schema — the list still has one entry per verb,
 * which is what makes the two adapters provably parallel.
 */
export interface AnalysisRead {
  readonly segment: string;
  readonly summary: string;
  readonly description: string;
  readonly query: z.ZodObject;
  /**
   * The MCP template's path suffix, for reads whose parameter is required —
   * e.g. `/{payee}`. Empty when the read takes only optional filters.
   *
   * Path and not RFC 6570 query expansion (`{?account,filter}`), which would be
   * the natural spelling: the MCP SDK's `UriTemplate.match` does not implement
   * form-style expansion, so a `{?…}` template matches no URI at all — verified
   * against @modelcontextprotocol/sdk 1.30.0. A bare template also stops
   * matching as soon as a caller appends a query string, so optional filters
   * cannot be offered on MCP by any spelling the matcher supports. They stay a
   * REST capability; see `mcpFilterExempt` below.
   */
  readonly uriPath: string;
  readonly fetch: (
    services: AnalysisServices,
    params: ReadParams,
  ) => Promise<unknown>;
}

export const ANALYSIS_READS: readonly AnalysisRead[] = [
  {
    segment: "trial-balance",
    summary: "Get the trial balance",
    description:
      "Every account's debit and credit totals — the statement that proves the books balance.",
    query: conversionQuery,
    uriPath: "",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerFinance.getTrialBalance({
        ledgerId,
        identity,
        ...query,
      }),
  },
  {
    segment: "interval-totals",
    summary: "Get totals per interval",
    description:
      "Balances grouped by period — the series behind a spending-over-time view, without the view.",
    query: conversionQuery.extend({
      accountName: z.string().optional().openapi({
        description: "Restrict the totals to one account",
      }),
    }),
    uriPath: "",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerData.getIntervalTotals({
        ledgerId,
        identity,
        // Spread first: `...query` carries `accountName` as an explicit
        // `undefined` when the caller omitted it, which would overwrite the
        // default if it came last.
        ...query,
        accountName: query.accountName ?? "",
      }),
  },
  {
    segment: "account-report",
    summary: "Get one account's report",
    description:
      "Balances and changes for a single account over the selected period.",
    query: conversionQuery.extend({
      accountName: z.string().openapi({
        description: "The account to report on",
        example: "Expenses:Groceries",
      }),
    }),
    uriPath: "/{accountName}",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerData.getAccountReport({
        ledgerId,
        identity,
        // Spread first: `...query` carries `accountName` as an explicit
        // `undefined` when the caller omitted it, which would overwrite the
        // default if it came last.
        ...query,
        accountName: query.accountName ?? "",
      }),
  },
  {
    segment: "account-last-entries",
    summary: "List the latest entry per account",
    description:
      "The most recent directive touching each account — how stale each part of the ledger is.",
    query: filterQuery,
    uriPath: "",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerData.getAccountLastEntries({
        ledgerId,
        identity,
        ...query,
      }),
  },
  {
    segment: "entries-count",
    summary: "Count entries per directive type",
    description:
      "How many transactions, opens, balances, and so on the ledger holds.",
    query: filterQuery,
    uriPath: "",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerData.getEntriesCountPerType({
        ledgerId,
        identity,
        ...query,
      }),
  },
  {
    segment: "payee-transactions",
    summary: "Get a payee's transactions",
    description: "The transaction recorded against one payee.",
    query: z.object({
      payee: z.string().openapi({ description: "The payee to look up" }),
    }),
    uriPath: "/{payee}",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerData.getPayeeTransactions({
        ledgerId,
        identity,
        payee: query.payee ?? "",
      }),
  },
  {
    segment: "narration-transactions",
    summary: "Get a narration's transactions",
    description: "The transaction recorded against one narration string.",
    query: z.object({
      narration: z
        .string()
        .openapi({ description: "The narration to look up" }),
    }),
    uriPath: "/{narration}",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerData.getNarrationTransactions({
        ledgerId,
        identity,
        narration: query.narration ?? "",
      }),
  },
  {
    segment: "payee-accounts",
    summary: "List the accounts a payee posts to",
    description:
      "Which accounts this payee has historically been booked against — what an agent should reach for when categorising a new one.",
    query: z.object({
      payee: z.string().openapi({ description: "The payee to look up" }),
    }),
    uriPath: "/{payee}",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerData.getPayeeAccounts({
        ledgerId,
        identity,
        payee: query.payee ?? "",
      }),
  },
  {
    segment: "entry-context",
    summary: "Get the source context around one entry",
    description:
      "The ledger text surrounding a directive, addressed by its hash — what to read before editing it.",
    query: z.object({
      entryHash: z.string().openapi({ description: "The entry's hash" }),
    }),
    uriPath: "/{entryHash}",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerJournal.getContext({
        ledgerId,
        identity,
        entryHash: query.entryHash ?? "",
      }),
  },
  {
    segment: "account-directives",
    summary: "List open/close directives per account",
    description:
      "Each account's open and close directives — which accounts are usable on a given date.",
    query: z.object({}),
    uriPath: "",
    fetch: (s, { ledgerId, identity }) => {
      const [owner, name] = ledgerId.split("/");
      return s.ledgerAccount.getAccountDirectives(owner, name, identity);
    },
  },
];

export const ANALYSIS_ROUTES = ANALYSIS_READS.map((read) =>
  v1Route({
    method: "get",
    path: `/api-gateway/v1/ledgers/{owner}/{name}/${read.segment}`,
    summary: read.summary,
    description: read.description,
    params: ledgerPathSchema,
    query: read.query,
    responses: {
      200: {
        description: read.summary,
        content: { "application/json": { schema: z.unknown() } },
      },
    },
    handler: async ({ layers }, { identity, params, query }) =>
      read.fetch(layers.services, {
        ledgerId: ledgerIdOf(params),
        identity,
        query: query as Record<string, string | undefined>,
      }),
  }),
);
