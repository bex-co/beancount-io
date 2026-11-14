import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import {
  ALLOW_INVALID_NAMES,
  DRY_RUN_NAMES,
  resolveFlagAlias,
} from "@/features/ledger/utils/flag-alias";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";
import { flattenValidation } from "@/features/ledger/utils/bean-check-errors";
import { COMMIT_SHA_DESCRIPTION } from "@/features/ledger/utils/commit-revert";
import { RENAME_ACCOUNT_DESCRIPTION } from "@/features/ledger/workflow/account-rename-workflow";
import { ledgerPathSchema, ledgerIdOf, writeVerdictShape } from "./schemas";

export { RENAME_ACCOUNT_DESCRIPTION };

export const renameAccountInput = z
  .object({
    from: z
      .string()
      .describe(
        "The account to rename; every account under it is renamed too.",
      ),
    to: z.string().describe("The new name; it must stay under the same root."),
    dryRun: z.boolean().optional().describe(PREVIEW_FLAG_DESCRIPTION),
    dry_run: z
      .boolean()
      .optional()
      .describe("Alias of dryRun, as MCP spells it."),
    allowInvalid: z
      .boolean()
      .optional()
      .describe(
        "Commit even when the rename adds bean-check errors the ledger did not have.",
      ),
    allow_invalid: z.boolean().optional().describe("Alias of allowInvalid."),
  })
  .strict();

export const renameAccountResult = z.object({
  message: z.string(),
  dryRun: z.boolean(),
  from: z.string(),
  to: z.string(),
  accounts: z
    .array(z.object({ from: z.string(), to: z.string() }))
    .describe("Accounts renamed, descendants included."),
  files: z
    .array(
      z.object({
        path: z.string(),
        changes: z.array(
          z.object({
            line: z.number().int(),
            before: z.string(),
            after: z.string(),
          }),
        ),
      }),
    )
    .describe(
      "Each loaded file the rename changes, with every line it rewrites.",
    ),
  bankMappings: z
    .array(
      z.object({
        plaidAccount: z
          .string()
          .nullable()
          .describe(
            "The caller's own bank account; null for another member's.",
          ),
        from: z.string(),
        to: z.string(),
        updated: z
          .boolean()
          .describe(
            "False on a preview, and when the update after the commit failed.",
          ),
      }),
    )
    .describe("Bank mappings moved."),
  commit: z.string().optional().describe(COMMIT_SHA_DESCRIPTION),
  ...writeVerdictShape,
});

export const renameAccountRoute = v1Route({
  method: "post",
  path: "/api-gateway/v1/ledgers/{owner}/{name}/rename-account",
  summary: "Rename an account",
  description: `${RENAME_ACCOUNT_DESCRIPTION} dryRun previews without committing: the changed lines and bank mappings.`,
  params: ledgerPathSchema,
  query: z.object({}).strict(),
  body: renameAccountInput,
  responses: { 200: json("Renamed account", renameAccountResult) },
  handler: ({ layers }, { identity, params, body }) =>
    layers.workflows.ledger
      .renameAccount({
        identity,
        ledgerId: ledgerIdOf(params),
        input: {
          from: body.from,
          to: body.to,
          dryRun: resolveFlagAlias(
            { primary: body.dry_run, legacy: body.dryRun },
            DRY_RUN_NAMES,
          ),
          allowInvalid: resolveFlagAlias(
            { primary: body.allow_invalid, legacy: body.allowInvalid },
            ALLOW_INVALID_NAMES,
          ),
        },
      })
      .then(({ validation, ...result }) => ({
        ...result,
        ...flattenValidation(validation),
      })),
});
