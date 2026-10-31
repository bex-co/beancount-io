import { shapeQuery, statementQuerySchema } from "./reports-handler";
import {
  summarizeIntervalTotals,
  summarizeOverview,
} from "@/features/ledger/utils/report-summaries";
import { z } from "@/shared/zod-openapi-setup";
import { resolveEntryHash } from "@/features/ledger/utils/entry-hash-alias";
import { resolveGroupBy } from "@/features/ledger/utils/query-param-alias";
import {
  ledgerIdOf,
  ledgerPathSchema,
  filterQuerySchema as filterQuery,
} from "./schemas";
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
 * Sixteen reads are listed here for REST/MCP. Remaining family members keep
 * reasons that survived re-reading (w3/m7/t001): two journals and a plaintext
 * journal are already covered by the paged `/journal` endpoint, two ledger-list
 * reads are client-side filtering over `GET /v1/ledgers`, `journalEntries` is a
 * legacy resolver on the removal path, and `getLedgerOverview` really is eleven
 * chart series assembled for one screen.
 *
 * Parameters reuse `/journal`'s names — `account`, `filter`, `time`,
 * `interval`, `conversion` — because a verb should behave the same everywhere,
 * and that includes what its arguments are called (ADR 0008 D5a).
 */

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

// The trial balance is hierarchy-only: no `interval` (w23/159). An
// advertised grouping there would be accepted and ignored; the strict
// query refuses one outright.
const trialBalanceQuery = conversionQuery.omit({ interval: true });

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
   * The MCP template's path suffix, e.g. `/{payee}`. Empty when arguments
   * travel as query parameters, including a required explicit empty narration.
   *
   * The resource adapter advertises the remaining arguments as RFC 6570 query
   * expansions; this read's schema still decides which are required.
   */
  readonly uriPath: string;
  /** Existing MCP path forms accepted by the same read and validation. */
  readonly uriPathAliases?: readonly string[];
  readonly fetch: (
    services: AnalysisServices,
    params: ReadParams,
  ) => Promise<unknown>;
}

