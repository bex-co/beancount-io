import { z } from "@/shared/zod-openapi-setup";
import { ledgerPathSchema } from "./schemas";
import { json } from "@/server/rest/v1-schemas";
import { v1Route } from "@/server/rest/v1-route";

/**
 * REST/MCP null tolerance: an explicit null on an optional field means the
 * same as omitting it, normalized once here so every field spells it alike.
 */
const nullToUndefined = <Schema extends z.ZodTypeAny>(schema: Schema) =>
  schema.nullish().transform((value) => value ?? undefined);

const amountSchema = z.strictObject({
  number: z
    .string()
    .openapi({ description: "Decimal amount", example: "42.50" }),
  currency: z.string().openapi({ example: "USD" }),
});

const postingSchema = z.strictObject({
  account: z.string().openapi({ example: "Assets:Bank:Checking" }),
  // Omitted on at most one posting per transaction: the amount is interpolated
  // for validation and the posting renders elided, as written (w2/m26).
  units: nullToUndefined(amountSchema).optional().openapi({
    description:
      "Posting amount; omit on at most one posting per transaction to elide it",
  }),
  price: nullToUndefined(amountSchema),
  flag: nullToUndefined(z.string()),
});

const dateSchema = z.string().openapi({ example: "2026-08-23" });

/**
 * The directive shapes, one per Beancount directive v1 can insert. Mirrors the
 * GraphQL mutation's input union field for field, because both feed the same
 * `LedgerEntryService.addBulkEntries` — the same directive text lands in the
 * same file whichever surface asked.
 */
const entrySchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("transaction"),
    entry: z.strictObject({
      date: dateSchema,
      flag: z.string().openapi({
        description: "`*` for cleared, `!` for pending",
        example: "*",
      }),
      payee: nullToUndefined(z.string()),
      narration: nullToUndefined(z.string()),
      postings: z.array(postingSchema),
      tags: nullToUndefined(z.array(z.string())),
      links: nullToUndefined(z.array(z.string())),
      meta: nullToUndefined(z.record(z.string(), z.string())),
    }),
  }),
  z.strictObject({
    type: z.literal("open"),
    entry: z.strictObject({
      date: dateSchema,
      account: z.string(),
      currencies: z.array(z.string()),
    }),
  }),
  z.strictObject({
    type: z.literal("close"),
    entry: z.strictObject({ date: dateSchema, account: z.string() }),
  }),
  z.strictObject({
    type: z.literal("balance"),
    entry: z.strictObject({
      date: dateSchema,
      account: z.string(),
      amount: amountSchema,
    }),
  }),
  z.strictObject({
    type: z.literal("price"),
    entry: z.strictObject({
      date: dateSchema,
      currency: z.string(),
      amount: amountSchema,
    }),
  }),
  z.strictObject({
    type: z.literal("commodity"),
    entry: z.strictObject({ date: dateSchema, currency: z.string() }),
  }),
  z.strictObject({
    type: z.literal("note"),
    entry: z.strictObject({
      date: dateSchema,
      account: z.string(),
      content: z.string(),
    }),
  }),
  z.strictObject({
    type: z.literal("budget"),
    entry: z.strictObject({
      date: dateSchema,
      account: z.string(),
      interval: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
      amount: amountSchema,
    }),
  }),
  z.strictObject({
    type: z.literal("document"),
    entry: z.strictObject({
      date: dateSchema,
      account: z.string(),
      filename: z.string(),
      tags: nullToUndefined(z.array(z.string())),
      links: nullToUndefined(z.array(z.string())),
    }),
  }),
  z.strictObject({
    type: z.literal("event"),
    entry: z.strictObject({
      date: dateSchema,
      type: z.string(),
      description: z.string(),
    }),
  }),
]);

export const entriesBodySchema = z
  .strictObject({
    entries: z.array(entrySchema).openapi({
      description: "Directives to append, committed all-or-nothing",
    }),
    allowInvalid: nullToUndefined(z.boolean())
      .optional()
      .openapi({
        description:
          "Record unbalanced transactions deliberately instead of refusing them with UNBALANCED",
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
      "Appends one or more Beancount directives, routed to the right file by type and date and committed as a single commit. All-or-nothing: if any directive fails, none are written. A transaction whose residual is outside the ledger's tolerance is refused with UNBALANCED unless allowInvalid records it deliberately; one posting per transaction may omit its amount and is written elided.",
    params: ledgerPathSchema,
    body: entriesBodySchema,
    responses: {
      200: json(
        "The directives were committed",
        z.strictObject({
          success: z.boolean(),
          message: nullToUndefined(z.string()),
        }),
      ),
    },
    handler: async ({ layers }, { identity, params, body }) => {
      const result = await layers.services.ledgerEntry.addBulkEntries(
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
        body.allowInvalid ?? false,
      );
      // The service also reports which files the batch landed in for MCP's
      // write outcome; the v1 contract stays `{success, message}`.
      return { success: result.success, message: result.message };
    },
  }),
] as const;
