import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { ledgerPathSchema, ledgerIdOf } from "./schemas";

export const starResultSchema = z.object({
  success: z.boolean(),
  isStarred: z.boolean(),
  message: z.string().optional(),
});
export const STAR_ROUTES = (["put", "delete"] as const).map((method) =>
  v1Route({
    method,
    path: "/api-gateway/v1/ledgers/{owner}/{name}/star",
    summary: method === "put" ? "Star a ledger" : "Unstar a ledger",
    description:
      "Change the authenticated user's star. Requires write capability and current ledger readability; honors ledger pins. Upstream write failures return success:false and the existing isStarred/message result. No preview.",
    params: ledgerPathSchema,
    query: z.object({}).strict(),
    body: z.object({}).strict().default({}),
    responses: { 200: json("Star operation result", starResultSchema) },
    handler: async ({ layers }, { identity, params }) =>
      layers.workflows.ledger[method === "put" ? "starLedger" : "unstarLedger"](
        { identity, ledgerId: ledgerIdOf(params) },
      ),
  }),
);
