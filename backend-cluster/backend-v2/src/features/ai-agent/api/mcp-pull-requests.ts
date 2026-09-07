import { z } from "zod";
import { parseLedgerId } from "@/shared/str";
import {
  pullRequestCreateInput,
  pullRequestResultSchema,
} from "@/features/gitea/pull-request/api/pull-request-routes";
import {
  resolveMcpLedger,
  ledgerSelection,
  type McpRequestContext,
} from "./mcp-context";
import { mcpOutputSchema, toolOutputSchema } from "../tools/types";
export const pullRequestToolInput = z
  .object({
    operation: z.enum(["create", "approve", "reject"]),
    ledger: ledgerSelection,
    prNumber: z.number().int().optional(),
    title: z.string().optional(),
    description: z.string().nullish(),
    baseBranch: z.string().optional(),
    changes: pullRequestCreateInput.shape.changes.optional(),
  })
  .strict();
export const pullRequestToolOutput = mcpOutputSchema(
  toolOutputSchema(pullRequestResultSchema),
);
const reviewPayload = z.object({ prNumber: z.number().int() }).strict();
export async function executePullRequestTool(
  context: McpRequestContext,
  input: z.infer<typeof pullRequestToolInput>,
) {
  const { operation, ledger, ...payload } = pullRequestToolInput.parse(input);
  const { ledgerOwner: owner, ledgerName: name } = parseLedgerId(
    resolveMcpLedger(context, ledger),
  );
  const workflow = context.pullRequestWorkflow;
  const result =
    operation === "create"
      ? await workflow.createPullRequestFromPatch(
          {
            ledgerOwner: owner,
            ledgerName: name,
            ...pullRequestCreateInput.parse(payload),
          },
          context.identity,
        )
      : await workflow[
          operation === "approve" ? "approvePullRequest" : "rejectPullRequest"
        ](owner, name, reviewPayload.parse(payload).prNumber, context.identity);
  return result.success
    ? { ok: true, result }
    : {
        ok: false,
        error: result.message ?? "Pull request operation failed",
        result,
      };
}
