import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import {
  DRY_RUN_NAMES,
  resolveFlagAlias,
} from "@/features/ledger/utils/flag-alias";
import {
  REVERT_MESSAGE_DESCRIPTION,
  REVERT_SHA_DESCRIPTION,
} from "@/features/ledger/utils/commit-revert";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";
import { flattenValidation } from "@/features/ledger/utils/bean-check-errors";
import { ledgerPathSchema, ledgerIdOf, writeVerdictShape } from "./schemas";

export const revertCommitInput = z
  .object({
    sha: z.string().describe(REVERT_SHA_DESCRIPTION),
    message: z.string().nullish().describe(REVERT_MESSAGE_DESCRIPTION),
    dryRun: z.boolean().optional().describe(PREVIEW_FLAG_DESCRIPTION),
    // Twin: MCP spells it `dry_run`.
    dry_run: z
      .boolean()
      .optional()
      .describe("Alias of dryRun, as MCP spells it."),
  })
  .strict();

export const revertCommitResult = z.object({
  sha: z.string().describe("The full sha of the commit the revert undoes."),
  subject: z.string().describe("The first line of that commit's message."),
  message: z.string().describe("The revert's own commit message."),
  files: z
    .array(
      z.object({
        path: z.string(),
        change: z
          .enum(["created", "updated", "deleted"])
          .describe("What the revert does to the file."),
      }),
    )
    .describe("Each file the commit touched, and what the revert does to it."),
  dryRun: z.boolean(),
  commit: z
    .string()
    .optional()
    .describe(
      "The sha of the revert commit; absent on a preview, and when another commit landed in between.",
    ),
  ...writeVerdictShape,
});

export const revertCommitRoute = v1Route({
  method: "post",
  path: "/api-gateway/v1/ledgers/{owner}/{name}/revert-commit",
  summary: "Revert a commit",
  description:
    "Undo one commit as a new commit: each file it touched is set back to its parent's contents in one atomic commit on the default branch. Refused with CONFLICT when a later commit changed any of those files, so a revert never discards newer work. A merge or root commit cannot be reverted. dryRun previews the files and writes nothing.",
  params: ledgerPathSchema,
  query: z.object({}).strict(),
  body: revertCommitInput,
  responses: { 200: json("The commit reverted", revertCommitResult) },
  handler: ({ layers }, { identity, params, body }) =>
    layers.workflows.ledger
      .revertLedgerCommit({
        identity,
        ledgerId: ledgerIdOf(params),
        input: {
          sha: body.sha,
          message: body.message ?? undefined,
          dryRun: resolveFlagAlias(
            { primary: body.dry_run, legacy: body.dryRun },
            DRY_RUN_NAMES,
          ),
        },
      })
      .then(({ validation, ...result }) => ({
        ...result,
        ...flattenValidation(validation),
      })),
});