export const ANALYSIS_READS: readonly AnalysisRead[] = [
  {
    segment: "overview",
    summary: "Get the ledger overview",
    description:
      "Net worth now and over time. `shape=summary` (the default) returns the net-worth series in one currency; `shape=fava` returns the account hierarchies and income/expense series the dashboard charts.",
    query: statementQuerySchema.extend(shapeQuery.shape),
    uriPath: "",
    fetch: async (s, { ledgerId, identity, query }) => {
      const { shape, ...rest } = query;
      const data = await s.ledgerFinance.getOverview({
        ledgerId,
        identity,
        ...rest,
      });
      return shape === "fava" ? data : summarizeOverview(data, rest.conversion);
    },
  },
  {
    segment: "documents",
    summary: "List ledger documents",
    description:
      "Document directives with account, time, and Fava-expression filters.",
    query: filterQuery,
    uriPath: "",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerData.getDocuments({ ledgerId, identity, ...query }),
  },
  {
    segment: "trial-balance",
    summary: "Get the trial balance",
    description:
      "Every account's debit and credit totals — the statement that proves the books balance.",
    query: trialBalanceQuery,
    uriPath: "",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerFinance.getTrialBalance({
        ledgerId,
        identity,
        ...query,
      }),
  },
  {
    segment: "holdings",
    summary: "Get holdings",
    description:
      "Lots grouped by account or commodity — units, average cost, cost basis, market value — valued at today's quotes. `conversion` takes a currency or `units` (default: the operating currency when the ledger declares exactly one, else each group's held currency); `account` names a parent account or a regular expression. Costless cash and fully-sold groups are left out; groups without a quote value at cost and are named in `missing_prices`.",
    query: z.object({
      account: filterQuery.shape.account,
      conversion: z.string().optional().openapi({
        description:
          "Convert money columns to this currency, or `units` for each group's held currency (default: the operating currency when the ledger declares exactly one)",
        example: "USD",
      }),
      groupBy: z.enum(["account", "commodity"]).optional().openapi({
        description: "Group lots by account or by commodity",
        example: "commodity",
      }),
      // Twin (w23/144): the read echoes group_by; no default on either
      // spelling, so a defaulted groupBy cannot masquerade as an explicit
      // one and false-split against group_by.
      group_by: z.enum(["account", "commodity"]).optional().openapi({
        description: "Alias of groupBy, as the read echoes it.",
      }),
    }).strict(),
    uriPath: "",
    fetch: (s, { ledgerId, identity, query }) => {
      const { group_by, ...rest } = query;
      return s.ledgerFinance.getHoldings({
        ledgerId,
        identity,
        ...rest,
        groupBy: (resolveGroupBy({
          primary: group_by,
          legacy: query.groupBy,
        }) ?? "account") as "account" | "commodity",
      });
    },
  },
  {
    segment: "register",
    summary: "Get one account's register",
    description:
      "One account's dated entries with a running balance, oldest first — each entry with the subtree postings behind it. `account` names a parent account or a regular expression resolving to one subtree; `conversion` takes a currency or `units` (default: the operating currency when the ledger declares exactly one, else each row's held currencies). A time window carries the opening balance forward.",
    query: z.object({
      account: z.string().openapi({
        description: "The account to list: a parent account or a regular expression",
        example: "Assets:Bank:Checking",
      }),
      time: filterQuery.shape.time,
      conversion: z.string().optional().openapi({
        description:
          "Convert money columns to this currency, or `units` for each row's held currencies (default: the operating currency when the ledger declares exactly one)",
        example: "USD",
      }),
    }).strict(),
    uriPath: "/{account}",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerFinance.getRegister({
        ledgerId,
        identity,
        ...query,
        // Required by the schema above; a bypassed `undefined` becomes the
        // service's "Register needs an account" refusal, not a crash.
        account: query.account ?? "",
      }),
  },
  {
    segment: "capital-gains",
    summary: "Get realized capital gains",
    description:
      "One row per closed lot — quantity, proceeds, basis, gain — plus one-year bucket totals. A lot closes when a reducing posting carries booked cost and price; splits and own-account transfers carry no price and are left out. `fromDate`/`toDate` bound the sale date, `account` filters the posting account, and `time` scopes the window; all figures stay in their booked currencies.",
    query: z.object({
      account: filterQuery.shape.account,
      time: filterQuery.shape.time,
      fromDate: z.string().optional().openapi({
        description: "Sales on or after YYYY-MM-DD",
        example: "2024-01-01",
      }),
      toDate: z.string().optional().openapi({
        description: "Sales on or before YYYY-MM-DD",
        example: "2024-12-31",
      }),
    }).strict(),
    uriPath: "",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerFinance.getCapitalGains({
        ledgerId,
        identity,
        ...query,
      }),
  },
  {
    segment: "interval-totals",
    summary: "Get totals per interval",
    description:
      "Balances grouped by period — the series behind a spending-over-time view, without the view. `shape=summary` (the default) states one currency and drops zero accounts; `shape=fava` returns the raw per-currency balances.",
    query: conversionQuery.extend({
      accountName: z.string().optional().openapi({
        description: "Restrict the totals to one account",
      }),
      ...shapeQuery.shape,
    }),
    uriPath: "",
    fetch: async (s, { ledgerId, identity, query }) => {
      const { shape, ...rest } = query;
      const data = await s.ledgerData.getIntervalTotals({
        ledgerId,
        identity,
        // Spread first: `...rest` carries `accountName` as an explicit
        // `undefined` when the caller omitted it, which would overwrite the
        // default if it came last.
        ...rest,
        accountName: rest.accountName ?? "",
      });
      return shape === "fava"
        ? data
        : summarizeIntervalTotals(data, rest.conversion);
    },
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
    segment: "postings-per-account",
    summary: "Count postings per account",
    description:
      "Posting counts for the filtered Statistics report stream. An account filter selects matching entries and counts every posting on those entries, including counterpart accounts. Time filters use the same clamped report stream as entries-count.",
    query: filterQuery,
    uriPath: "",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerData.getPostingsPerAccount({
        ledgerId,
        identity,
        ...query,
      }),
  },
  {
    segment: "payee-transactions",
    summary: "Get a payee's most recent transaction",
    description:
      "The single most recent transaction recorded against this payee, or null if there is none. " +
      "This is Fava's autocomplete lookup — a template for the next entry, not a history. " +
      "For every transaction by a payee, query the journal or BQL instead.",
    query: z.object({
      payee: z.string().openapi({ description: "The payee to look up" }),
    }).strict(),
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
    summary: "Get a narration's most recent transaction",
    description:
      "The single most recent transaction recorded against this narration string, or null if " +
      "there is none. Fava's autocomplete lookup, like payee-transactions. " +
      "An explicit empty narration is valid. In MCP, read " +
      "`beancount://{owner}/{name}/narration-transactions?narration=` for empty text. " +
      "Nonempty values also support the existing path alias " +
      "`beancount://{owner}/{name}/narration-transactions/{narration}`; percent-encode the value once.",
    query: z.object({
      narration: z.string().openapi({
        description:
          "The exact narration to look up. Supply it explicitly; an empty string is valid.",
        example: "",
      }),
    }).strict(),
    uriPath: "",
    uriPathAliases: ["/{narration}"],
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerData.getNarrationTransactions({
        ledgerId,
        identity,
        narration: query.narration ?? "",
      }),
  },
  {
    segment: "payee-accounts",
    summary: "Rank every account by this payee's history",
    description:
      "Every account in the ledger, re-sorted by how recently and often this payee was booked " +
      "against it (exponential decay). Accounts the payee never touched are still present, at " +
      "the back — the leading entries are the suggestion, not the whole list. Reach for the " +
      "first few when categorising a new transaction for this payee.",
    query: z.object({
      payee: z.string().openapi({ description: "The payee to look up" }),
    }).strict(),
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
      "The ledger text surrounding a directive, addressed by its hash — what to read before editing it. A result with `generated_from` is a copy a plugin or a pad generated from that source entry: it shares the source's slice and sha256sum, so editing or deleting it would change the source and every other copy. An entry with `not_booked: true` is a transaction the ledger could not book (for example a sale with no matching lot): it is listed so it can be opened and fixed, but no balance counts it.",
    query: z.object({
      entryHash: z
        .string()
        .optional()
        .openapi({ description: "The entry's hash" }),
      entry_hash: z
        .string()
        .optional()
        .openapi({ description: "Alias of entryHash, as list output spells it." }),
    }).strict(),
    uriPath: "/{entryHash}",
    fetch: (s, { ledgerId, identity, query }) =>
      s.ledgerJournal.getContext({
        ledgerId,
        identity,
        entryHash: resolveEntryHash(query),
      }),
  },
  {
    segment: "account-directives",
    summary: "List open/close directives per account",
    description:
      "Each account's open and close directives — which accounts are usable on a given date. `entryCount` counts the account's postings, not its directives.",
    query: z.object({}).strict(),
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
