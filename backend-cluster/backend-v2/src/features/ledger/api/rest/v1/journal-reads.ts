import { z } from "@/shared/zod-openapi-setup";
import { booleanQuery } from "@/server/rest/v1-schemas";
import type {
  DirectiveType,
  TransactionSubtype,
  DocumentSubtype,
  CustomSubtype,
} from "@/foundation/fava";
import type {
  JournalQueryParams,
  AccountJournalQueryParams,
} from "@/features/ledger/service/ledger-journal-service";
import type { ServiceLayer } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";

const filters = z.object({
  account: z.string().optional(),
  filter: z.string().optional(),
  time: z.string().optional(),
});
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

const journalQuerySchema = filters.extend({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  // GraphQL accepts strings here; the ledger service owns subtype validation.
  directiveTypes: jsonStringArrayQuery
    .transform((values) => values as DirectiveType[])
    .optional(),
  transactionSubtypes: jsonStringArrayQuery
    .transform((values) => values as TransactionSubtype[])
    .optional(),
  documentSubtypes: jsonStringArrayQuery
    .transform((values) => values as DocumentSubtype[])
    .optional(),
  customSubtypes: jsonStringArrayQuery
    .transform((values) => values as CustomSubtype[])
    .optional(),
});
const accountJournalQuery = filters.extend({
  account: z.string(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  with_children: booleanQuery,
  conversion: z.string().optional(),
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
    query: filters,
    fetch: (services: Services, params: ReadParams) =>
      services.ledgerJournal.plaintextJournal(params),
  },
  {
    segment: "account-journal",
    name: "ledgerAccountJournal",
    summary: "Read account entries with changes and running balances",
    query: accountJournalQuery,
    fetch: (services: Services, { ledgerId, identity, query }: ReadParams) =>
      services.ledgerJournal.getAccountJournal({
        ledgerId,
        identity,
        query: { ...query, account: query.account ?? "" },
      }),
  },
  {
    segment: "source-files",
    name: "ledgerSourceFiles",
    summary: "List the ledger's source files",
    query: z.object({}),
    fetch: (services: Services, { ledgerId, identity }: ReadParams) =>
      services.ledgerData.getSourceFiles({ ledgerId, identity }),
  },
] as const;
