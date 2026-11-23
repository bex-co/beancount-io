import { z } from "zod";
import { parseLedgerId } from "@/shared/str";
import { ErrorCategory } from "@/shared/errors";
import {
  pullRequestCreateInput,
  pullRequestResultSchema,
} from "@/features/gitea/pull-request/api/pull-request-routes";
import type { PullRequestResult } from "@/features/gitea/pull-request/workflow/pull-request-workflow";
import {
  resolveMcpLedger,
  ledgerSelection,
  type McpRequestContext,
} from "./mcp-context";
import { mcpOutputSchema, toolOutputSchema } from "../tools/types";
/** One MCP tool per pull-request operation (ADR 019, 2026-10-18; w1/m38). */
const reviewInput = z
  .object({
    ledger: ledgerSelection,
    prNumber: z
      .number()
      .int()
      .positive()
      .describe("The pull request's number."),
  })
  .strict();
export const PULL_REQUEST_OPERATION_SCHEMAS = {
  create: pullRequestCreateInput.extend({ ledger: ledgerSelection }),
  approve: reviewInput,
  reject: reviewInput,
} as const;
export const pullRequestToolOutput = mcpOutputSchema(
  toolOutputSchema(pullRequestResultSchema),
);

function repository(context: McpRequestContext, ledger: string | undefined) {
  const { ledgerOwner, ledgerName } = parseLedgerId(
    resolveMcpLedger(context, ledger),
  );
  return { ledgerOwner, ledgerName };
}

function toToolResult(result: PullRequestResult) {
  return result.success
    ? { ok: true, result }
    : {
        ok: false,
        error: result.message ?? "Pull request operation failed",
        // The repository's refusal — already merged, a conflict, a write Gitea
        // refused — is the result REST and GraphQL return as success:false.
        // Coded, so the production mask for unexpected errors keeps it.
        errorCode: ErrorCategory.OPERATION_NOT_ALLOWED,
        result,
      };
}

const review =
  (method: "approvePullRequest" | "rejectPullRequest") =>
  async (context: McpRequestContext, input: unknown) => {
    const { ledger, prNumber } = reviewInput.parse(input);
    const { ledgerOwner, ledgerName } = repository(context, ledger);
    return toToolResult(
      await context.pullRequestWorkflow[method](
        ledgerOwner,
        ledgerName,
        prNumber,
        context.identity,
      ),
    );
  };

/** Each tool's handler, parsing the schema that tool publishes. */
export const PULL_REQUEST_EXECUTORS = {
  create: async (context: McpRequestContext, input: unknown) => {
    const { ledger, ...payload } =
      PULL_REQUEST_OPERATION_SCHEMAS.create.parse(input);
    return toToolResult(
      await context.pullRequestWorkflow.createPullRequestFromPatch(
        { ...repository(context, ledger), ...payload },
        context.identity,
      ),
    );
  },
  approve: review("approvePullRequest"),
  reject: review("rejectPullRequest"),
};
