import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { resolveCommitMessage } from "@/features/ledger/utils/commit-message-alias";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";
import { ledgerPathSchema, ledgerIdOf } from "./schemas";

export const renameFileInput = z
  .object({
    oldPath: z.string(),
    newPath: z.string(),
    message: z.string().nullish(),
    description: z
      .string()
      .nullish()
      .describe("Alias of message, as the MCP file tools spell it."),
    updateIncludes: z.boolean().nullish(),
    dryRun: z
      .boolean()
      .optional()
      .describe(PREVIEW_FLAG_DESCRIPTION),
  })
  .strict();
const previewFile = z.object({ path: z.string(), text: z.string() });
export const renameFileResult = z.object({
  message: z.string(),
  dryRun: z.boolean(),
  oldPath: z.string(),
  newPath: z.string(),
  updatedIncludes: z.array(z.string()),
  preview: z
    .array(previewFile)
    .describe("Per-file rewritten include lines; populated on dry runs only."),
});
export const renameFileRoute = v1Route({
  method: "post",
  path: "/api-gateway/v1/ledgers/{owner}/{name}/rename-file",
  summary: "Rename a ledger file",
  description:
    "Move oldPath to newPath preserving content in one atomic commit (defaults to `Rename oldPath → newPath`). Refuses when oldPath is still `include`d unless updateIncludes rewrites those lines in the same commit. Both paths must be safe repository-relative paths. No client SHA is supported by this operation. `dryRun` previews without committing: same checks, the move plus rewritten include lines, no commit.",
  params: ledgerPathSchema,
  query: z.object({}).strict(),
  body: renameFileInput,
  responses: { 200: json("Renamed file paths", renameFileResult) },
  handler: ({ layers }, { identity, params, body }) =>
    layers.workflows.ledger.renameLedgerFile({
      identity,
      ledgerId: ledgerIdOf(params),
      input: {
        oldPath: body.oldPath,
        newPath: body.newPath,
        message: resolveCommitMessage(body, { required: false }),
        updateIncludes: body.updateIncludes ?? undefined,
        dryRun: body.dryRun,
      },
    }),
});
