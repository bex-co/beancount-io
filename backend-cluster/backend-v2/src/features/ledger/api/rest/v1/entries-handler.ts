import { z } from "@/shared/zod-openapi-setup";
import { ledgerPathSchema } from "./schemas";
import { json } from "@/server/rest/v1-schemas";
import { v1Route } from "@/server/rest/v1-route";

const amountSchema = z.object({
  number: z
    .string()
    .openapi({ description: "Decimal amount", example: "42.50" }),
  currency: z.string().openapi({ example: "USD" }),
});

const postingSchema = z.object({
  account: z.string().openapi({ example: "Assets:Bank:Checking" }),
  units: amountSchema,
  price: amountSchema.optional(),
  flag: z.string().optional(),
});

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date, YYYY-MM-DD")
  .openapi({ example: "2026-08-23" });

/**
 * The directive shapes, one per Beancount directive v1 can insert. Mirrors the
 * GraphQL mutation's input union field for field, because both feed the same
 * `LedgerEntryService.addBulkEntries` — the same directive text lands in the
 * same file whichever surface asked.
 */
const entrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("transaction"),
    entry: z.object({
      date: dateSchema,
      flag: z.string().openapi({
        description: "`*` for cleared, `!` for pending",
        example: "*",
      }),
      payee: z.string().optional(),
      narration: z.string().optional(),
      postings: z.array(postingSchema).min(1),
      tags: z.array(z.string()).optional(),
      links: z.array(z.string()).optional(),
      meta: z.record(z.string(), z.string()).optional(),
    }),
  }),
  z.object({
    type: z.literal("open"),
    entry: z.object({
      date: dateSchema,
      account: z.string(),
      currencies: z.array(z.string()),
    }),
  }),
  z.object({
    type: z.literal("close"),
    entry: z.object({ date: dateSchema, account: z.string() }),
  }),
  z.object({
    type: z.literal("balance"),
    entry: z.object({
      date: dateSchema,
      account: z.string(),
      amount: amountSchema,
    }),
  }),
  z.object({
    type: z.literal("price"),
    entry: z.object({
      date: dateSchema,
      currency: z.string(),
      amount: amountSchema,
    }),
  }),
  z.object({
    type: z.literal("commodity"),
    entry: z.object({ date: dateSchema, currency: z.string() }),
  }),
  z.object({
    type: z.literal("note"),
    entry: z.object({
      date: dateSchema,
      account: z.string(),
      content: z.string(),
    }),
  }),
  z.object({
    type: z.literal("event"),
    entry: z.object({
      date: dateSchema,
      type: z.string(),
      description: z.string(),
    }),
  }),
]);

const entriesBodySchema = z
  .object({
    entries: z.array(entrySchema).min(1).max(100).openapi({
      description: "Directives to append, committed all-or-nothing",
    }),
  })
  .openapi("EntriesRequest", {
    description: "One or more directives to add to the ledger",
  });

/**
 * `POST /api-gateway/v1/ledgers/{owner}/{name}/entries` — append directives without
 * knowing which file they belong in.
 *
 * The service routes each directive to its file from the ledger's own
 * `bcio` options (by type and date), creates the file when it does not exist,
 * and commits the batch atomically. That routing is the reason this endpoint
 * exists at all rather than telling callers to PUT a file: a client that has to
 * know our file layout is a client that breaks when the layout changes.
 */
export const ENTRY_ROUTES = [
  v1Route({
    method: "post",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/entries",
    summary: "Add directives to the ledger",
    description:
      "Appends one or more Beancount directives, routed to the right file by type and date and committed as a single commit. All-or-nothing: if any directive fails, none are written.",
    params: ledgerPathSchema,
    body: entriesBodySchema,
    responses: {
      200: json(
        "The directives were committed",
        z.object({ success: z.boolean(), message: z.string().optional() }),
      ),
    },
    handler: async ({ layers }, { identity, params, body }) =>
      layers.services.ledgerEntry.addBulkEntries(
        identity,
        params.owner,
        params.name,
        body.entries,
        // `platform` exists only to decide the free-tier directive-limit
        // exemption, which is mobile's alone. An API client is not exempt, so
        // it sends no exemption header and the limit is applied by ledger-v2 on
        // the write itself — the one place it is enforced (w1/m17). Nothing is
        // re-checked here; a second implementation of the rule is how the two
        // drift apart.
        "web",
      ),
  }),
] as const;
