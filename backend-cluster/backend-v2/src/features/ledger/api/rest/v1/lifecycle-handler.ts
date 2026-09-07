import { z } from "@/shared/zod-openapi-setup";
import { LedgerTemplate } from "@/features/ledger/workflow/ledger-workflow.types";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { ledgerPathSchema, ledgerIdOf } from "./schemas";
const name = z
  .string()
  .max(100)
  .regex(/^[a-z0-9_-]+$/);
export const ledgerCreateInput = z
  .object({
    name,
    description: z.string().nullish(),
    private: z.boolean().nullish(),
    template: z.nativeEnum(LedgerTemplate).nullish(),
  })
  .strict();
export const ledgerUpdateInput = ledgerCreateInput
  .omit({ template: true })
  .extend({ name: name.nullish() })
  .strict();
export const ledgerDeleteInput = z.object({}).strict();
export const ledgerResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string(),
  sshUrl: z.string(),
  httpUrl: z.string(),
  empty: z.boolean(),
  private: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  size: z.number(),
  description: z.string().nullish(),
  permissions: z
    .object({ admin: z.boolean(), pull: z.boolean(), push: z.boolean() })
    .optional(),
  isStarred: z.boolean().optional(),
});
export const LEDGER_LIFECYCLE_ROUTES = [
  v1Route({
    method: "post",
    path: "/api-gateway/v1/ledgers",
    summary: "Create a ledger",
    description:
      "Create a ledger for the authenticated user under existing administrative account authority and tier limits. STARTER is the default template. This is an account operation even for a ledger-pinned credential.",
    body: ledgerCreateInput,
    responses: { 200: json("Created ledger", ledgerResultSchema) },
    handler: async ({ layers }, { identity, body }) =>
      layers.workflows.ledger.createLedger({ identity, input: body }),
  }),
  v1Route({
    method: "put",
    path: "/api-gateway/v1/ledgers/{owner}/{name}",
    summary: "Update a ledger",
    description:
      "Update ledger name, description, or visibility. Requires current administrative authority over the addressed ledger and respects the credential pin.",
    params: ledgerPathSchema,
    body: ledgerUpdateInput,
    responses: { 200: json("Updated ledger", ledgerResultSchema) },
    handler: async ({ layers }, { identity, params, body }) =>
      layers.workflows.ledger.updateLedger({
        identity,
        ledgerId: ledgerIdOf(params),
        input: body,
      }),
  }),
  v1Route({
    method: "delete",
    path: "/api-gateway/v1/ledgers/{owner}/{name}",
    summary: "Delete a ledger",
    description:
      "Delete the repository and perform the existing linked-bank cleanup. Requires current administrative authority and respects the credential pin. Applies immediately; no preview.",
    params: ledgerPathSchema,
    responses: {
      200: json(
        "Deleted ledger identifier",
        z.object({ ledgerId: z.string() }),
      ),
    },
    handler: async ({ layers }, { identity, params }) =>
      layers.workflows.ledger.deleteLedger({
        identity,
        ledgerId: ledgerIdOf(params),
      }),
  }),
];
