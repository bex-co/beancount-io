import { z } from "@/shared/zod-openapi-setup";
import { booleanQuery } from "@/server/rest/v1-schemas";
import { JOURNAL_KINDS } from "@/features/ledger/utils/journal-kinds";
import {
  resolveFilterAccount,
  resolveWithChildren,
} from "@/features/ledger/utils/query-param-alias";
import {
  PLAINTEXT_PAGE_MAX,
  type JournalQueryParams,
  type AccountJournalQueryParams,
} from "@/features/ledger/service/ledger-journal-service";
import type { ServiceLayer } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";

// Strict (w23/m12/t002): unknown keys are mistyped filters, not unfiltered reads.
const filters = z.object({
  account: z.string().optional(),
  filter: z.string().optional(),
  time: z
    .string()
    .optional()
    .describe(
      "Fava time expression: a day (2026-09-05), month (2026-09), year, or range. " +
        "The window clamps by Fava's TimeFilter: pre-window `open` directives are " +
        "preserved as report context (with their real dates) and appear in every " +
        "window, and `total` counts them — so a single-day journal still lists " +
        "them. Use directiveTypes to ask for transactions alone.",
    ),
}).strict();

/**
 * Which directive kinds to return.
 *
 * Documented rather than defaulted (w2/010): the pre-window `open`
 * directives a single-day `time` window preserves surprised the field
 * audit, but narrowing the default here would change what REST, GraphQL,
 * and MCP all return for an unchanged request. The caller asks for what
 * it wants; this says how.
 */
const directiveTypesQuery = (schema: z.ZodTypeAny) =>
  schema.describe(
    'JSON-encoded directive kinds to include, e.g. ["Transaction"]: any of ' +
      `${JOURNAL_KINDS.directiveTypes.join(", ")}, in any case. ` +
      "Omitted, every kind is returned — including pre-window `open` " +
      "directives, which the time clamp preserves as context in every window.",
  );
/** A query parameter carrying a JSON document, decoded once then validated. */
export function jsonQuery<Schema extends z.ZodTypeAny>(
  schema: Schema,
  description: string,
) {
  return z
    .string()
    .describe(description)
    .transform((value, context): unknown => {
      try {
        return JSON.parse(value);
      } catch {
        context.addIssue({
          code: "custom",
          message: "Expected a JSON-encoded value",
        });
        return z.NEVER;
      }
    })
    .pipe(schema);
}

export const jsonStringArrayQuery = jsonQuery(
  z.array(z.string()),
  "JSON-encoded string array, including [] for an empty filter list",
);

/**
 * Subtype filters narrow only their own directive family and pass every
 * other family through (engine parity — w23/150). One described schema
 * per family, shared by the journal and account-journal reads.
 */
const transactionSubtypesQuery = jsonStringArrayQuery
  .optional()
  .describe(
    "JSON-encoded transaction flag filter, e.g. [\"cleared\"]: narrows transactions only — other directive families pass through. Combine with directiveTypes to restrict the families returned.",
  );
const documentSubtypesQuery = jsonStringArrayQuery
  .optional()
  .describe(
    "JSON-encoded document subtype filter: narrows documents only — other directive families pass through. Combine with directiveTypes to restrict the families returned.",
  );
const customSubtypesQuery = jsonStringArrayQuery
  .optional()
  .describe(
    "JSON-encoded custom-directive subtype filter: narrows custom directives only — other families pass through. Combine with directiveTypes to restrict the families returned.",
  );

const journalQuerySchema = filters.extend({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  // The journal service normalizes and validates these for every surface.
  directiveTypes: directiveTypesQuery(jsonStringArrayQuery.optional()),
  transactionSubtypes: transactionSubtypesQuery,
  documentSubtypes: documentSubtypesQuery,
  customSubtypes: customSubtypesQuery,
});
const plaintextJournalQuery = filters.extend({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PLAINTEXT_PAGE_MAX)
    .optional()
    .describe(
      "Entries per page. Omitted, REST and GraphQL return every entry; MCP returns 200.",
    ),
  offset: z.coerce.number().int().min(0).optional(),
});
const accountJournalQuery = filters.extend({
  account: z.string(),
  /** Shared report-stream AccountFilter; same wire name as the ledger service. */
  filter_account: z.string().optional(),
  // Twin (w23/m10/t002): GraphQL spells it `filterAccount`.
  filterAccount: z
    .string()
    .optional()
    .describe("Alias of filter_account, as GraphQL spells it."),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  with_children: booleanQuery,
  // Twin (w23/m10/t003): the camel spelling, accepted on every surface.
  withChildren: booleanQuery.openapi({
    description: "Alias of with_children.",
  }),
  conversion: z.string().optional(),
  // Same optional display selectors as the main journal read.
  directiveTypes: directiveTypesQuery(jsonStringArrayQuery.optional()),
  transactionSubtypes: transactionSubtypesQuery,
  documentSubtypes: documentSubtypesQuery,
  customSubtypes: customSubtypesQuery,
});

type ReadParams = {
  ledgerId: string;
  identity: Identity | undefined;
  query: JournalQueryParams & Partial<AccountJournalQueryParams>;
};
type Services = Pick<ServiceLayer, "ledgerJournal" | "ledgerData">;

export const JOURNAL_READS = [
  {
    segment: "journal",
    name: "ledgerJournal",
    summary: "Read the journal with pagination and all subtype filters",
    query: journalQuerySchema,
    fetch: (services: Services, params: ReadParams) =>
      services.ledgerJournal.getJournal(params),
  },
  {
    segment: "plaintext-journal",
    name: "ledgerPlaintextJournal",
    summary:
      "Read Beancount journal text with account, time, and expression filters",
    query: plaintextJournalQuery,
    /**
     * A whole ledger's text is a context blowup for an agent (w23/044), so
     * an MCP read without `limit` gets a page; REST and GraphQL keep the
     * whole export the dashboard downloads. `total` and `truncated` say what
     * is left either way.
     */
    mcpDefaultLimit: 200,
    fetch: (services: Services, params: ReadParams) =>
      services.ledgerJournal.plaintextJournal(params),
  },
  {
    segment: "account-journal",
    name: "ledgerAccountJournal",
    summary: "Read account entries with changes and running balances",
    query: accountJournalQuery,
    fetch: (services: Services, { ledgerId, identity, query }: ReadParams) => {
      const {
        filter_account,
        filterAccount,
        with_children,
        withChildren,
        ...rest
      } = query as typeof query & {
        filter_account?: string;
        filterAccount?: string;
        with_children?: boolean;
        withChildren?: boolean;
      };
      return services.ledgerJournal.getAccountJournal({
        ledgerId,
        identity,
        query: {
          ...rest,
          account: query.account ?? "",
          filterAccount: resolveFilterAccount({
            primary: filter_account,
            legacy: filterAccount,
          }),
          with_children: resolveWithChildren({
            primary: with_children,
            legacy: withChildren,
          }),
        },
      });
    },
  },
  {
    segment: "source-files",
    name: "ledgerSourceFiles",
    summary: "List the ledger's source files",
    query: z.object({}).strict(),
    fetch: (services: Services, { ledgerId, identity }: ReadParams) =>
      services.ledgerData.getSourceFiles({ ledgerId, identity }),
  },
] as const;
